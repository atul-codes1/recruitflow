import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

/**
 * Help Center Page (Server Component)
 * 
 * Route: `/help`
 * 
 * Static FAQ page providing basic platform guidance.
 */
export default function HelpPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '2rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          Help Center
        </h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>How do I post a new job?</h3>
            <p style={{ color: 'var(--color-surface-400)', margin: 0, lineHeight: 1.6 }}>
              Navigate to your Dashboard and select the "Jobs" tab. Click the glowing "+ Create New Job" button in the top right. Fill out the form and your job will be instantly live on your careers portal.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>Can candidates track their application status?</h3>
            <p style={{ color: 'var(--color-surface-400)', margin: 0, lineHeight: 1.6 }}>
              Currently, candidates receive email updates when their status changes. A dedicated candidate portal is on our upcoming roadmap for Q3 2026.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>How do I change a candidate's status?</h3>
            <p style={{ color: 'var(--color-surface-400)', margin: 0, lineHeight: 1.6 }}>
              In the "Candidates" tab, click the status badge next to any candidate's name. A dropdown will appear allowing you to instantly move them through your pipeline (e.g., from Unreviewed to Interviewing).
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
