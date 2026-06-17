import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We need to wait 4.5 seconds between each resume to stay safely under Gemini's 15 Requests Per Minute limit.
const DELAY_MS = 4500; 

async function main() {
  console.log('=== RETRY FAILED RESUMES LOCALLY ===\n');

  // 1. Fetch all failed applications
  const { data: apps, error } = await supabase
    .from('applications')
    .select('id, resume_filename, drive_file_id, local_path, ai_status')
    .eq('ai_status', 'failed');

  if (error) { 
    console.error('DB fetch error:', error); 
    process.exit(1); 
  }
  
  if (!apps || apps.length === 0) { 
    console.log('No failed applications found. You are all caught up!'); 
    return; 
  }

  console.log(`Found ${apps.length} failed applications. Processing locally at a safe speed...`);
  console.log(`Estimated time to complete: ${Math.round((apps.length * DELAY_MS) / 60000)} minutes.\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    console.log(`[${i + 1}/${apps.length}] Processing ${app.resume_filename}...`);

    try {
      // Mark as queued temporarily
      await supabase.from('applications').update({ ai_status: 'queued', notes: 'Retrying locally...' }).eq('id', app.id);

      const ext = app.resume_filename.split('.').pop() || 'pdf';

      // Call the worker API endpoint on the production server directly, bypassing QStash
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/worker/process-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          drive_file_id: app.drive_file_id || '',
          local_path: app.local_path || '',
          fileName: app.resume_filename,
          jobSlug: '',
          ext,
        })
      });

      if (!res.ok) {
        throw new Error(`Worker returned ${res.status}`);
      }

      console.log(`  ✓ Success!`);
      success++;
    } catch (e) {
      console.error(`  ✗ Failed:`, e.message);
      // Mark back as failed
      await supabase.from('applications').update({ ai_status: 'failed', notes: e.message }).eq('id', app.id);
      failed++;
    }

    // Wait to respect AI rate limits
    if (i < apps.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`✓ Processed Successfully: ${success}`);
  console.log(`✗ Failed Again: ${failed}`);
}

main().catch(console.error);
