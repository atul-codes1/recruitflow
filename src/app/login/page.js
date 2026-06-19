'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'verify', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  
  const router = useRouter();

  // Handle Theme Initialization
  useEffect(() => {
    const saved = localStorage.getItem('recruitflow-theme');
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('recruitflow-theme', newTheme);
  };

  // Automatically capture errors from the URL (e.g. ?error=GhostSession)
  // We use useEffect to avoid breaking Next.js Static Rendering with useSearchParams()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      if (urlError) {
        // Format the error nicely
        setError(urlError.replace(/\+/g, ' '));
        
        // Clean up the URL so the error doesn't persist if they refresh
        window.history.replaceState({}, '', '/login');
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let success = false;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        success = true;
        // Hard redirect to clear bfcache and trigger the tenant router
        window.location.href = '/api/auth/route-tenant';
      } else {
        const data = await res.json();
        if (data.error && data.error.includes('Invalid login credentials')) {
          setError('Invalid email or password. If you are a new user, please register first.');
        } else {
          setError(data.error || 'Invalid credentials');
        }
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('Failed to connect to the server. Please check your internet connection.');
    }

    if (!success) {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      if (res.ok) {
        // Auto-login since we bypassed email verification!
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (loginRes.ok) {
          window.location.href = '/api/auth/route-tenant';
        } else {
          setMode('login'); // Fallback
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        setMode('verify');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send reset link');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--color-surface-950)', 
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Inter", sans-serif'
    }}>
      
      {/* Floating Theme Toggle */}
      <button 
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
          color: 'var(--color-surface-100)', padding: '0.6rem', borderRadius: '50%',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-card)', transition: 'all 0.3s ease',
        }}
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        className="hover-lift"
      >
        {theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      {/* Injecting Premium CSS for Inputs and Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .premium-input {
          width: 100%;
          background: var(--color-surface-800);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
          font-size: 1rem;
          color: var(--color-surface-100);
          outline: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-input:focus {
          background: var(--color-surface-900);
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.15);
        }
        .premium-input::placeholder {
          color: var(--color-surface-400);
        }
        .premium-button {
          width: 100%;
          padding: 1.1rem;
          font-size: 1.05rem;
          font-weight: 600;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
        }
        .premium-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }
        .premium-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .auth-link {
          color: #818cf8;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .auth-link:hover {
          color: #a855f7;
          text-decoration: underline;
        }
        @keyframes subtle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}} />

      {/* Dynamic Background Orbs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ 
          position: 'absolute', top: '-20%', left: '0%', width: '700px', height: '700px', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(90px)'
        }}></div>
        <div style={{ 
          position: 'absolute', bottom: '-20%', right: '0%', width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(90px)'
        }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '2rem' }}>
        
        {/* Glow behind the card */}
        <div style={{
          position: 'absolute', inset: '1rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          filter: 'blur(40px)', opacity: 0.2, zIndex: -1, borderRadius: '30px'
        }}></div>

        <div style={{ 
          padding: '3rem', 
          background: 'var(--color-surface-900)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--color-border)', 
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)' 
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ 
              width: '48px', height: '48px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
              borderRadius: '14px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
              animation: 'subtle-bounce 4s ease-in-out infinite'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-surface-100)', margin: 0, letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Workspace' : mode === 'reset' ? 'Reset Password' : 'Check Email'}
            </h1>
            <p style={{ color: 'var(--color-surface-400)', fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
              {mode === 'login' ? 'Enter your credentials to access the vault.' : 
               mode === 'register' ? 'Use your corporate email to join.' : 
               mode === 'reset' ? 'Enter your email to receive a recovery link.' :
               'Check your inbox for the secure link.'}
            </p>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', 
              color: '#ef4444', padding: '1rem', borderRadius: '8px', 
              marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.5,
              animation: 'fade-in 0.3s ease-out'
            }}>
              <strong>Authentication Error:</strong><br/>
              {error}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="premium-input" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="premium-input" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.75rem' }}>
                <span className="auth-link" style={{ fontSize: '0.85rem' }} onClick={() => setMode('reset')}>
                  Forgot Password?
                </span>
              </div>
              <button type="submit" disabled={loading} className="premium-button">
                {loading ? 'Authenticating securely...' : 'Sign In'}
              </button>
              <p style={{ textAlign: 'center', color: 'var(--color-surface-400)', fontSize: '0.9rem', marginTop: '1rem' }}>
                New company? <span className="auth-link" onClick={() => setMode('register')}>Register here</span>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="premium-input" />
              <input type="email" placeholder="Work Email (e.g. name@company.com)" value={email} onChange={(e) => setEmail(e.target.value)} required className="premium-input" />
              <input type="password" placeholder="Secure Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="premium-input" />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="premium-input" />
              <button type="submit" disabled={loading} className="premium-button">
                {loading ? 'Provisioning Workspace...' : 'Create Account'}
              </button>
              <p style={{ textAlign: 'center', color: 'var(--color-surface-400)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Already have an account? <span className="auth-link" onClick={() => setMode('login')}>Sign In</span>
              </p>
            </form>
          )}

            {mode === 'verify' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', animation: 'subtle-bounce 3s infinite' }}>✉️</div>
              <h2 style={{ color: 'var(--color-surface-100)', fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>Check Your Email</h2>
              <p style={{ color: 'var(--color-surface-400)', fontSize: '1rem', lineHeight: 1.6 }}>
                We've sent a secure link to <strong>{email}</strong>. <br/><br/>
                Click the link in the email to securely verify your identity!
              </p>
              <button onClick={() => setMode('login')} className="premium-button" style={{ background: 'var(--color-surface-800)', boxShadow: 'none', marginTop: '2rem' }}>
                Back to Sign In
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="premium-input" />
              <button type="submit" disabled={loading} className="premium-button">
                {loading ? 'Sending Request...' : 'Send Recovery Link'}
              </button>
              <p style={{ textAlign: 'center', color: 'var(--color-surface-400)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Remembered it? <span className="auth-link" onClick={() => setMode('login')}>Sign In</span>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
