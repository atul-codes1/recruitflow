import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '2rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          About Us
        </h1>
        <div style={{ color: 'var(--color-surface-300)', fontSize: '1.125rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>
            At RecruitFlow, we believe that hiring should be a seamless, beautiful, and intuitive experience for both candidates and employers.
          </p>
          <p>
            Founded in 2026, our mission is to eliminate the friction of traditional applicant tracking systems (ATS) by providing a lightning-fast, glassmorphic platform that actually feels good to use.
          </p>
          <p>
            We are a small, passionate team of designers and engineers dedicated to the future of work. We power the hiring pipelines of the world's most innovative startups.
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
