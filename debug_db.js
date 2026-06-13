import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read env vars
const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();
  console.log('--- AUTH USERS ---');
  if (users?.users) {
     for (const u of users.users) {
        console.log(u.email, u.id);
     }
  }

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\n--- PROFILES ---');
  console.log(profiles);

  const { data: companies } = await supabase.from('companies').select('*');
  console.log('\n--- COMPANIES ---');
  console.log(companies);
  
  const { data: jobs } = await supabase.from('jobs').select('*');
  console.log('\n--- JOBS ---');
  console.log(jobs);
}

check();
