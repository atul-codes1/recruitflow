import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateApplication } from '@/lib/db';
import { downloadFromGoogleDrive } from '@/lib/gdrive';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

// Force this route to be evaluated dynamically so it runs the cron logic fresh every time
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow it to run for up to 5 minutes on Vercel Pro if deployed

export async function GET(request) {
  try {
    // 1. Fetch up to 5 queued resumes
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('ai_status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('[Queue] Error fetching from database:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty' });
    }

    console.log(`[Queue] Found ${applications.length} queued resumes to process.`);

    for (const app of applications) {
      console.log(`[Queue] Processing application ${app.id} (${app.resume_filename})`);

      try {
        let buffer = null;

        // 2. Retrieve the file buffer
        if (app.drive_file_id) {
          buffer = await downloadFromGoogleDrive(app.drive_file_id);
        } else if (app.local_path) {
          // Fallback to local storage
          const localFilePath = path.join(process.cwd(), app.local_path);
          if (fs.existsSync(localFilePath)) {
            buffer = fs.readFileSync(localFilePath);
          } else {
            throw new Error('Local file not found');
          }
        }

        if (!buffer) {
          throw new Error('Could not retrieve file buffer from Drive or Local Storage');
        }

        const ext = (app.resume_filename.split('.').pop() || 'pdf').toLowerCase();
        const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        let text = '';
        
        // 3. Local Text Extraction (Zero API Limits)
        if (ext === 'pdf') {
          const pdfData = await pdfParse(buffer);
          text = pdfData.text || '';
        } else if (ext === 'docx' || ext === 'doc') {
          const docxData = await mammoth.extractRawText({ buffer });
          text = docxData.value || '';
        }

        // 4. Multimodal Fallback for Scanned Resumes (Throttled Gemini)
        if (text.trim().length < 50) {
          console.log(`[Queue] Detected Scanned Document. Routing to Gemini Vision OCR...`);
          text = await performOcrWithGemini(buffer, mimeType);
        }

        console.log(`[Queue] Extracted ${text.length} characters.`);

        // 5. Multiplexer Text-to-JSON Parsing (Groq -> Gemini -> Regex)
        let parsedData = await parseTextWithAi(text);

        if (parsedData) {
          parsedData.parse_method = 'ai_multiplexer';
        } else {
          // Complete fallback to regex if AI completely fails
          parsedData = extractWithRegex(text);
          parsedData.parse_method = 'regex';
          console.warn(`[Queue] AI Multiplexer failed. Fell back to regex for ${app.id}`);
        }
        
        parsedData.parsed_at = new Date().toISOString();
        
        // 6. Update the Database Record
        await updateApplication(app.id, {
          candidate_name: parsedData?.candidate?.name || 'Unknown Candidate',
          candidate_email: parsedData?.candidate?.contact?.email || '',
          candidate_phone: parsedData?.candidate?.contact?.phone || '',
          experience_years: parsedData?.professional_narrative?.years_of_experience_calculated || null,
          skills: [
            ...(parsedData?.competencies?.hard_skills || []),
            ...(parsedData?.competencies?.soft_skills || []),
            ...(parsedData?.competencies?.domain_expertise || []),
            ...(parsedData?.competencies?.languages_spoken || [])
          ],
          parsed_data: parsedData,
          parsed_data: parsedData,
          raw_text: text,
          ai_status: 'completed' // Mark AI as done!
        });

        console.log(`[Queue] Successfully parsed and saved ${app.id}`);

      } catch (err) {
        console.error(`[Queue] Error processing application ${app.id}:`, err);
        // We leave ai_status as 'queued' so it retries, 
        // OR if it's a fatal corrupt file, we mark it as failed.
        if (err.message.includes('corrupt') || err.message.includes('not found')) {
          await updateApplication(app.id, { ai_status: 'failed', candidate_name: 'Corrupt File Error' });
        }
      }
    }

    return NextResponse.json({ success: true, processed: applications.length });

  } catch (error) {
    console.error('[Queue] Fatal Cron Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
