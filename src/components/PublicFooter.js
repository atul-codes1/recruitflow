import Link from 'next/link';

export default function PublicFooter() {
  const linkStyle = {
    color: 'var(--color-surface-400)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'color 0.2s'
  };

  return (
    <footer style={{
      borderTop: '1px solid var(--bg-active)',
      background: 'var(--color-surface-900)',
      padding: '1.5rem 1rem 1rem',
      marginTop: 'auto',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: '1.5rem',
        marginBottom: '1rem',
      }}>
        {/* Brand Column */}
        <div className="footer-brand-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 250px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '4px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
            }}>
              ⚡
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'white' }}>
              RecruitFlow
            </span>
          </Link>
          <p style={{ color: 'var(--color-surface-400)', fontSize: '0.75rem', lineHeight: 1.4, maxWidth: '280px', margin: 0 }}>
            Building the future of work. Join our mission and help us create amazing experiences globally.
          </p>
        </div>

        {/* Links Area */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', flex: '2 1 auto', justifyContent: 'space-between' }}>
          <div style={{ flex: '0 1 auto' }}>
            <h4 style={{ color: 'var(--color-surface-100)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8125rem' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><Link href="/about" style={linkStyle}>About</Link></li>
              <li><Link href="/" style={linkStyle}>Careers</Link></li>
              <li><Link href="/blog" style={linkStyle}>Blog</Link></li>
              <li><Link href="/contact" style={linkStyle}>Contact</Link></li>
            </ul>
          </div>

          <div style={{ flex: '0 1 auto' }}>
            <h4 style={{ color: 'var(--color-surface-100)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8125rem' }}>Resources</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><Link href="/help" style={linkStyle}>Help</Link></li>
              <li><Link href="/status" style={linkStyle}>Status</Link></li>
              <li><Link href="/dashboard" style={linkStyle}>Employer Login</Link></li>
            </ul>
          </div>

          <div style={{ flex: '0 1 auto' }}>
            <h4 style={{ color: 'var(--color-surface-100)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8125rem' }}>Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><Link href="/privacy" style={linkStyle}>Privacy</Link></li>
              <li><Link href="/terms" style={linkStyle}>Terms</Link></li>
              <li><Link href="/cookies" style={linkStyle}>Cookies</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'var(--color-surface-500)',
        fontSize: '0.75rem'
      }}>
        <div>&copy; {new Date().getFullYear()} RecruitFlow Inc.</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }}>Twitter</span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }}>LinkedIn</span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }}>GitHub</span>
        </div>
      </div>
    </footer>
  );
}
