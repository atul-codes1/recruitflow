import { createClient } from '@/lib/supabase/server';
import JobsClient from './JobsClient';

export const dynamic = 'force-dynamic';

export default async function JobsPage({ params }) {
  const { domain } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  return <JobsClient domain={domain} initialJobs={jobs || []} userId={user.id} userRole={profile?.role} />;
}
