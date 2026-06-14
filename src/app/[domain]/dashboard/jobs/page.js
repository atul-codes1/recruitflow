import { createClient } from '@/lib/supabase/server';
import JobsClient from './JobsClient';

export const dynamic = 'force-dynamic';

/**
 * Job Postings Page (Server Component)
 * 
 * Route: `/[domain]/dashboard/jobs`
 * 
 * Fetches all active job postings for the current workspace. 
 * Passes down the `userRole` (Admin vs Recruiter) to the client component 
 * to determine if the user is allowed to edit/delete the jobs.
 */
export default async function JobsPage({ params }) {
  const { domain } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  return <JobsClient domain={domain} initialJobs={jobs || []} userId={user.id} userRole={profile?.role} />;
}
