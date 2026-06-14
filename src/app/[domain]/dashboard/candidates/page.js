import { createClient } from '@/lib/supabase/server';
import CandidatesClient from './CandidatesClient';
import PageHeader from './PageHeader';

export const dynamic = 'force-dynamic';

/**
 * Candidates Pipeline Page (Server Component)
 * 
 * Route: `/[domain]/dashboard/candidates`
 * 
 * This server component fetches all applications securely before passing them 
 * down to the `CandidatesClient` for interactive filtering.
 * 
 * RBAC Enforcement:
 * - Admin: Fetches ALL applications in the workspace.
 * - Recruiter: Fetches ONLY applications where `recruiter_id === user.id`.
 */
export default async function CandidatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role || 'recruiter';

  const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });

  let appQuery = supabase.from('applications').select('*').order('created_at', { ascending: false });

  if (role !== 'admin') {
    appQuery = appQuery.eq('recruiter_id', user.id);
  }

  const { data: applications } = await appQuery;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="animate-fade">
      <PageHeader />
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {!applications || applications.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-surface-200)' }}>
              No applications yet
            </h3>
          </div>
        ) : (
          <CandidatesClient initialApplications={applications} jobs={jobs || []} />
        )}
      </div>
    </div>
  );
}
