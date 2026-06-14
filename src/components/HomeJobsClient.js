'use client';

import Link from 'next/link';

/**
 * Public Job Board Grid (Client Component)
 * 
 * Used exclusively on the `/boards/[domain]` page.
 * Renders a visually appealing, animated grid of open positions for a 
 * specific tenant. Clicking a job routes the candidate to the application page.
 */
export default function HomeJobsClient({ domain, jobs }) {

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
          padding: '0.25rem 0.75rem', borderRadius: '9999px', 
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.1))',
          border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'linear-gradient(135deg, #a5b4fc, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Hiring
          </span>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', margin: 0, letterSpacing: '-0.02em' }}>
          Open Positions
        </h1>
      </div>

      <section>
        {jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-surface-200)' }}>
              No open positions right now
            </h3>
            <p style={{ color: 'var(--color-surface-400)' }}>
              Check back soon — we&apos;re always growing!
            </p>
          </div>
        ) : (
          <div className="home-job-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {jobs.map((job, index) => (
              <Link
                key={job.id}
                href={`/boards/${domain}/${job.slug}`}
                className={`card-stat stagger-${(index % 4) + 1}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  height: '100%',
                  padding: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h2 style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: 'var(--color-surface-100)',
                      fontFamily: 'var(--font-outfit, var(--font-display))',
                      lineHeight: 1.3,
                    }}>
                      {job.title}
                    </h2>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(99,102,241,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#818cf8', flexShrink: 0, marginLeft: '1rem'
                    }}>
                      ↗
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-surface-300)', marginBottom: '1rem' }}>
                    {job.department && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                        📁 {job.department}
                      </span>
                    )}
                    {job.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                        📍 {job.location}
                      </span>
                    )}
                    {job.employment_type && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                        ⏰ {job.employment_type}
                      </span>
                    )}
                    {job.experience && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                        🎓 {job.experience}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{
                  width: '100%',
                  textAlign: 'center',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'var(--color-surface-100)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s ease',
                }}>
                  Apply Now
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
