'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        // Success! Redirect to the dashboard
        router.push('/dashboard/candidates');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
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
      background: '#030712', // Deep rich space black
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Dynamic Background Orbs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="animate-float" style={{ 
          position: 'absolute', 
          top: '-10%', 
          left: '10%', 
          width: '500px', 
          height: '500px', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(80px)',
          animationDuration: '10s'
        }}></div>
        <div className="animate-float" style={{ 
          position: 'absolute', 
          bottom: '-15%', 
          right: '-5%', 
          width: '600px', 
          height: '600px', 
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(90px)',
          animationDuration: '14s',
          animationDelay: '1s'
        }}></div>
        <div className="animate-pulse" style={{ 
          position: 'absolute', 
          top: '40%', 
          left: '50%', 
          width: '800px', 
          height: '800px', 
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 60%)', 
          filter: 'blur(100px)',
          animationDuration: '8s'
        }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '2rem' }}>
        
        {/* Floating Brand Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.5rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '999px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-surface-200)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              System Secured
            </span>
          </div>
        </div>

        {/* Premium Glass Card */}
        <div style={{ 
          padding: '3rem', 
          background: 'rgba(17, 24, 39, 0.6)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 1.5rem',
              borderRadius: '20px', 
              background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: 800, 
              fontSize: '1.75rem', 
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              RF
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'white', margin: 0, lineHeight: 1.2 }}>
              Welcome Back
            </h1>
            <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
              Enter your master key to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                placeholder="Master Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                style={{ 
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1rem 1rem 1rem 3rem',
                  fontSize: '1rem',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.background = 'rgba(0, 0, 0, 0.5)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
              />
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
                🔒
              </div>
            </div>

            {error && (
              <div className="animate-in" style={{ 
                background: 'linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))', 
                borderLeft: '4px solid #ef4444', 
                color: '#fca5a5', 
                padding: '0.875rem', 
                borderRadius: '8px', 
                fontSize: '0.875rem', 
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                fontSize: '1rem', 
                fontWeight: 600,
                marginTop: '0.5rem',
                background: 'linear-gradient(to right, #6366f1, #a855f7)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 25px rgba(99, 102, 241, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.2)'; }}
              onMouseOut={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.2)'; }}
              onMouseDown={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(1px)'; }}
            >
              {loading ? (
                <>
                  <span className="animate-pulse">Authenticating...</span>
                </>
              ) : (
                <>
                  Access Vault <span style={{ fontSize: '1.25rem' }}>→</span>
                </>
              )}
            </button>

          </form>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: 'var(--color-surface-500)', fontSize: '0.8125rem' }}>
            Protected by RecruitFlow Auth Edge Network
          </p>
        </div>
      </div>
    </div>
  );
}
