import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role || 'member';

  const { data: jobs } = await supabase.from('jobs').select('*');

  let appQuery = supabase.from('applications').select('*').order('created_at', { ascending: false });

  if (role !== 'admin') {
    appQuery = appQuery.eq('recruiter_id', user.id);
  }

  const { data: applications } = await appQuery;

  // Calculate Dashboard Stats
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let totalApplications = 0;
  let shortlisted = 0;
  let newToday = 0;

  for (const a of (applications || [])) {
    totalApplications++;
    if (a.status === 'shortlisted' || a.status === 'hired') shortlisted++;
    const appDate = new Date(a.created_at).getTime();
    if (appDate >= startOfToday) newToday++;
  }

  const activeJobs = (jobs || []).filter(j => j.is_active).length;

  const stats = {
    total: totalApplications,
    today: newToday,
    this_week: newToday, // placeholder for weekly delta
    by_status: { shortlisted },
    active_jobs: activeJobs,
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="animate-fade">
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-stat" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Apps</span>
            <span style={{ fontSize: '1rem' }}>📈</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)' }}>{stats.total}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-400)', fontWeight: 500 }}>↑ {stats.this_week} this wk</span>
          </div>
        </div>

        <div className="card-stat" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Today</span>
            <span style={{ fontSize: '1rem' }}>✨</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)' }}>{stats.today}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>To review</span>
          </div>
        </div>

        <div className="card-stat" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shortlisted</span>
            <span style={{ fontSize: '1rem' }}>⭐</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)' }}>{stats.by_status.shortlisted}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>In pipeline</span>
          </div>
        </div>

        <div className="card-stat" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Jobs</span>
            <span style={{ fontSize: '1rem' }}>💼</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)' }}>{stats.active_jobs}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>Open</span>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-outfit, var(--font-display))' }}>
            Recent Applications
          </h3>
          <input 
            type="text" 
            placeholder="Search candidates..." 
            className="input" 
            style={{ width: '240px', padding: '0.5rem 1rem', fontSize: '0.8125rem' }} 
          />
        </div>

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
            <p style={{ fontSize: '0.875rem' }}>
              When candidates apply, their details and resumes will appear here.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Applied For</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                {(applications || []).map(app => {
                  const job = (jobs || []).find(j => j.id === app.job_id);
                  return (
                    <tr key={app.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-surface-100)' }}>
                          {app.parsed_data?.candidate?.name || app.candidate_name || 'Anonymous Applicant'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>
                          {app.candidate_email}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{job?.title || 'Unknown Job'}</div>
                        {(app.parsed_data?.professional_narrative?.years_of_experience_calculated !== undefined && app.parsed_data?.professional_narrative?.years_of_experience_calculated !== null) && (
                          <div className="flex items-center text-xs text-indigo-400 mt-1">
                            {app.parsed_data.professional_narrative.years_of_experience_calculated} yrs exp
                          </div>
                        )}
                      </td>
                      <td>{formatDate(app.created_at)}</td>
                      <td>
                        <span className={`badge badge-${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        {app.drive_web_url ? (
                          <a href={app.drive_web_url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                            View in Drive
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-500)' }}>
                            No link available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
