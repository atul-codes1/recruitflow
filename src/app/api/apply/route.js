/**
 * ============================================================================
 * SYNCHRONOUS INGESTION LAYER (FILE UPLOAD & BACKGROUND PARSING)
 * ============================================================================
 * 
 * Reverting back to Next.js `after()` architecture.
 * This runs the AI parsing in the background of the SAME serverless invocation,
 * allowing us to use local memory/disk fallbacks perfectly without Upstash QStash.
 */

import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { getJobBySlug, createApplication, updateApplication } from '@/lib/db';
import { uploadToGoogleDrive } from '@/lib/gdrive';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const resume = formData.get('resume');
    const jobSlug = formData.get('job_slug');
    const experienceLevel = formData.get('experience_level') || '';

    if (!resume || !jobSlug) {
      return NextResponse.json({ error: 'Missing resume or job slug' }, { status: 400 });
    }

    const job = await getJobBySlug(jobSlug);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Convert File to Buffer
    const arrayBuffer = await resume.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file type
    const ext = (resume.name.split('.').pop() || 'pdf').toLowerCase();
    const allowedExts = ['pdf', 'docx'];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and DOCX files are allowed.' }, { status: 400 });
    }

    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `resume-${randomId}-${Date.now()}.${ext}`;

    // STEP 1: Upload directly to Google Drive (Synchronous)
    console.log(`[Apply] Uploading ${fileName} to Google Drive (or local fallback)...`);
    const uploadResult = await uploadToGoogleDrive(buffer, fileName, jobSlug);
    
    if (!uploadResult || !uploadResult.success) {
       return NextResponse.json({ error: 'Failed to safely upload resume. Please try again.' }, { status: 500 });
    }

    // STEP 2: Fast Database Insert (Mark as Processing)
    const application = await createApplication({
      job_id: job.id,
      candidate_name: 'Processing Resume...',
      candidate_email: '',
      candidate_phone: '',
      resume_filename: fileName,
      drive_file_id: uploadResult.drive_file_id || '',
      drive_web_url: uploadResult.drive_web_url || '',
      local_path: uploadResult.local_path || '',
      experience_level: experienceLevel,
      experience_years: null,
      skills: [],
      parsed_data: null,
      status: 'unreviewed', 
      ai_status: 'uploading', // Processing in the background
    });

    // STEP 3: Process the AI synchronously in the background (using Next.js after())
    after(async () => {
      try {
        console.log(`[Background] Started background AI processing for ${application.id}`);
        
        let text = '';
        let extractedFromOcr = false;

        // 1. Text Extraction
        console.log(`[Background] Extracting text from ${ext}...`);
        if (ext === 'pdf') {
          const pdfData = await pdfParse(buffer);
          text = pdfData.text;
        } else if (ext === 'docx') {
          const docxData = await mammoth.extractRawText({ buffer });
          text = docxData.value;
        }

        // 2. OCR Fallback (if PDF is image-based)
        if (text.trim().length < 50 && ext === 'pdf') {
           console.log(`[Background] Text is too short (${text.length} chars). Falling back to Gemini OCR...`);
           const mimeType = 'application/pdf';
           text = await performOcrWithGemini(buffer, mimeType);
           extractedFromOcr = true;
        }

        if (!text || text.trim().length < 20) {
           throw new Error('Could not extract any meaningful text from the resume.');
        }

        // 3. AI Parsing (JSON Extraction)
        console.log(`[Background] Extracted ${text.length} characters. Running Groq/Gemini JSON Parser...`);
        let parsedData = null;
        let skillsArr = [];
        try {
           parsedData = await parseTextWithAi(text);
           if (parsedData?.professional_narrative?.skills_assessed) {
              skillsArr = parsedData.professional_narrative.skills_assessed.map(s => typeof s === 'string' ? s : s.skill).filter(Boolean);
           }
        } catch(e) {
           console.log(`[Background] AI Parsing failed. Attempting regex fallback...`);
           parsedData = extractWithRegex(text);
        }

        // 4. Vector Embedding (Semantic Search)
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
           console.error('[Background] Embedding generation error:', e.message);
        }

        // 5. Update Database
        console.log(`[Background] AI processing complete. Updating database...`);
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
        console.error('[Background] Fatal error:', err);
        await updateApplication(application.id, { ai_status: 'failed', notes: err.message });
      }
    });

    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
