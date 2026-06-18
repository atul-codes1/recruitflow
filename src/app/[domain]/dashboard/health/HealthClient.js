'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HealthClient({ role }) {
  const [data, setData] = useState({ counts: {}, errors: [], apiKeys: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Key Vault State
  const [newKeysText, setNewKeysText] = useState('');
  const [isAddingKeys, setIsAddingKeys] = useState(false);
  const [keyProvider, setKeyProvider] = useState('groq');

  const router = useRouter();

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
      const json = await res.json();
      if (json.success) {
        setData({ counts: json.counts, errors: json.errors, apiKeys: json.apiKeys || [] });
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

  const handleAddKeys = async () => {
    if (!newKeysText.trim()) return;
    const keyArray = newKeysText.split(',').map(k => k.trim()).filter(k => k.length > 10);
    if (keyArray.length === 0) return alert('No valid keys found.');

    try {
      setIsAddingKeys(true);
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_keys',
          keys: keyArray.map(k => ({ provider: keyProvider, key_value: k }))
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setNewKeysText('');
        fetchHealth();
      } else {
        alert('Failed: ' + json.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsAddingKeys(false);
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

  // Live Trackers
  const qstashUsed = Math.min(totalApps, 1000);
  const qstashPct = (qstashUsed / 1000) * 100;
  
  // Calculate live Groq and Gemini usage across all keys
  const groqKeys = data.apiKeys.filter(k => k.provider === 'groq');
  const geminiKeys = data.apiKeys.filter(k => k.provider === 'gemini');

  const groqTotalLimit = groqKeys.length * 14400;
  const groqTotalUsed = groqKeys.reduce((sum, k) => sum + (k.usage_count || 0), 0);
  const groqPct = groqTotalLimit > 0 ? Math.min((groqTotalUsed / groqTotalLimit) * 100, 100) : 0;

  const geminiTotalLimit = geminiKeys.length * 1500;
  const geminiTotalUsed = geminiKeys.reduce((sum, k) => sum + (k.usage_count || 0), 0);
  const geminiPct = geminiTotalLimit > 0 ? Math.min((geminiTotalUsed / geminiTotalLimit) * 100, 100) : 0;

  const driveUsed = totalApps;
  const drivePct = Math.min((driveUsed / 100000) * 100, 100); 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── METRICS COMMAND CENTER ── */}
      <div className="animate-slide-up stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card hover-lift" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Processed</h3>
          <p style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-surface-100)', marginTop: '0.5rem', lineHeight: 1 }}>{data.counts.completed || 0}</p>
        </div>
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>In Queue</h3>
          <p style={{ fontSize: '3rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.5rem', lineHeight: 1 }}>{data.counts.queued || 0}</p>
        </div>
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>☁️</div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Uploading</h3>
          <p style={{ fontSize: '3rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.5rem', lineHeight: 1 }}>{data.counts.uploading || 0}</p>
        </div>
        <div className="card hover-lift" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderColor: data.counts.failed > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-light)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>🛑</div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>AI Failures</h3>
          <p style={{ fontSize: '3rem', fontWeight: 700, color: '#ef4444', marginTop: '0.5rem', lineHeight: 1 }}>{data.counts.failed || 0}</p>
        </div>
      </div>

      {/* ── QUEUE MANAGEMENT ACTIONS ── */}
      <div className="card animate-slide-up stagger-2" style={{ padding: '2rem' }}>
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
      <div className="card animate-slide-up stagger-3" style={{ padding: '2rem' }}>
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
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-200)' }}>
                Groq API (Live Pool: {groqKeys.length} keys)
              </span>
              <span style={{ fontSize: '0.875rem', color: groqPct >= 100 ? '#ef4444' : 'var(--color-surface-400)' }}>
                {groqTotalUsed.toLocaleString()} / {groqTotalLimit > 0 ? groqTotalLimit.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: groqPct >= 100 ? '#ef4444' : '#8b5cf6', width: `${groqPct}%`, transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>

          {/* Gemini */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-surface-200)' }}>
                Gemini API (Live Pool: {geminiKeys.length} keys)
              </span>
              <span style={{ fontSize: '0.875rem', color: geminiPct >= 100 ? '#ef4444' : 'var(--color-surface-400)' }}>
                {geminiTotalUsed.toLocaleString()} / {geminiTotalLimit > 0 ? geminiTotalLimit.toLocaleString() : 'N/A'}
              </span>
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

      {/* ── KEY VAULT (LOAD BALANCER MGR) ── */}
      <div className="card animate-slide-up stagger-4" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>🔑 The Key Vault</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', marginBottom: '1.5rem' }}>
          Add multiple API keys to increase your daily limits. The system will automatically round-robin between them and rotate exhausted keys.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
              value={keyProvider} 
              onChange={(e) => setKeyProvider(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--color-surface-100)', border: '1px solid var(--border-med)' }}
            >
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
            </select>
            <input 
              type="text" 
              placeholder="Paste comma-separated keys here..." 
              value={newKeysText}
              onChange={(e) => setNewKeysText(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--color-surface-100)', border: '1px solid var(--border-med)' }}
            />
            <button 
              onClick={handleAddKeys}
              disabled={isAddingKeys || !newKeysText.trim()}
              style={{
                padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 600,
                background: 'var(--color-primary-500)', color: '#fff', border: 'none', cursor: 'pointer',
                opacity: (isAddingKeys || !newKeysText.trim()) ? 0.5 : 1
              }}
            >
              {isAddingKeys ? 'Adding...' : 'Add Keys'}
            </button>
          </div>
        </div>

        {/* Live Key Status Table */}
        <div className="table-container responsive-table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Key (Hidden)</th>
                <th>Status</th>
                <th>Usage Count</th>
                <th>Reset Time</th>
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem 0' }}>No keys in the vault. System uses fallback .env.</td></tr>
              ) : (
                data.apiKeys.map(k => (
                  <tr key={k.id} className="hover-row">
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{k.provider}</td>
                    <td>{k.key_value.substring(0, 4)}••••••••••{k.key_value.slice(-4)}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                        background: k.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : k.status === 'exhausted' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: k.status === 'active' ? '#10b981' : k.status === 'exhausted' ? '#f59e0b' : '#ef4444'
                      }}>
                        {k.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{k.usage_count}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-surface-400)' }}>
                      {k.reset_time ? new Date(k.reset_time).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── INTELLIGENT ERROR LOGS ── */}
      <div className="card animate-slide-up stagger-5" style={{ padding: '2rem' }}>
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
