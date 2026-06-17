'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HealthClient({ role }) {
  const [data, setData] = useState({ counts: {}, errors: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const router = useRouter();

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
      const json = await res.json();
      if (json.success) {
        setData({ counts: json.counts, errors: json.errors });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 10 seconds to keep stats live
    const interval = setInterval(fetchHealth, 10000);
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
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="skeleton" style={{ height: 120, width: '25%', borderRadius: 16 }}></div>
        <div className="skeleton" style={{ height: 120, width: '25%', borderRadius: 16 }}></div>
        <div className="skeleton" style={{ height: 120, width: '25%', borderRadius: 16 }}></div>
        <div className="skeleton" style={{ height: 120, width: '25%', borderRadius: 16 }}></div>
      </div>
    );
  }

  const totalApps = (data.counts.completed || 0) + (data.counts.queued || 0) + (data.counts.failed || 0) + (data.counts.uploading || 0);

  // Approximate Trackers (Based on daily counts - in a real app, you'd calculate today's specific uploads)
  // We use totalApps as a rough estimate for demo purposes of the progress bars
  const qstashUsed = Math.min(totalApps, 1000);
  const qstashPct = (qstashUsed / 1000) * 100;
  
  const groqUsed = Math.min(totalApps, 14400);
  const groqPct = (groqUsed / 14400) * 100;

  const geminiUsed = Math.min(totalApps, 1500); // OCR Fallbacks
  const geminiPct = (geminiUsed / 1500) * 100;

  const driveUsed = totalApps;
  const drivePct = Math.min((driveUsed / 100000) * 100, 100); // Huge limits typically

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── METRICS COMMAND CENTER ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Processed</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-surface-100)', marginTop: '0.5rem' }}>{data.counts.completed || 0}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Queue</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.5rem' }}>{data.counts.queued || 0}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploading</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.5rem' }}>{data.counts.uploading || 0}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Failures</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ef4444', marginTop: '0.5rem' }}>{data.counts.failed || 0}</p>
        </div>
      </div>

      {/* ── QUEUE MANAGEMENT ACTIONS ── */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '1rem' }}>Queue Operations</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          <button 
            onClick={() => handleAction('retry_failed')}
            disabled={actionLoading !== null || data.counts.failed === 0}
            style={{
              padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: data.counts.failed === 0 ? 0.5 : 1
            }}
          >
            {actionLoading === 'retry_failed' ? '🔄 Processing...' : '▶️ Retry Soft Failures'}
          </button>

          <button 
            onClick={() => handleAction('resync_uploading')}
            disabled={actionLoading !== null || data.counts.uploading === 0}
            style={{
              padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
              background: 'var(--bg-subtle)', color: 'var(--color-surface-200)', border: '1px solid var(--border-med)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: data.counts.uploading === 0 ? 0.5 : 1
            }}
          >
            {actionLoading === 'resync_uploading' ? '🔄 Syncing...' : '🔄 Re-Sync Stuck Uploads'}
          </button>

          <button 
            onClick={() => handleAction('purge_queue')}
            disabled={actionLoading !== null || (data.counts.queued === 0 && data.counts.uploading === 0)}
            style={{
              padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (data.counts.queued === 0 && data.counts.uploading === 0) ? 0.5 : 1
            }}
          >
            {actionLoading === 'purge_queue' ? '🛑 Purging...' : '🛑 Purge / Kill Queue'}
          </button>

        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', marginTop: '1rem' }}>
          <strong>Note:</strong> Retrying failures will automatically stagger requests to protect your API limits. Purging the queue is permanent.
        </p>
      </div>

      {/* ── UNIVERSAL API LIMIT TRACKERS ── */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '1.5rem' }}>Universal API Trackers (Daily Estimates)</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* QStash */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-200)' }}>Upstash QStash (Background Queue)</span>
              <span style={{ fontSize: '0.875rem', color: qstashPct >= 100 ? '#ef4444' : 'var(--color-surface-400)' }}>{qstashUsed.toLocaleString()} / 1,000</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: qstashPct >= 100 ? '#ef4444' : '#10b981', width: `${qstashPct}%`, transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>

          {/* Groq */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-200)' }}>Groq API (Primary High-Speed AI)</span>
              <span style={{ fontSize: '0.875rem', color: groqPct >= 100 ? '#ef4444' : 'var(--color-surface-400)' }}>{groqUsed.toLocaleString()} / 14,400</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: groqPct >= 100 ? '#ef4444' : '#8b5cf6', width: `${groqPct}%`, transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>

          {/* Gemini */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-200)' }}>Gemini API (Fallback & OCR Engine)</span>
              <span style={{ fontSize: '0.875rem', color: geminiPct >= 100 ? '#ef4444' : 'var(--color-surface-400)' }}>{geminiUsed.toLocaleString()} / 1,500</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: geminiPct >= 100 ? '#ef4444' : '#3b82f6', width: `${geminiPct}%`, transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>

          {/* Google Drive */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-200)' }}>Google Drive API (Storage)</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>{driveUsed.toLocaleString()} / 100,000+</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#6366f1', width: `${drivePct}%`, transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>

        </div>
      </div>

      {/* ── INTELLIGENT ERROR LOGS ── */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '1rem' }}>Intelligent Error Logs (Last 100 Failures)</h2>
        
        {data.errors.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-surface-400)', background: 'var(--bg-subtle)', borderRadius: 8 }}>
            ✅ No recent errors to display. Your system is healthy.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.errors.map((errGroup, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
                
                {/* Header Row */}
                <div style={{ 
                  background: 'var(--bg-subtle)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid var(--border-light)'
                }}>
                  <div>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, marginRight: '1rem',
                      background: errGroup.category.includes('Soft') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: errGroup.category.includes('Soft') ? '#f59e0b' : '#ef4444'
                    }}>
                      {errGroup.category}
                    </span>
                    <strong style={{ color: 'var(--color-surface-100)', fontSize: '0.9375rem' }}>{errGroup.message}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>
                    <strong>{errGroup.count}</strong> occurrences
                  </div>
                </div>

                {/* Example Files */}
                <div style={{ padding: '1rem', background: 'var(--bg-card)' }}>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-surface-500)', marginBottom: '0.5rem', fontWeight: 600 }}>Affected Files (Sample)</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {errGroup.examples.map(ex => (
                      <li key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--color-surface-200)' }}>📄 {ex.resume_filename || 'Unknown File'}</span>
                        <span style={{ color: 'var(--color-surface-500)' }}>{new Date(ex.updated_at).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                  {errGroup.count > 5 && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-surface-500)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      ...and {errGroup.count - 5} more.
                    </p>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
