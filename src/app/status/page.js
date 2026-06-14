import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

/**
 * System Status Page (Server Component)
 * 
 * Route: `/status`
 * 
 * Public dashboard showing the health of the platform's microservices. 
 * Currently displays hardcoded "100% Uptime" for marketing trust.
 */
export default function StatusPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '1rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          System Status
        </h1>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '2rem', marginBottom: '3rem', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 15px #10b981', animation: 'pulse 2s infinite' }}></div>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>All Systems Operational</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--color-surface-200)', fontWeight: 500 }}>Careers Portal Routing</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>100% Uptime</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--color-surface-200)', fontWeight: 500 }}>Dashboard Application API</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>100% Uptime</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--color-surface-200)', fontWeight: 500 }}>Resume Parser Services</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>100% Uptime</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--color-surface-200)', fontWeight: 500 }}>Email Notification Engine</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>100% Uptime</span>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
