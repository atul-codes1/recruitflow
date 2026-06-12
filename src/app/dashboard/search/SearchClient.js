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
              {results.map((r, i) => {
                const isHighMatch = r.score >= 80;
                const isMedMatch = r.score >= 50 && r.score < 80;
                
                const scoreGradient = isHighMatch 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : isMedMatch ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                  : 'linear-gradient(135deg, #6b7280, #4b5563)';
                
                const scoreShadow = isHighMatch ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none';
                
                return (
                  <div
                    key={r.id}
                    className="hover-card-premium"
                    style={{ 
                      padding: '1.75rem',
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'rgba(30, 41, 59, 0.4)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 'var(--radius-xl)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px -4px rgba(0, 0, 0, 0.3), 0 0 15px rgba(99, 102, 241, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    {/* Left Color Accent */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: '4px',
                      background: scoreGradient,
                      boxShadow: scoreShadow
                    }}></div>

                    {/* Score Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '1.25rem',
                      right: '1.5rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      background: isHighMatch ? 'rgba(16, 185, 129, 0.15)' : isMedMatch ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      border: `1px solid ${isHighMatch ? 'rgba(16, 185, 129, 0.3)' : isMedMatch ? 'rgba(245, 158, 11, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                      color: isHighMatch ? '#34d399' : isMedMatch ? '#fbbf24' : '#9ca3af',
                      boxShadow: scoreShadow,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isHighMatch ? '#10b981' : isMedMatch ? '#f59e0b' : '#6b7280', boxShadow: scoreShadow }}></div>
                      {r.score}% MATCH
                    </div>

                    {/* Top Row: Name + Title */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', paddingRight: '100px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-surface-50)', margin: 0, letterSpacing: '-0.01em' }}>
                            {r.candidate_name || 'Anonymous Candidate'}
                          </h3>
                        </div>
                        {(r.current_title || r.current_company) && (
                          <p style={{ fontSize: '0.9rem', color: '#a5b4fc', margin: 0, fontWeight: 500 }}>
                            {r.current_title}{r.current_title && r.current_company ? ' at ' : ''}{r.current_company}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* AI Reason (Glass Box) */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      background: 'linear-gradient(to right, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.02))',
                      borderLeft: '2px solid rgba(99, 102, 241, 0.5)',
                      borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                      marginBottom: '1.25rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ color: '#818cf8', flexShrink: 0, fontSize: '1.1rem', marginTop: '-2px' }}>💡</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-200)', margin: 0, lineHeight: 1.6 }}>
                          {r.reason}
                        </p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-surface-300)' }}>
                        <span style={{ padding: '0.35rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>💼</span> 
                        <span style={{ color: 'var(--color-surface-100)', fontWeight: 500 }}>{r.job_title}</span>
                      </div>
                      {(r.experience_years !== null && r.experience_years !== undefined) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-surface-300)' }}>
                          <span style={{ padding: '0.35rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>⏳</span> 
                          <span style={{ color: 'var(--color-surface-100)', fontWeight: 500 }}>{r.experience_years} years exp</span>
                        </div>
                      )}
                      {r.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-surface-300)' }}>
                          <span style={{ padding: '0.35rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>📍</span> 
                          <span style={{ color: 'var(--color-surface-100)', fontWeight: 500 }}>{r.location}</span>
                        </div>
                      )}
                      {r.candidate_phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-surface-300)' }}>
                          <span style={{ padding: '0.35rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>📱</span> 
                          <span style={{ color: 'var(--color-surface-100)', fontWeight: 500 }}>{(r.candidate_phone || '').replace(/\n/g, '').trim()}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Skills & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Skills */}
                      <div style={{ flex: 1 }}>
                        {r.skills && r.skills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {r.skills.slice(0, 8).map((skill, si) => (
                              <span key={si} style={{
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                              }}>
                                {skill}
                              </span>
                            ))}
                            {r.skills.length > 8 && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-surface-400)', alignSelf: 'center', fontWeight: 500 }}>
                                +{r.skills.length - 8} more
                              </span>
                            )}
                          </div>
                        ) : <div></div>}
                      </div>

                      {/* Action Button */}
                      {r.drive_web_url && (
                        <a 
                          href={r.drive_web_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--color-surface-100)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-lg)',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          }}
                        >
                          View Resume <span style={{ opacity: 0.5 }}>↗</span>
                        </a>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
