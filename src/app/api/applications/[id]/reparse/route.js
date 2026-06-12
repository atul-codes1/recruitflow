import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { getApplicationById, updateApplication } from '@/lib/db';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { downloadFromGoogleDrive } from '@/lib/gdrive';

export async function POST(request, { params }) {
  try {
    const awaitedParams = await params;
    const appId = awaitedParams.id;
    const application = await getApplicationById(appId);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!application.drive_file_id && !application.local_path) {
       return NextResponse.json({ error: 'No PDF found in Google Drive or Local Storage to reparse' }, { status: 400 });
    }

    // Mark as queued again
    await updateApplication(application.id, {
       ai_status: 'uploading'
    });

    after(async () => {
      try {
        console.log(`[Reparse] Started background AI processing for ${application.id}`);
        
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

        // 1. Text Extraction
        if (ext === 'pdf') {
          const pdfData = await pdfParse(buffer);
          text = pdfData.text;
        } else if (ext === 'docx') {
          const docxData = await mammoth.extractRawText({ buffer });
          text = docxData.value;
        }

        // 2. OCR Fallback
        if (text.trim().length < 50 && ext === 'pdf') {
           console.log(`[Reparse] Text is too short. Falling back to Gemini OCR...`);
           const mimeType = 'application/pdf';
           text = await performOcrWithGemini(buffer, mimeType);
           extractedFromOcr = true;
        }

        if (!text || text.trim().length < 20) {
           throw new Error('Could not extract any meaningful text from the resume.');
        }

        // 3. AI Parsing
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

        // 4. Vector Embedding
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
           console.error('[Reparse] Embedding generation error:', e.message);
        }

        // 5. Update Database
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
        console.error('[Reparse] Fatal error:', err);
        await updateApplication(application.id, { ai_status: 'failed', notes: err.message });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reparse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
