import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

/**
 * Privacy Policy Page (Server Component)
 * 
 * Route: `/privacy`
 * 
 * Static legal page detailing data collection policies.
 */
export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '1rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--color-surface-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: June 7, 2026</p>
        
        <div className="prose" style={{ color: 'var(--color-surface-300)', fontSize: '1.0625rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>
            At RecruitFlow, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our recruitment platform.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', marginTop: '1rem', marginBottom: '0.5rem' }}>1. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', marginTop: '1rem', marginBottom: '0.5rem' }}>2. How We Use Your Information</h2>
          <p>
            We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', marginTop: '1rem', marginBottom: '0.5rem' }}>3. Will Your Information Be Shared With Anyone?</h2>
          <p>
            We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. Candidate data submitted through job applications is shared strictly with the employer account that posted the job.
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
