import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Client } from "@upstash/qstash";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Fetch overall counts using exact count for accuracy without downloading payload
    const statuses = ['completed', 'queued', 'failed', 'uploading'];
    const counts = { completed: 0, queued: 0, failed: 0, uploading: 0 };

    for (const status of statuses) {
      const { count } = await supabaseAdmin
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('ai_status', status);
      counts[status] = count || 0;
    }

    // 2. Fetch the latest 100 failed error logs
    const { data: errorLogs } = await supabaseAdmin
      .from('applications')
      .select('id, resume_filename, notes, created_at')
      .eq('ai_status', 'failed')
      .order('created_at', { ascending: false })
      .limit(100);

    // Group errors by reason for UI categorization
    const groupedErrors = {};
    if (errorLogs) {
      for (const log of errorLogs) {
        const note = log.notes || 'Unknown Error';
        // Auto-tag Soft vs Hard
        let category = 'Hard Fail';
        let cleanNote = note;
        
        if (note.includes('Exceeded daily rate limit') || note.includes('QStash Error')) {
          category = 'Soft Fail (Rate Limit)';
          cleanNote = 'QStash Rate Limit Exceeded';
        } else if (note.includes('429')) {
          category = 'Soft Fail (Rate Limit)';
          cleanNote = 'AI Provider Rate Limit (429)';
        } else if (note.includes('corrupt') || note.includes('read pdf') || note.includes('extract text')) {
          category = 'Hard Fail (Bad File)';
          cleanNote = 'Unreadable or Corrupted Document';
        }

        if (!groupedErrors[cleanNote]) {
          groupedErrors[cleanNote] = { count: 0, category, examples: [] };
        }
        groupedErrors[cleanNote].count++;
        if (groupedErrors[cleanNote].examples.length < 5) {
          groupedErrors[cleanNote].examples.push(log);
        }
      }
    }

    return NextResponse.json({
      success: true,
      counts,
      errors: Object.entries(groupedErrors).map(([message, details]) => ({
        message,
        category: details.category,
        count: details.count,
        examples: details.examples
      }))
    });

  } catch (error) {
    console.error('[Health GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabaseAdmin = createAdminClient();
    const { action } = await req.json();

    if (action === 'retry_failed') {
      // Find soft fails and mark them as queued
      const { data: failedApps } = await supabaseAdmin
        .from('applications')
        .select('id, notes')
        .eq('ai_status', 'failed')
        .limit(1000); // Process in batches of 1000

      let requeued = 0;
      for (const app of failedApps || []) {
        // Only retry soft fails
        const note = app.notes || '';
        if (note.includes('Exceeded daily rate limit') || note.includes('QStash') || note.includes('429') || note.includes('fetch failed')) {
          await supabaseAdmin.from('applications').update({ ai_status: 'queued', notes: 'Retrying...' }).eq('id', app.id);
          requeued++;
        }
      }
      return NextResponse.json({ success: true, message: `Re-queued ${requeued} soft failures. Background cron will process them.` });
    }

    if (action === 'resync_uploading') {
      const { data, error } = await supabaseAdmin
        .from('applications')
        .update({ ai_status: 'queued', notes: 'Re-synced from stuck uploading state' })
        .eq('ai_status', 'uploading')
        .select('id');
        
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Re-synced ${data?.length || 0} stuck uploads.` });
    }

    if (action === 'purge_queue') {
      // The kill switch: delete anything that is queued or uploading
      const { data, error } = await supabaseAdmin
        .from('applications')
        .delete()
        .in('ai_status', ['queued', 'uploading'])
        .select('id');

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Purged ${data?.length || 0} items from the queue. AI pipeline halted.` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[Health POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
