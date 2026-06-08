import Link from 'next/link';

export default function SuccessPage({ searchParams }) {
  // Await searchParams in Next 15+ is not strictly required if we just read it, but since it's an async component, it's better to await it.
  // Actually, in Next.js 15, searchParams is a Promise. Let's handle it carefully or just make this a client component.
  return (
    <div className="bg-gradient-hero bg-grid-pattern" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card animate-in" style={{ textAlign: 'center', padding: '4rem 3rem', maxWidth: '520px', margin: '2rem' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(16,185,129,0.1)',
          border: '2px solid rgba(16,185,129,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)',
          animation: 'scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" style={{
              strokeDasharray: '100',
              strokeDashoffset: '100',
              animation: 'drawCheck 0.6s ease 0.2s forwards'
            }}/>
          </svg>
        </div>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-outfit, var(--font-display))',
          marginBottom: '1rem',
          color: 'var(--color-surface-100)',
        }}>
          Application Received!
        </h1>
        
        <p style={{ color: 'var(--color-surface-400)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Thank you for applying. We&apos;ve successfully received your resume and details. 
          Our team will review your application and get back to you if there&apos;s a match.
        </p>

        <Link href="/" className="btn-primary" style={{ width: '100%', padding: '1rem' }}>
          Back to Careers
        </Link>
      </div>
    </div>
  );
}
