import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateApplication } from '@/lib/db';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { downloadFromGoogleDrive } from '@/lib/gdrive';

export async function POST(request) {
  try {
    // 1. Find all stuck applications
    const { data: stuckApps, error } = await supabase
      .from('applications')
      .select('*')
      .in('ai_status', ['queued', 'failed', 'uploading'])
      .limit(5);

    if (error) throw error;

    if (!stuckApps || stuckApps.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    // 2. Mark them all as 'uploading' instantly so they don't get double-processed
    for (const app of stuckApps) {
      await updateApplication(app.id, { ai_status: 'uploading' });
    }

    // 3. Process them sequentially in the background
    after(async () => {
      for (const application of stuckApps) {
        try {
          console.log(`[Batch Processor] Started processing for ${application.id}`);
          
          if (!application.drive_file_id && !application.local_path) {
             throw new Error('No PDF found in Google Drive or Local Storage to parse.');
          }

          const ext = application.resume_filename.split('.').pop() || 'pdf';
          let buffer;

          if (application.drive_file_id) {
             buffer = await downloadFromGoogleDrive(application.drive_file_id);
          } else if (application.local_path) {
             const fs = require('fs');
             const path = require('path');
             const fullPath = path.join(process.cwd(), application.local_path);
             if (fs.existsSync(fullPath)) {
               buffer = fs.readFileSync(fullPath);
             } else {
               throw new Error('Local file not found on disk.');
             }
          }

          let text = '';
          let extractedFromOcr = false;

          // Text Extraction
          if (ext === 'pdf') {
            const pdfData = await pdfParse(buffer);
            text = pdfData.text;
          } else if (ext === 'docx') {
            const docxData = await mammoth.extractRawText({ buffer });
            text = docxData.value;
          }

          // OCR Fallback
          if (text.trim().length < 50 && ext === 'pdf') {
             console.log(`[Batch Processor] Text too short. Falling back to Gemini OCR...`);
             const mimeType = 'application/pdf';
             text = await performOcrWithGemini(buffer, mimeType);
             extractedFromOcr = true;
          }

          if (!text || text.trim().length < 20) {
             throw new Error('Could not extract any meaningful text from the resume.');
          }

          // AI Parsing
          let parsedData = null;
          let skillsArr = [];
          try {
             parsedData = await parseTextWithAi(text);
             if (parsedData?.professional_narrative?.skills_assessed) {
                skillsArr = parsedData.professional_narrative.skills_assessed.map(s => typeof s === 'string' ? s : s.skill).filter(Boolean);
             }
          } catch(e) {
             parsedData = extractWithRegex(text);
          }

          // Vector Embedding
          let embedding = null;
          try {
             const embeddingText = `${parsedData?.candidate?.name || ''} ${parsedData?.professional_narrative?.summary || ''} ${skillsArr.join(' ')}`;
             if (embeddingText.trim().length > 10) {
                const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
                if (GOOGLE_API_KEY) {
                  const embRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      model: 'models/text-embedding-004',
                      content: { parts: [{ text: embeddingText }] }
                    })
                  });
                  if (embRes.ok) {
                    const embData = await embRes.json();
                    embedding = embData.embedding?.values || null;
                  }
                }
             }
          } catch(e) {
             console.error('[Batch Processor] Embedding generation error:', e.message);
          }

          // Update Database
          await updateApplication(application.id, {
            candidate_name: parsedData?.candidate?.name || 'Unknown Candidate',
            candidate_email: parsedData?.candidate?.contact?.email || '',
            candidate_phone: parsedData?.candidate?.contact?.phone || '',
            experience_years: parsedData?.professional_narrative?.years_of_experience_calculated || null,
            skills: skillsArr,
            parsed_data: parsedData,
            raw_text: text,
            ai_status: 'completed',
            ...(embedding ? { embedding } : {})
          });

        } catch (err) {
          console.error(`[Batch Processor] Fatal error for ${application.id}:`, err);
          await updateApplication(application.id, { ai_status: 'failed', notes: err.message });
        }
      }
    });

    return NextResponse.json({ success: true, processed: stuckApps.length });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
