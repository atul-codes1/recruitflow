'use client';

import { useState } from 'react';

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) return;

    setLoading(true);
    setError('');
    setResults(null);
    setMeta(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Search failed. Please try again.');
        return;
      }

      setResults(data.results || []);
      setMeta({
        total_candidates: data.total_candidates,
        matches_found: data.matches_found,
        query: data.query,
      });
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    'Java developer with 3+ years experience',
    'React frontend engineer from Pune',
    'DevOps with AWS and Kubernetes',
    'Freshers with Python or Machine Learning',
    'Full stack developer with Node.js and MongoDB',
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🧠</span>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-outfit, var(--font-display))',
            background: 'linear-gradient(135deg, #a5b4fc, #818cf8, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            AI Resume Search
          </h1>
        </div>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9375rem', maxWidth: '500px', margin: '0 auto' }}>
          Search your entire candidate database using natural language. Just describe what you&apos;re looking for.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
        <div style={{ 
          position: 'relative',
          background: 'var(--bg-card)',
          border: '2px solid var(--border-med)',
          borderRadius: 'var(--radius-xl)',
          padding: '0.25rem',
          transition: 'all 0.3s ease',
          boxShadow: loading ? '0 0 30px rgba(99, 102, 241, 0.2)' : 'var(--shadow-glass)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem', paddingLeft: '1rem', opacity: 0.6 }}>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Find me Java developers with 3+ years in Pune..."
              style={{
                flex: 1,
                padding: '1rem 0.5rem',
                fontSize: '1rem',
                color: 'var(--color-surface-100)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim() || query.trim().length < 3}
              className="btn-primary"
              style={{ 
                borderRadius: 'calc(var(--radius-xl) - 4px)', 
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                opacity: loading || !query.trim() || query.trim().length < 3 ? 0.5 : 1,
                cursor: loading ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="animate-pulse">⚡</span> Searching...
                </span>
              ) : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {/* Example Queries */}
      {!results && !loading && !error && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-surface-500)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Try asking:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {exampleQueries.map((eq, i) => (
              <button
                key={i}
                onClick={() => setQuery(eq)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  color: 'var(--color-surface-300)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  e.currentTarget.style.color = 'var(--color-surface-100)';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.color = 'var(--color-surface-300)';
                  e.currentTarget.style.background = 'var(--bg-subtle)';
                }}
              >
                &quot;{eq}&quot;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="animate-pulse" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <p style={{ color: 'var(--color-surface-300)', fontSize: '1rem', fontWeight: 500 }}>
            AI is analyzing {meta?.total_candidates || 'all'} candidates...
          </p>
          <p style={{ color: 'var(--color-surface-500)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            Understanding context, matching skills, ranking relevance
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card" style={{ 
          borderColor: 'rgba(239, 68, 68, 0.3)', 
          background: 'rgba(239, 68, 68, 0.05)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p style={{ color: '#fca5a5', marginTop: '0.75rem', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          {/* Results Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.125rem' }}>{meta?.matches_found || 0}</span>
              <span style={{ color: 'var(--color-surface-300)', fontSize: '0.875rem' }}>
                match{meta?.matches_found !== 1 ? 'es' : ''} found
              </span>
            </div>
            <span style={{ color: 'var(--color-surface-500)', fontSize: '0.75rem' }}>
              out of {meta?.total_candidates || 0} total candidates
            </span>
          </div>

          {results.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', borderStyle: 'dashed' }}>
              <span style={{ fontSize: '2.5rem' }}>🤷</span>
              <h3 style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--color-surface-200)' }}>
                No matching candidates found
              </h3>
              <p style={{ color: 'var(--color-surface-400)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Try broadening your search or using different keywords.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className="card"
                  style={{ 
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {/* Score Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '16px',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: r.score >= 80 ? 'linear-gradient(135deg, #10b981, #059669)' 
                              : r.score >= 50 ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                              : 'linear-gradient(135deg, #6b7280, #4b5563)',
                    color: '#fff',
                    boxShadow: r.score >= 80 ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                  }}>
                    {r.score}% Match
                  </div>

                  {/* Top Row: Name + Title */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-surface-100)' }}>
                          #{i + 1}
                        </span>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-surface-100)', margin: 0 }}>
                          {r.candidate_name}
                        </h3>
                      </div>
                      {(r.current_title || r.current_company) && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-surface-400)', margin: 0 }}>
                          {r.current_title}{r.current_title && r.current_company ? ' at ' : ''}{r.current_company}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {r.drive_web_url && (
                        <a href={r.drive_web_url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                          📄 View Resume
                        </a>
                      )}
                    </div>
                  </div>

                  {/* AI Reason */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(99, 102, 241, 0.06)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ color: '#8b5cf6', flexShrink: 0 }}>✨</span>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-surface-200)', margin: 0, lineHeight: 1.5 }}>
                        {r.reason}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                    {r.candidate_email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-surface-300)' }}>
                        <span style={{ opacity: 0.7 }}>📧</span> {r.candidate_email}
                      </div>
                    )}
                    {r.candidate_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-surface-300)' }}>
                        <span style={{ opacity: 0.7 }}>📱</span> {(r.candidate_phone || '').replace(/\n/g, '').trim()}
                      </div>
                    )}
                    {r.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-surface-300)' }}>
                        <span style={{ opacity: 0.7 }}>📍</span> {r.location}
                      </div>
                    )}
                    {(r.experience_years !== null && r.experience_years !== undefined) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-surface-300)' }}>
                        <span style={{ opacity: 0.7 }}>⏳</span> {r.experience_years} years experience
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#93c5fd' }}>
                      <span style={{ opacity: 0.7 }}>💼</span> Applied for: {r.job_title}
                    </div>
                  </div>

                  {/* Skills */}
                  {r.skills && r.skills.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {r.skills.slice(0, 12).map((skill, si) => (
                        <span key={si} style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.6875rem',
                          borderRadius: '4px',
                          background: 'var(--badge-purple-bg)',
                          color: 'var(--badge-purple-text)',
                          border: '1px solid var(--badge-purple-border)',
                        }}>
                          {skill}
                        </span>
                      ))}
                      {r.skills.length > 12 && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-surface-500)', alignSelf: 'center' }}>
                          +{r.skills.length - 12} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
