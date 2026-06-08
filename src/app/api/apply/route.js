import { NextResponse, after } from 'next/server';
import { getJobBySlug, createApplication, updateApplication } from '@/lib/db';
import { uploadToGoogleDrive } from '@/lib/gdrive';
import { parseResume } from '@/lib/parser';
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

    // Convert File to Buffer (must happen before response — can't read body after)
    const arrayBuffer = await resume.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a safe filename
    const ext = resume.name.split('.').pop() || 'pdf';
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `resume-${randomId}-${Date.now()}.${ext}`;

    // ======================================================
    // STEP 1: Create a SKELETON record instantly (< 1 second)
    // ======================================================
    const application = await createApplication({
      job_id: job.id,
      candidate_name: 'Processing...',
      candidate_email: '',
      candidate_phone: '',
      resume_filename: fileName,
      drive_file_id: '',
      drive_web_url: '',
      local_path: '',
      experience_level: experienceLevel,
      experience_years: null,
      skills: [],
      parsed_data: null,
      status: 'unreviewed',
    });

    // ======================================================
    // STEP 2: Schedule the heavy work to run AFTER the response
    //         using Next.js after() — this keeps the runtime alive
    // ======================================================
    after(async () => {
      try {
        let mimeType = 'application/pdf';
        if (ext.toLowerCase() === 'png') mimeType = 'image/png';
        if (ext.toLowerCase() === 'jpg' || ext.toLowerCase() === 'jpeg') mimeType = 'image/jpeg';

        // Run Google Drive upload and AI parsing in parallel
        const uploadPromise = uploadToGoogleDrive(buffer, fileName, jobSlug);

        const parsePromise = (async () => {
          try {
            let text = '';
            if (ext.toLowerCase() === 'pdf') {
              const pdfData = await pdfParse(buffer);
              text = pdfData.text;
            } else if (ext.toLowerCase() === 'docx') {
              const docxData = await mammoth.extractRawText({ buffer });
              text = docxData.value;
            }
            console.log(`[Parser] Extracted ${text.length} characters from ${ext} file.`);
            return await parseResume(text, buffer, mimeType);
          } catch (err) {
            console.error('[Background] Document parsing error:', err);
            return null;
          }
        })();

        const [uploadResult, parsedData] = await Promise.all([uploadPromise, parsePromise]);

        // Enrich the skeleton record with the full AI-parsed data
        await updateApplication(application.id, {
          candidate_name: parsedData?.full_name || 'Unknown Candidate',
          candidate_email: parsedData?.email || '',
          candidate_phone: parsedData?.phone || '',
          drive_file_id: uploadResult?.drive_file_id || '',
          drive_web_url: uploadResult?.drive_web_url || '',
          local_path: uploadResult?.local_path || '',
          experience_years: parsedData?.experience_years || null,
          skills: parsedData?.skills || [],
          parsed_data: parsedData || null,
        });

        console.log(`[Background] Application ${application.id} fully processed.`);
      } catch (err) {
        console.error('[Background] Failed to process application:', err);
      }
    });

    // ======================================================
    // STEP 3: RESPOND TO THE USER IMMEDIATELY
    // ======================================================
    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
