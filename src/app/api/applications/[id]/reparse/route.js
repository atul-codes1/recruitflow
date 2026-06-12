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

    if (process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN) {
      console.log('[Reparse] Running in Local Dev. Using synchronous Next.js after() to process.');
      const { after } = require('next/server');
      after(async () => {
        try {
          const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/worker/process-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId: application.id,
              drive_file_id: application.drive_file_id || '',
              local_path: application.local_path || '',
              fileName: application.resume_filename,
              jobSlug: '',
              ext: application.resume_filename.split('.').pop() || 'pdf',
            })
          });
          if (!res.ok) throw new Error('Worker returned ' + res.status);
        } catch (e) {
          console.error('[Reparse] Local after() processing failed:', e);
          await updateApplication(application.id, { ai_status: 'failed', notes: e.message });
        }
      });
    } else {
      try {
        const qstashToken = process.env.QSTASH_TOKEN;
        const qstash = new Client({ token: qstashToken });
        
        const protocol = 'https';
        const host = request.headers.get('host');
        let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl || baseUrl.includes('localhost')) {
            baseUrl = host ? `${protocol}://${host}` : 'https://recruitflow-nexion.vercel.app';
        }
        
        const ext = application.resume_filename.split('.').pop() || 'pdf';

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
        console.log(`[Reparse] Successfully pushed Application ${application.id} to QStash at ${baseUrl}.`);
      } catch (qErr) {
        console.error('[Reparse] Failed to push to QStash:', qErr);
        await updateApplication(application.id, { ai_status: 'failed', notes: 'Failed to connect to QStash API.' });
        return NextResponse.json({ error: 'Failed to trigger queue' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reparse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
