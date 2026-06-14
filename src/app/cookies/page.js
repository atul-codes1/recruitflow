import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

/**
 * Cookie Settings Page (Server Component)
 * 
 * Route: `/cookies`
 * 
 * Static legal page explaining cookie usage. 
 * Note: The toggle functionality here is currently a mock UI and does not 
 * genuinely block/allow analytics cookies yet.
 */
export default function CookiesPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '1rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          Cookie Settings
        </h1>
        <p style={{ color: 'var(--color-surface-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: June 7, 2026</p>
        
        <div className="prose" style={{ color: 'var(--color-surface-300)', fontSize: '1.0625rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>
            RecruitFlow uses cookies to improve your experience. Below you can manage your preferences regarding how we use cookies on our platform.
          </p>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', color: 'var(--color-surface-100)', marginBottom: '0.5rem', marginTop: 0 }}>Strictly Necessary Cookies</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>These cookies are essential for you to browse the website and use its features, such as accessing secure areas of the site like your dashboard.</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Always Active</div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', color: 'var(--color-surface-100)', marginBottom: '0.5rem', marginTop: 0 }}>Analytics Cookies</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Mock Toggle */}
              <div style={{ width: '40px', height: '20px', background: '#6366f1', borderRadius: '20px', position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: '16px', height: '16px', background: 'var(--color-surface-100)', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px' }}></div>
              </div>
            </div>
          </div>
          
          <button className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
            Save Preferences
          </button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
