'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

/**
 * Dashboard Navigation Header (Client Component)
 * 
 * Renders the top navigation bar for the recruiter dashboard.
 * Takes the `domain` (for routing) and `profile` (for displaying name/initials).
 */
export default function DashboardHeader({ domain, profile }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    // 1. Destroy the session cookie via our API route
    await fetch('/api/logout', { method: 'POST' });
    
    // 2. bfcache Preventer
    // We use a hard `window.location.href` redirect instead of Next.js `router.push()`.
    // Why? `router.push()` leverages the bfcache (Back-Forward Cache). If the user
    // clicked the browser "Back" button after logging out, they would see the authenticated
    // DOM (even though API calls would fail). A hard redirect flushes the Next.js cache.
    window.location.href = '/login';
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navLinks = [
    { href: `/${domain}/dashboard`, icon: '📊', label: 'Overview' },
    { href: `/${domain}/dashboard/search`, icon: '🧠', label: 'AI Search' },
    { href: `/${domain}/dashboard/candidates`, icon: '👥', label: 'Candidates' },
    { href: `/${domain}/dashboard/jobs`, icon: '💼', label: 'Jobs' },
    { href: `/${domain}/dashboard/health`, icon: '⚙️', label: 'System Health' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

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
            
            <div 
              style={{ position: 'relative' }}
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
                  {getInitials(profile?.full_name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-surface-100)', lineHeight: 1 }}>
                    {profile?.full_name || 'User'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', lineHeight: 1, marginTop: '0.25rem', textTransform: 'capitalize' }}>
                    {profile?.role || 'Recruiter'}
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-surface-500)', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
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
                    background: 'var(--color-surface-900)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    minWidth: '180px',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease-out',
                  }}>
                    <Link 
                      href={`/${domain}/dashboard/profile`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-surface-200)',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        textDecoration: 'none',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-active)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '1rem' }}>👤</span> My Profile
                    </Link>
                    <Link 
                      href={`/${domain}/dashboard/settings`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-surface-200)',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        textDecoration: 'none',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-active)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '1rem' }}>⚙️</span> Settings
                    </Link>
                    <Link 
                      href={`/boards/${domain}`} 
                      target="_blank"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-surface-200)',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        textDecoration: 'none',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-active)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '1rem' }}>🌐</span> Public Portal ↗
                    </Link>
                    <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-surface-300)' }}>Theme</span>
                      <ThemeToggle />
                    </div>
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
          <Link 
            href={`/${domain}/dashboard/profile`} 
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              background: pathname === `/${domain}/dashboard/profile` ? 'rgba(99,102,241,0.15)' : 'var(--bg-subtle)',
              color: pathname === `/${domain}/dashboard/profile` ? 'white' : 'var(--color-surface-200)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>👤</span> My Profile
          </Link>
          <Link 
            href={`/${domain}/dashboard/settings`} 
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              background: pathname === `/${domain}/dashboard/settings` ? 'rgba(99,102,241,0.15)' : 'var(--bg-subtle)',
              color: pathname === `/${domain}/dashboard/settings` ? 'white' : 'var(--color-surface-200)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⚙️</span> Settings
          </Link>
          <div style={{ margin: '1rem 0', height: '1px', background: 'var(--border-light)' }}></div>
          <Link href={`/boards/${domain}`} target="_blank" className="btn-secondary" style={{ justifyContent: 'center' }}>
            Public Portal ↗
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
