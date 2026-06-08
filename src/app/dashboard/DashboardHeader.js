'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navLinks = [
    { href: '/dashboard', icon: '📊', label: 'Overview' },
    { href: '/dashboard/candidates', icon: '👥', label: 'Candidates' },
    { href: '/dashboard/jobs', icon: '💼', label: 'Jobs' },
    { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <header style={{ 
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(12px)',
      zIndex: 40
    }}>
      <div style={{ 
        height: '72px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
      }} className="px-responsive">
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="animate-float" style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
            }}>
              ⚡
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              fontFamily: 'var(--font-outfit, var(--font-display))',
              color: 'var(--color-surface-100)',
            }}>
              RecruitFlow
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hide-on-mobile" style={{ display: 'flex', gap: '0.5rem' }}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link" style={pathname === link.href ? { background: 'var(--bg-active)', color: 'var(--color-surface-100)' } : {}}>
                <span>{link.icon}</span> {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/" target="_blank" className="btn-secondary btn-sm">
              Public Portal ↗
            </Link>
            <div 
              style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-light)' }}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'var(--color-primary-600)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 600, 
                  color: 'var(--color-surface-100)',
                  fontSize: '0.875rem'
                }}>
                  HR
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-surface-100)', lineHeight: 1 }}>Recruiter</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', lineHeight: 1, marginTop: '0.25rem' }}>Admin</span>
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  paddingTop: '0.5rem',
                  zIndex: 50,
                }}>
                  <div style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    minWidth: '150px',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease-out'
                  }}>
                    <button 
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '1rem' }}>🚪</span> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className="mobile-only-flex btn-secondary" 
            onClick={toggleMenu}
            style={{ 
              padding: '0.5rem', 
              border: 'none', 
              background: 'transparent',
              fontSize: '1.5rem', 
              color: 'var(--color-surface-100)',
              cursor: 'pointer'
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-only-block animate-slide-right" style={{
          position: 'absolute',
          top: '72px',
          left: 0,
          width: '100%',
          background: 'var(--color-surface-900)',
          borderBottom: '1px solid var(--border-light)',
          padding: '1rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                background: pathname === link.href ? 'rgba(99,102,241,0.15)' : 'var(--bg-subtle)',
                color: pathname === link.href ? 'white' : 'var(--color-surface-200)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{link.icon}</span> {link.label}
            </Link>
          ))}
          <div style={{ margin: '1rem 0', height: '1px', background: 'var(--border-light)' }}></div>
          <Link href="/" target="_blank" className="btn-secondary" style={{ justifyContent: 'center' }}>
            Public Portal ↗
          </Link>
        </div>
      )}
    </header>
  );
}
