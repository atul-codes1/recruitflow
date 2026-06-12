/**
 * ============================================================================
 * INGESTION LAYER (FILE UPLOAD & QUEUE PUBLISHING)
 * ============================================================================
 * 
 * This endpoint uses the "Infinite Scale" pattern via Upstash QStash.
 * 
 * 1. Receive the file from the browser.
 * 2. Upload the raw file to Google Drive.
 * 3. Create a placeholder record in the Supabase Database (`ai_status: 'queued'`).
 * 4. Publish a message to Upstash QStash.
 * 5. Instantly return a success response to the user.
 * 
 * The heavy AI lifting is offloaded to `api/worker/process-resume`.
 */

import { NextResponse } from 'next/server';
import { getJobBySlug, createApplication, updateApplication } from '@/lib/db';
import { uploadToGoogleDrive } from '@/lib/gdrive';
import { Client } from "@upstash/qstash";

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

    // STEP 2: Fast Database Insert (Mark as Queued)
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
      ai_status: 'queued', // Tell the dashboard it's waiting in line
    });

    // STEP 3: Push to Upstash Queue
    try {
      const qstashToken = process.env.QSTASH_TOKEN;
      if (!qstashToken) {
        console.warn('[Apply] QSTASH_TOKEN not found! Queue push failed. You must configure Upstash.');
        await updateApplication(application.id, { ai_status: 'failed', notes: 'Upstash QStash is not configured. Missing QSTASH_TOKEN.' });
      } else {
        const qstash = new Client({ token: qstashToken });
        
        // Determine the absolute URL of the worker perfectly for Vercel
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = request.headers.get('host');
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');
        
        await qstash.publishJSON({
          url: `${baseUrl}/api/worker/process-resume`,
          body: {
            applicationId: application.id,
            drive_file_id: uploadResult.drive_file_id || '',
            local_path: uploadResult.local_path || '',
            fileName,
            jobSlug,
            ext,
          },
        });
        console.log(`[Apply] Successfully pushed Application ${application.id} to QStash at ${baseUrl}.`);
      }
    } catch (qErr) {
      console.error('[Apply] Failed to push to QStash:', qErr);
      await updateApplication(application.id, { ai_status: 'failed', notes: 'Failed to connect to QStash API.' });
    }

    // STEP 4: RESPOND TO THE USER IMMEDIATELY
    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
