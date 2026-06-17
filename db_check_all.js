import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  let allData = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('applications')
      .select('ai_status, notes')
      .range(from, from + step - 1);

    if (error) {
      console.error(error);
      break;
    }

    if (data.length === 0) break;
    allData = allData.concat(data);
    from += step;
  }

  const statusCounts = {};
  const errorCounts = {};

  for (const app of allData) {
    statusCounts[app.ai_status] = (statusCounts[app.ai_status] || 0) + 1;
    if (app.ai_status === 'failed') {
      const note = app.notes || 'No note';
      const shortNote = note.substring(0, 80);
      errorCounts[shortNote] = (errorCounts[shortNote] || 0) + 1;
    }
  }

  console.log("Total Resumes in DB:", allData.length);
  console.log("Status Breakdown:", statusCounts);
  console.log("Error Breakdown for Failed:", errorCounts);
}

check();
