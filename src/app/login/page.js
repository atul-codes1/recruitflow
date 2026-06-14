'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Authentication Hub (Client Component)
 * 
 * Route: `/login`
 * 
 * This is a multi-mode auth page handling Login, Registration, Magic Links, 
 * and Password Resets.
 * 
 * CRITICAL ARCHITECTURE NOTE:
 * We do NOT use the `@supabase/supabase-js` browser client here. 
 * Instead, we post credentials to our Next.js API Routes (e.g. `/api/auth/login`).
 * Why? Because Next.js App Router requires auth state to be available on the 
 * server during initial render via secure HTTP-only cookies.
 */
export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'verify', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let success = false;
    try {
      // ------------------------------------------------------------------------
      // SSR AUTHENTICATION FLOW
      // ------------------------------------------------------------------------
      // We send credentials to our backend API route which uses `@supabase/ssr`
      // to securely set HTTP-only session cookies before redirecting.
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
        // Standardize the Supabase error message for unregistered users
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

    // Only turn off the loading spinner if we failed. 
    // If successful, let it spin while the browser redirects!
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
        setMode('verify'); // Switch to Success screen
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
    <div className="animate-fade" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--color-surface-950)', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Dynamic Background Orbs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="animate-float" style={{ 
          position: 'absolute', top: '-10%', left: '10%', width: '500px', height: '500px', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)', animationDuration: '10s'
        }}></div>
        <div className="animate-pulse" style={{ 
          position: 'absolute', top: '40%', left: '50%', width: '800px', height: '800px', transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 60%)', filter: 'blur(100px)', animationDuration: '8s'
        }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '2rem' }}>
        
        <div style={{ 
          padding: '3rem', 
          background: 'var(--color-surface-900)', 
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--color-border)', 
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)' 
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-surface-100)', margin: 0 }}>
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Workspace' : mode === 'reset' ? 'Reset Password' : 'Check Email'}
            </h1>
            <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
              {mode === 'login' ? 'Enter your credentials to access the vault.' : 
               mode === 'register' ? 'Use your corporate email to join.' : 
               mode === 'reset' ? 'Enter your email to receive a recovery link.' :
               'Check your inbox for the secure link.'}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#fca5a5', padding: '0.875rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                <span style={{ color: '#818cf8', fontSize: '0.8125rem', cursor: 'pointer' }} onClick={() => setMode('reset')}>
                  Forgot Password?
                </span>
              </div>
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Authenticating...' : 'Sign In'}</button>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '1rem' }}>
                New company? <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('register')}>Register here</span>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
              <input type="email" placeholder="Work Email (e.g. name@company.com)" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Secure Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Creating...' : 'Continue'}</button>
              <p style={{ textAlign: 'center', color: 'var(--color-surface-400)', fontSize: '0.875rem', marginTop: '1rem' }}>
                Already have an account? <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('login')}>Sign In</span>
              </p>
            </form>
          )}

            {mode === 'verify' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
              <h2 style={{ color: 'var(--color-surface-100)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Check Your Email</h2>
              <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
                We've sent a secure link to <strong>{email}</strong>. <br/><br/>
                Click the link in the email to securely verify your identity!
              </p>
              <button 
                onClick={() => setMode('login')} 
                style={{ ...buttonStyle, background: 'var(--color-surface-800)', marginTop: '2rem' }}>
                Back to Sign In
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Sending...' : 'Send Recovery Link'}</button>
              <p style={{ textAlign: 'center', color: 'var(--color-surface-400)', fontSize: '0.875rem', marginTop: '1rem' }}>
                Remembered it? <span style={{ color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('login')}>Sign In</span>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: 'var(--color-surface-800)', border: '1px solid var(--color-border)',
  borderRadius: '12px', padding: '1rem', fontSize: '1rem', color: 'var(--color-surface-100)', outline: 'none'
};

const buttonStyle = {
  width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem',
  background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white', border: 'none',
  borderRadius: '12px', cursor: 'pointer'
};
