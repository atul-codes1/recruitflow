import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateApplication } from '@/lib/db';
import { Client } from "@upstash/qstash";

export async function POST(request) {
  try {
    // 1. Find all stuck applications (limit to 20 for safety)
    const { data: stuckApps, error } = await supabase
      .from('applications')
      .select('*')
      .in('ai_status', ['queued', 'failed', 'uploading'])
      .limit(20);

    if (error) throw error;

    if (!stuckApps || stuckApps.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const qstashToken = process.env.QSTASH_TOKEN;
    if (!qstashToken) {
      return NextResponse.json({ error: 'QSTASH_TOKEN missing. Cannot process queue.' }, { status: 500 });
    }

    const qstash = new Client({ token: qstashToken });
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');

    let processedCount = 0;

    // 2. Dispatch them all to QStash
    for (const application of stuckApps) {
      try {
        if (!application.drive_file_id && !application.local_path) {
           console.log(`[Batch Processor] Skipping ${application.id}: No file location.`);
           continue;
        }

        const ext = application.resume_filename.split('.').pop() || 'pdf';

        // Mark as queued to prevent duplicate clicks while QStash picks it up
        await updateApplication(application.id, { ai_status: 'queued' });

        await qstash.publishJSON({
          url: `${baseUrl}/api/worker/process-resume`,
          body: {
            applicationId: application.id,
            drive_file_id: application.drive_file_id || '',
            local_path: application.local_path || '',
            fileName: application.resume_filename,
            jobSlug: '', // we don't strictly need job slug for reparse
            ext,
          },
        });
        
        console.log(`[Batch Processor] Dispatched Application ${application.id} to QStash.`);
        processedCount++;
      } catch (err) {
        console.error(`[Batch Processor] Failed to dispatch ${application.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
