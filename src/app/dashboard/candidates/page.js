import { getAllApplications, getAllJobs } from '@/lib/db';
import CandidatesClient from './CandidatesClient';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage() {
  const applications = await getAllApplications();
  const jobs = await getAllJobs();

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>
          Candidates Pipeline
        </h1>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {applications.length === 0 ? (
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
          <CandidatesClient initialApplications={applications} jobs={jobs} />
        )}
      </div>
    </div>
  );
}
