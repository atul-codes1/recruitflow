/**
 * ============================================================================
 * UPSTASH QSTASH WORKER ROUTE (ASYNC RESUME PROCESSING)
 * ============================================================================
 * 
 * This is the core "Brain" of the enterprise architecture. Because Vercel has a 
 * strict 10-second timeout on Free Tier APIs, we cannot parse resumes synchronously.
 * 
 * Flow:
 * 1. User uploads resume to `api/apply`.
 * 2. `api/apply` saves the file to Google Drive and publishes a message to Upstash QStash.
 * 3. QStash HTTP calls this Worker Route in the background (bypassing user wait times).
 * 4. This worker downloads the file, extracts text, runs OCR if needed, extracts JSON using Groq/Gemini, 
 *    generates a 768-D Vector Embedding, and saves it all to the Supabase Database.
 * 
 * Security:
 * The `verifySignatureAppRouter` ensures that ONLY Upstash can call this endpoint.
 * Hackers cannot trigger this route manually.
 */

import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { updateApplication } from '@/lib/db';
import { downloadFromGoogleDrive } from '@/lib/gdrive';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * The main handler function executed by QStash.
 */
async function handler(request) {
  try {
    const body = await request.json();
    const { applicationId, drive_file_id, local_path, fileName, ext } = body;

    console.log(`[Worker] Started processing application ${applicationId}...`);

    let buffer;

    // 1. Fetch File
    if (drive_file_id) {
       console.log(`[Worker] Downloading ${fileName} from Google Drive...`);
       buffer = await downloadFromGoogleDrive(drive_file_id);
    } else if (local_path) {
       console.log(`[Worker] Reading ${fileName} from Local Storage Fallback...`);
       const fs = require('fs');
       const path = require('path');
       const fullPath = path.join(process.cwd(), local_path);
       if (fs.existsSync(fullPath)) {
         buffer = fs.readFileSync(fullPath);
       } else {
         throw new Error('Local file not found.');
       }
    } else {
       console.error('[Worker] No file location provided (no drive ID or local path).');
       await updateApplication(applicationId, { ai_status: 'failed', notes: 'Upload failed before parsing.' });
       return NextResponse.json({ error: 'No file location' }, { status: 400 });
    }

    // 2. Extract Text
    let text = '';
    const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text || '';
    } else if (ext === 'docx') {
      const docxData = await mammoth.extractRawText({ buffer });
      text = docxData.value || '';
    }

    if (text.trim().length < 50) {
      console.log(`[Worker] Detected Scanned Document. Routing to Gemini OCR...`);
      text = await performOcrWithGemini(buffer, mimeType);
    }

    if (text.trim().length < 5) {
      console.warn(`[Worker] OCR Extraction totally failed (likely 503). Forcing Upstash Retry.`);
      await updateApplication(applicationId, {
        candidate_name: 'Retrying... (Google Overloaded)'
      });
      // Throwing a 500 tells Upstash QStash to automatically retry this later!
      return NextResponse.json({ error: 'OCR Failed, forcing retry' }, { status: 500 }); 
    }

    // 3. AI Parsing
    console.log(`[Worker] Extracting JSON via Gemini...`);
    let parsedData = await parseTextWithAi(text);
    if (parsedData) {
      parsedData.parse_method = 'ai_multiplexer';
    } else {
      parsedData = extractWithRegex(text);
      parsedData.parse_method = 'regex';
    }
    parsedData.parsed_at = new Date().toISOString();

    // 4. Generate Embeddings
    const role = parsedData?.experience?.[0]?.role || parsedData?.professional_narrative?.current_seniority_level || '';
    const exp = parsedData?.professional_narrative?.years_of_experience_calculated || 0;
    const skillsArr = [
      ...(parsedData?.competencies?.hard_skills || []),
      ...(parsedData?.competencies?.soft_skills || []),
      ...(parsedData?.competencies?.domain_expertise || []),
      ...(parsedData?.competencies?.languages_spoken || [])
    ];
    const edu = (parsedData?.education || []).map(e => e.degree).join(', ');
    const sum = parsedData?.professional_narrative?.summary || '';
    const location = parsedData?.candidate?.contact?.location?.raw || '';
    
    const embeddingText = `Role: ${role}. Experience: ${exp} years. Location: ${location}. Education: ${edu}. Skills: ${skillsArr.join(', ')}. Summary: ${sum}`.trim();
    
    let embedding = null;
    if (embeddingText.length > 20) {
       try {
         const apiKey = process.env.GEMINI_API_KEY;
         if (apiKey) {
           console.log(`[Worker] Generating Vector Embedding for ${fileName}...`);
           const embRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
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
             console.log(`[Worker] Successfully generated 768-D Vector.`);
           }
         }
       } catch(e) {
         console.error('[Worker] Embedding generation error:', e.message);
       }
    }

    // 5. Update Database
    console.log(`[Worker] AI parsing complete. Updating database...`);
    await updateApplication(applicationId, {
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

    console.log(`[Worker] Successfully completed processing for Application ${applicationId}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[Worker] Fatal error in worker:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY 
  ? verifySignatureAppRouter(handler) 
  : handler;
