'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/candidates');
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-950)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Dynamic Background Orbs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="animate-float" style={{ position: 'absolute', top: '-10%', left: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)', animationDuration: '10s' }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '2rem' }}>
        
        <div style={{ padding: '3rem', background: 'var(--color-surface-900)', backdropFilter: 'blur(24px)', border: '1px solid var(--color-border)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-surface-100)', margin: 0 }}>
              {success ? 'Vault Secured' : 'Update Password'}
            </h1>
            <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
              {success ? 'Your password has been successfully updated. Redirecting...' : 'Enter a new secure master password.'}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#fca5a5', padding: '0.875rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Updating...' : 'Save New Password'}</button>
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
