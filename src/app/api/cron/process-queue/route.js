import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Client } from "@upstash/qstash";

/**
 * Resume Processing Queue Engine (CRON / Manual)
 * 
 * Route: `/api/cron/process-queue`
 * 
 * Scans the `applications` table for resumes stuck in 'queued', 'failed', 
 * or 'uploading' states. Dispatches these stuck jobs to the Upstash QStash 
 * background worker (`/api/worker/process-resume`).
 * 
 * Falls back to synchronous execution when running locally (if QSTASH_TOKEN is missing).
 */
export async function POST(request) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Find all stuck applications (limit to 20 for safety)
    const { data: stuckApps, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .in('ai_status', ['queued', 'failed', 'uploading'])
      .limit(20);

    if (error) throw error;

    if (!stuckApps || stuckApps.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const isLocal = process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN;

    let qstash, baseUrl;
    if (!isLocal) {
      qstash = new Client({ token: process.env.QSTASH_TOKEN });
      const protocol = 'https';
      const host = request.headers.get('host');
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!baseUrl || baseUrl.includes('localhost')) {
          baseUrl = host ? `${protocol}://${host}` : 'https://recruitflow-nexion.vercel.app';
      }
    }

    let processedCount = 0;

    // 2. Dispatch them
    for (const application of stuckApps) {
      try {
        if (!application.drive_file_id && !application.local_path) {
           console.log(`[Batch Processor] Skipping ${application.id}: No file location.`);
           continue;
        }

        const ext = application.resume_filename.split('.').pop() || 'pdf';

        // Mark as queued to prevent duplicate clicks while processing
        await supabaseAdmin.from('applications').update({ ai_status: 'queued' }).eq('id', application.id);

        if (isLocal) {
          console.log(`[Batch Processor] Running locally. Processing ${application.id} synchronously...`);
          const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/worker/process-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId: application.id,
              drive_file_id: application.drive_file_id || '',
              local_path: application.local_path || '',
              fileName: application.resume_filename,
              jobSlug: '',
              ext,
            })
          });
          if (!res.ok) throw new Error('Worker returned ' + res.status);
        } else {
          let cleanBaseUrl = baseUrl;
          if (cleanBaseUrl.endsWith('/')) {
              cleanBaseUrl = cleanBaseUrl.slice(0, -1);
          }

          await qstash.publishJSON({
            url: `${cleanBaseUrl}/api/worker/process-resume`,
            body: {
              applicationId: application.id,
              drive_file_id: application.drive_file_id || '',
              local_path: application.local_path || '',
              fileName: application.resume_filename,
              jobSlug: '', // we don't strictly need job slug for reparse
              ext,
            },
          });
        }
        
        console.log(`[Batch Processor] Dispatched Application ${application.id}.`);
        processedCount++;
      } catch (err) {
        console.error(`[Batch Processor] Failed to dispatch ${application.id}:`, err);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: err.message }).eq('id', application.id);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
