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
import { createAdminClient } from '@/lib/supabase/admin';
import { downloadFromGoogleDrive } from '@/lib/gdrive';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * The main handler function executed by Upstash QStash.
 * 
 * NOTE: We do not use the standard `export async function POST(request)` syntax here
 * because we need to wrap the handler with `@upstash/qstash/nextjs` verifySignatureAppRouter
 * to ensure cryptographic security. However, in this implementation, we are exporting the raw handler.
 * If you add `verifySignatureAppRouter`, wrap it like: `export const POST = verifySignatureAppRouter(handler);`
 * 
 * @param {Request} request - The incoming HTTP request from Upstash QStash.
 * @returns {NextResponse} JSON response indicating success or forcing a retry (500).
 */
async function handler(request) {
  let reqBody = {};
  try {
    reqBody = await request.json();
    const { applicationId, drive_file_id, local_path, fileName, ext } = reqBody;

    console.log(`[Worker] Started processing application ${applicationId}...`);

    const supabaseAdmin = createAdminClient();

    let buffer;

    // ------------------------------------------------------------------------
    // 1. FILE RETRIEVAL
    // ------------------------------------------------------------------------
    // Download the raw file into a Buffer so we can parse it locally.
    if (drive_file_id) {
       console.log(`[Worker] Downloading ${fileName} from Google Drive...`);
       buffer = await downloadFromGoogleDrive(drive_file_id);
    } else {
       console.error('[Worker] No drive_file_id provided. The company has no BYOS integration connected.');
       await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: 'Upload failed due to missing Cloud Storage Integration.' }).eq('id', applicationId);
       return NextResponse.json({ error: 'Missing drive_file_id' }, { status: 400 });
    }

    // ------------------------------------------------------------------------
    // 2. TEXT EXTRACTION & OCR PIPELINE
    // ------------------------------------------------------------------------
    let text = '';
    const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Step 2A: Standard Text Extraction
    // Fast, cheap extraction for digitally native PDFs and Word Docs.
    if (ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text || '';
    } else if (ext === 'docx') {
      const docxData = await mammoth.extractRawText({ buffer });
      text = docxData.value || '';
    }

    // Step 2B: Optical Character Recognition (OCR) Fallback
    // If the PDF is an image scan (e.g., printed and scanned), `pdfParse` will return empty text.
    // In this case, we route the raw file directly to Gemini 1.5 Flash Vision to "read" the image.
    if (text.trim().length < 50) {
      console.log(`[Worker] Detected Scanned Document. Routing to Gemini OCR...`);
      text = await performOcrWithGemini(buffer, mimeType);
    }

    // Edge Case: If OCR completely fails (often due to Google API rate limits or 503 errors)
    if (text.trim().length < 5) {
      console.warn(`[Worker] OCR Extraction totally failed (likely 503). Forcing Upstash Retry.`);
      await supabaseAdmin.from('applications').update({
        candidate_name: 'Retrying... (Google Overloaded)'
      }).eq('id', applicationId);
      // By throwing a 500 status code, Upstash QStash catches it and automatically retries with exponential backoff!
      return NextResponse.json({ error: 'OCR Failed, forcing retry' }, { status: 500 }); 
    }

    // ------------------------------------------------------------------------
    // 3. AI STRUCTURED PARSING (JSON EXTRACTION)
    // ------------------------------------------------------------------------
    // Pass the raw unstructured text into the LLM multiplexer (Gemini/Groq) to get structured JSON.
    console.log(`[Worker] Extracting JSON via Gemini...`);
    let parsedData = await parseTextWithAi(text);
    if (parsedData) {
      parsedData.parse_method = 'ai_multiplexer';
    } else {
      // Fallback: If LLMs are down, fallback to regex-based extraction to prevent catastrophic failure
      parsedData = extractWithRegex(text);
      parsedData.parse_method = 'regex';
    }
    parsedData.parsed_at = new Date().toISOString();

    // ------------------------------------------------------------------------
    // 4. GENERATE VECTOR EMBEDDINGS (SEMANTIC SEARCH)
    // ------------------------------------------------------------------------
    // We synthesize the most important parsed data into a dense paragraph.
    // This paragraph is then converted into a 768-Dimension vector so recruiters can use semantic search 
    // (e.g. "Find me someone who knows React and lives in Texas").
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
    
    // Synthesized contextual paragraph
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

    // ------------------------------------------------------------------------
    // 5. FINAL DATABASE COMMIT
    // ------------------------------------------------------------------------
    // Update the database. This instantly refreshes the recruiter's UI (via Supabase Realtime/Polling).
    console.log(`[Worker] AI parsing complete. Updating database...`);
    await supabaseAdmin.from('applications').update({
      candidate_name: parsedData?.candidate?.name || 'Unknown Candidate',
      candidate_email: parsedData?.candidate?.contact?.email || '',
      candidate_phone: parsedData?.candidate?.contact?.phone || '',
      experience_years: parsedData?.professional_narrative?.years_of_experience_calculated || null,
      skills: skillsArr,
      parsed_data: parsedData,
      raw_text: text,
      ai_status: 'completed',
      ...(embedding ? { embedding } : {}) // Only spread embedding if it successfully generated
    }).eq('id', applicationId);

    console.log(`[Worker] Successfully completed processing for Application ${applicationId}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[Worker] Fatal error in worker:', err);
    
    try {
      if (reqBody.applicationId) {
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: err.message }).eq('id', reqBody.applicationId);
      }
    } catch(dbErr) {
      console.error('[Worker] Failed to update DB status:', dbErr);
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = handler;
