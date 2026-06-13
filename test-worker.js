const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWorker() {
  const { data: stuckApps, error } = await supabase
    .from('applications')
    .select('*')
    .in('ai_status', ['queued', 'failed', 'uploading'])
    .limit(1);

  if (error || !stuckApps || stuckApps.length === 0) {
    console.log('No stuck applications found.');
    return;
  }

  const app = stuckApps[0];
  console.log(`Found stuck app: ${app.id}`);
  
  const ext = app.resume_filename.split('.').pop() || 'pdf';

  const body = {
    applicationId: app.id,
    drive_file_id: app.drive_file_id || '',
    local_path: app.local_path || '',
    fileName: app.resume_filename,
    jobSlug: '',
    ext,
  };

  console.log('Sending payload to worker:', body);

  const res = await fetch('https://recruitflow-nexion.vercel.app/api/worker/process-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const responseText = await res.text();
  console.log(`Worker Response Status: ${res.status}`);
  console.log(`Worker Response Body: ${responseText}`);
}

testWorker();
