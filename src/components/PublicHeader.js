import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header style={{ 
      borderBottom: '1px solid var(--bg-active)',
      background: 'var(--bg-overlay)', /* Distinct slate blue */
      backdropFilter: 'blur(20px)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.8)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        
        {/* Left Side: Logo & Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="animate-float" style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
            }}>
              ⚡
            </div>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: 700, 
              fontFamily: 'var(--font-outfit, var(--font-display))',
              background: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              RecruitFlow
            </span>
          </Link>
        </div>

        {/* Right Side: CTA */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            Recruiter Login
          </Link>
        </div>

      </div>
    </header>
  );
}
