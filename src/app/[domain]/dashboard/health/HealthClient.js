'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HealthClient({ role }) {
  const [data, setData] = useState({ counts: {}, errors: [], todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const router = useRouter();

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      if (json.success) {
        setData({ counts: json.counts, errors: json.errors, todayCount: json.todayCount || 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 5 seconds for real-time vibe
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (actionType) => {
    if (actionType === 'purge_queue') {
      if (!confirm('WARNING: This will permanently delete all unparsed resumes currently in the queue. Are you sure?')) return;
    }
    
    try {
      setActionLoading(actionType);
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchHealth(); // refresh data immediately
      } else {
        alert('Action failed: ' + json.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && Object.keys(data.counts).length === 0) {
    return (
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 160, flex: '1 1 200px', borderRadius: 24 }}></div>)}
      </div>
    );
  }

  // Quota Math
  const todayCount = data.todayCount || 0;
  const totalApps = (data.counts.completed || 0) + (data.counts.queued || 0) + (data.counts.failed || 0) + (data.counts.uploading || 0);

  const quotas = [
    { name: 'Upstash Worker', used: Math.min(todayCount, 1000), total: 1000, color: '#10b981', icon: '⚡' },
    { name: 'Groq LLaMA 3', used: Math.min(todayCount, 14400), total: 14400, color: '#f59e0b', icon: '🧠' },
    { name: 'Gemini Vision', used: Math.min(todayCount, 1500), total: 1500, color: '#8b5cf6', icon: '👁️' },
    { name: 'Cloud Storage', used: totalApps, total: 100000, color: '#3b82f6', icon: '☁️' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ── HEADER & ACTIONS ROW ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-surface-100)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            System Health
          </h1>
          <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9375rem' }}>
            Real-time infrastructure monitoring and automated queue resolution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
          <button 
            onClick={async () => {
              setActionLoading('process_queue');
              try {
                const res = await fetch('/api/cron/process-queue', { method: 'POST' });
                const json = await res.json();
                if (json.success) {
                  fetchHealth();
                } else {
                  alert('Queue failed: ' + (json.error || 'Unknown error'));
                }
              } catch (err) {
                alert('Error: ' + err.message);
              } finally {
                setActionLoading(null);
              }
            }}
            disabled={actionLoading !== null || data.counts.queued === 0}
            className="hover-lift"
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: data.counts.queued === 0 ? 0.5 : 1,
              boxShadow: data.counts.queued > 0 ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            {actionLoading === 'process_queue' ? '⚡ Processing...' : `⚡ Process Queue (${data.counts.queued || 0})`}
          </button>
          
          <button 
            onClick={() => handleAction('retry_failed')}
            disabled={actionLoading !== null || data.counts.failed === 0}
            className="hover-lift"
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
              background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: data.counts.failed === 0 ? 0.5 : 1
            }}
          >
            {actionLoading === 'retry_failed' ? '🔄 Processing...' : '▶️ Retry Fails'}
          </button>

          <button 
            onClick={() => handleAction('purge_queue')}
            disabled={actionLoading !== null || (data.counts.queued === 0 && data.counts.uploading === 0)}
            className="hover-lift"
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
              background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (data.counts.queued === 0 && data.counts.uploading === 0) ? 0.5 : 1
            }}
          >
            🛑 Purge
          </button>
        </div>
      </div>

      {/* ── CORE METRICS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        
        {/* Total Processed */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: '1px solid var(--border-light)', borderRadius: '24px', padding: '1.25rem',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>✅</div>
            <h3 style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Processed</h3>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-surface-100)', lineHeight: 1, position: 'relative', zIndex: 1 }}>
              {data.counts.completed || 0}
            </p>
          </div>
        </div>

        {/* In Queue */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: '1px solid var(--border-light)', borderRadius: '24px', padding: '1.25rem',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>⏳</div>
            <h3 style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Queue</h3>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1, position: 'relative', zIndex: 1 }}>
              {data.counts.queued || 0}
            </p>
          </div>
        </div>

        {/* Uploading */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: '1px solid var(--border-light)', borderRadius: '24px', padding: '1.25rem',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>☁️</div>
            <h3 style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploading</h3>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1, position: 'relative', zIndex: 1 }}>
              {data.counts.uploading || 0}
            </p>
          </div>
        </div>

        {/* AI Failures */}
        <div style={{ 
          background: data.counts.failed > 0 ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.01))' : 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: data.counts.failed > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-light)', 
          borderRadius: '24px', padding: '1.25rem',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>🛑</div>
            <h3 style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Failures</h3>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444', lineHeight: 1, position: 'relative', zIndex: 1 }}>
              {data.counts.failed || 0}
            </p>
          </div>
        </div>

      </div>

      {/* ── LIVE API QUOTAS ── */}
      <div style={{ 
        background: 'var(--bg-card)', border: '1px solid var(--border-light)', 
        borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-surface-100)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
              <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#10b981', opacity: 0.75 }}></span>
              <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
            </span>
            Live API Quotas
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', marginTop: '0.25rem' }}>
            Real-time usage tracking against third-party API limits. Resets at midnight UTC.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {quotas.map((q, idx) => {
            const pct = Math.min((q.used / q.total) * 100, 100);
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{q.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-surface-200)' }}>{q.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-surface-400)', fontFamily: 'monospace' }}>
                    {q.used.toLocaleString()} / {q.total.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${pct}%`, 
                    background: q.color,
                    borderRadius: '9999px',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `0 0 10px ${q.color}`
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
