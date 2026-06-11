import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

    if (!application.drive_file_id) {
       return NextResponse.json({ error: 'No PDF found in Google Drive to reparse' }, { status: 400 });
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
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000';
      
      const ext = application.resume_filename.split('.').pop() || 'pdf';

      await qstash.publishJSON({
        url: `${baseUrl}/api/worker/process-resume`,
        body: {
          applicationId: application.id,
          drive_file_id: application.drive_file_id,
          fileName: application.resume_filename,
          jobSlug: '', // we don't strictly need job slug for reparse
          ext,
        },
      });
      console.log(`[Reparse] Successfully pushed Application ${application.id} to QStash.`);
    } catch (qErr) {
      console.error('[Reparse] Failed to push to QStash:', qErr);
      return NextResponse.json({ error: 'Failed to trigger queue' }, { status: 500 });
    }

    revalidatePath('/dashboard/candidates');
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reparse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
