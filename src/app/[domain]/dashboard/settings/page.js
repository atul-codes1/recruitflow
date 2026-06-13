import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }) {
  const { domain } = await params;

  return (
    <div className="animate-fade" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', marginBottom: '0.25rem' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '0.875rem' }}>Manage your integrations.</p>
      </div>

      <div style={{ maxWidth: '550px' }}>
        <div className="card" style={{ padding: '1.25rem', background: 'var(--color-surface-900)', borderColor: 'var(--border-light)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--bg-subtle)' }}>
                {/* Simplified Google Drive Logo */}
                <svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.33 2.16L15.66 2.16L23 14.83H15.66L8.33 2.16Z" fill="#FFC107"/>
                  <path d="M1.33 14.83L8.66 2.16L12.33 8.5L5 21.16L1.33 14.83Z" fill="#4CAF50"/>
                  <path d="M5 21.16L12.33 8.5L19.66 8.5L12.33 21.16H5Z" fill="#2196F3"/>
                </svg>
              </div>
              Google Drive
            </h3>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.625rem', fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }}></div>
              Local
            </div>
          </div>
          
          <p style={{ color: 'var(--color-surface-400)', fontSize: '0.75rem', lineHeight: 1.4, margin: '0 0 1rem 0' }}>
            Configure GCP credentials to stream candidate resumes directly to your 5TB Google Drive.
          </p>

          <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="label" style={{ color: 'var(--color-surface-300)', fontSize: '0.6875rem', marginBottom: '0.2rem' }}>GCP Project ID</label>
                <input type="text" className="input" placeholder="e.g. recruitflow-42..." style={{ background: 'var(--bg-panel)', padding: '0.4rem', fontSize: '0.75rem', height: 'auto', borderRadius: '4px' }} disabled />
              </div>
              <div>
                <label className="label" style={{ color: 'var(--color-surface-300)', fontSize: '0.6875rem', marginBottom: '0.2rem' }}>Service Account Email</label>
                <input type="text" className="input" placeholder="e.g. bot@recruitflow..." style={{ background: 'var(--bg-panel)', padding: '0.4rem', fontSize: '0.75rem', height: 'auto', borderRadius: '4px' }} disabled />
              </div>
              <div>
                <label className="label" style={{ color: 'var(--color-surface-300)', fontSize: '0.6875rem', marginBottom: '0.2rem' }}>Private Key</label>
                <input type="password" className="input" placeholder="-----BEGIN PRIVATE..." style={{ background: 'var(--bg-panel)', padding: '0.4rem', fontSize: '0.75rem', height: 'auto', borderRadius: '4px' }} disabled />
              </div>
            </div>
            
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', opacity: 0.5, cursor: 'not-allowed', height: 'auto', borderRadius: '4px' }} disabled>
                Save
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
             <span style={{ color: 'var(--color-surface-500)' }}>🔒 Google Cloud Platform</span>
             <Link href={`/${domain}/dashboard/settings/docs`} style={{ color: 'var(--color-primary-400)', textDecoration: 'none' }}>
               GCP Docs ↗
             </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}
