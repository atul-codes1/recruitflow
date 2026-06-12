import { NextResponse } from 'next/server';
import { getApplicationById, updateApplication } from '@/lib/db';
import { Client } from "@upstash/qstash";

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
       ai_status: 'queued'
    });

    try {
      const qstashToken = process.env.QSTASH_TOKEN;
      if (!qstashToken) {
        return NextResponse.json({ error: 'QSTASH_TOKEN missing. Cannot reparse.' }, { status: 500 });
      }

      const qstash = new Client({ token: qstashToken });
      
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
      const host = vercelUrl || request.headers.get('host');
      let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!baseUrl || (process.env.NODE_ENV === 'production' && baseUrl.includes('localhost'))) {
          baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000';
      }
      
      const ext = application.resume_filename.split('.').pop() || 'pdf';

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
      console.log(`[Reparse] Successfully pushed Application ${application.id} to QStash at ${baseUrl}.`);
    } catch (qErr) {
      console.error('[Reparse] Failed to push to QStash:', qErr);
      await updateApplication(application.id, { ai_status: 'failed', notes: 'Failed to connect to QStash API.' });
      return NextResponse.json({ error: 'Failed to trigger queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reparse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
