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

    // STEP 3: Enterprise Background Processing (Hybrid)
    if (process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN) {
      // LOCAL DEVELOPMENT (or no QStash Token): Process synchronously in background
      // Upstash cloud cannot reach your local localhost:3000, so we use after() locally.
      console.log('[Apply] Running in Local Dev (or missing QStash). Using synchronous Next.js after() to process.');
      const { after } = require('next/server');
      after(async () => {
        try {
          const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/worker/process-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId: application.id,
              drive_file_id: uploadResult.drive_file_id || '',
              local_path: uploadResult.local_path || '',
              fileName,
              jobSlug,
              ext,
            })
          });
          if (!res.ok) throw new Error('Worker returned ' + res.status);
        } catch (e) {
          console.error('[Apply] Local after() processing failed:', e);
          await updateApplication(application.id, { ai_status: 'failed', notes: e.message });
        }
      });
    } else {
      // PRODUCTION ENTERPRISE: Push to Upstash Queue
      try {
        const qstash = new Client({ token: process.env.QSTASH_TOKEN });
        
        const protocol = 'https';
        const host = request.headers.get('host');
        let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl || baseUrl.includes('localhost')) {
            baseUrl = host ? `${protocol}://${host}` : 'https://recruitflow-nexion.vercel.app';
        }
        
        let cleanBaseUrl = baseUrl;
        if (cleanBaseUrl.endsWith('/')) {
            cleanBaseUrl = cleanBaseUrl.slice(0, -1);
        }
        
        await qstash.publishJSON({
          url: `${cleanBaseUrl}/api/worker/process-resume`,
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
      } catch (qErr) {
        console.error('[Apply] Failed to push to QStash:', qErr);
        await updateApplication(application.id, { ai_status: 'failed', notes: 'Failed to connect to QStash API.' });
      }
    }

    // STEP 4: RESPOND TO THE USER IMMEDIATELY
    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
