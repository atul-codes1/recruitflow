import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

/**
 * Terms of Service Page (Server Component)
 * 
 * Route: `/terms`
 * 
 * Static legal page outlining usage rules and account responsibilities.
 */
export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '1rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          Terms of Service
        </h1>
        <p style={{ color: 'var(--color-surface-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: June 7, 2026</p>
        
        <div className="prose" style={{ color: 'var(--color-surface-300)', fontSize: '1.0625rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>
            Welcome to RecruitFlow. These Terms of Service ("Terms") govern your use of our website and recruitment platform. By accessing or using our services, you agree to be bound by these Terms.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', marginTop: '1rem', marginBottom: '0.5rem' }}>1. Acceptance of Terms</h2>
          <p>
            By accessing our Services, you agree to these Terms and our Privacy Policy. If you do not agree to these Terms, do not use our Services.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', marginTop: '1rem', marginBottom: '0.5rem' }}>2. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You are solely responsible for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', marginTop: '1rem', marginBottom: '0.5rem' }}>3. Acceptable Use</h2>
          <p>
            You agree not to use the Services for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You may not use our platform to post fake job listings or scrape candidate data.
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
