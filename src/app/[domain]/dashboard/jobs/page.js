import { createClient } from '@/lib/supabase/server';
import JobsClient from './JobsClient';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  return <JobsClient initialJobs={jobs || []} />;
}
