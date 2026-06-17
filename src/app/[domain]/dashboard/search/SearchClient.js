'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const MapPinIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const GraduationIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const UserIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ChevronDownIcon = ({ open }) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
  </svg>
);
const ExternalLinkIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const FilterIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#94a3b8';
  const bg = score >= 80 ? 'rgba(34,197,94,0.12)' : score >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.1)';
  const border = score >= 80 ? 'rgba(34,197,94,0.3)' : score >= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.2)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '4px 10px', borderRadius: '20px',
      background: bg, border: `1px solid ${border}`,
      color, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      {score}% Match
    </div>
  );
}

// ─── Filter Section ───────────────────────────────────────────────────────────
function FilterSection({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-surface-200)', fontSize: '0.8125rem', fontWeight: 600,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: 'var(--color-primary-400)' }}>{icon}</span>
          {title}
        </span>
        <ChevronDownIcon open={open} />
      </button>
      {open && <div style={{ padding: '4px 16px 14px' }}>{children}</div>}
    </div>
  );
}

// ─── Checkbox Option ──────────────────────────────────────────────────────────
function CheckOption({ label, checked, onChange, count }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
      cursor: 'pointer', color: checked ? 'var(--color-surface-100)' : 'var(--color-surface-400)',
      fontSize: '0.8125rem', transition: 'color 0.15s',
    }}>
      <div
        onClick={onChange}
        style={{
          width: 15, height: 15, borderRadius: 3, flexShrink: 0,
          border: checked ? '2px solid var(--color-primary-500)' : '2px solid var(--border-med)',
          background: checked ? 'var(--color-primary-500)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', cursor: 'pointer',
        }}
      >
        {checked && (
          <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        )}
      </div>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: '0.7rem', color: 'var(--color-surface-500)', background: 'var(--bg-subtle)', padding: '1px 6px', borderRadius: 10 }}>
          {count}
        </span>
      )}
    </label>
  );
}

// ─── Candidate Card ───────────────────────────────────────────────────────────
function CandidateCard({ result, rank, query }) {
  const queryWords = (query || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const highlightSkill = (skill) => {
    const isMatch = queryWords.some(w => skill.toLowerCase().includes(w));
    return isMatch;
  };

  return (
    <div
      className="resdex-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: '10px',
        padding: '18px 20px',
        marginBottom: '10px',
        transition: 'all 0.2s ease',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {/* Rank + Score Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
          {/* Rank */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: rank <= 3 ? 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))' : 'var(--bg-subtle)',
            border: rank <= 3 ? 'none' : '1px solid var(--border-med)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700,
            color: rank <= 3 ? 'white' : 'var(--color-surface-500)',
            boxShadow: rank <= 3 ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
          }}>
            {rank}
          </div>
          {/* Name + Role */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-surface-100)' }}>
                {result.candidate_name || 'Unnamed Candidate'}
              </h3>
              {result.seniority && (
                <span style={{ fontSize: '0.6875rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)', fontWeight: 600 }}>
                  {result.seniority}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
              {result.current_title && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--color-surface-300)', fontWeight: 500 }}>
                  <BriefcaseIcon />
                  {result.current_title}
                  {result.current_company && <span style={{ color: 'var(--color-surface-500)' }}> at {result.current_company}</span>}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Score + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <ScoreBadge score={result.score} />
          <div style={{ display: 'flex', gap: 6 }}>
            {result.drive_web_url && (
              <a
                href={result.drive_web_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                  color: 'var(--color-primary-300)', textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <ExternalLinkIcon /> View Resume
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Meta row: location, exp, degree */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
        {result.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>
            <MapPinIcon /> {result.location}
          </span>
        )}
        {result.experience_years !== null && result.experience_years !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>
            <ClockIcon /> {result.experience_years} yrs exp
          </span>
        )}
        {result.degrees && result.degrees.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>
            <GraduationIcon /> {result.degrees[0]}
          </span>
        )}
        {result.candidate_email && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>
            <UserIcon /> {result.candidate_email}
          </span>
        )}
      </div>

      {/* AI Reasoning */}
      {result.reason && (
        <div style={{
          padding: '8px 12px', borderRadius: 7, marginBottom: 10,
          background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)',
          display: 'flex', alignItems: 'flex-start', gap: 7,
        }}>
          <span style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }}><SparkleIcon /></span>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-surface-300)', lineHeight: 1.5 }}>
            {result.reason}
          </p>
        </div>
      )}

      {/* Skills */}
      {result.skills && result.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {result.skills.slice(0, 14).map((skill, i) => {
            const matched = highlightSkill(skill);
            return (
              <span key={i} style={{
                padding: '3px 8px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500,
                background: matched ? 'rgba(99,102,241,0.18)' : 'var(--bg-subtle)',
                border: matched ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border-light)',
                color: matched ? 'var(--color-primary-300)' : 'var(--color-surface-400)',
              }}>
                {skill}
              </span>
            );
          })}
          {result.skills.length > 14 && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-surface-500)', alignSelf: 'center', paddingLeft: 2 }}>
              +{result.skills.length - 14} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);

  // Sidebar filter state
  const [expMin, setExpMin] = useState('');
  const [expMax, setExpMax] = useState('');
  const [selectedSeniority, setSelectedSeniority] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDegreeLevel, setSelectedDegreeLevel] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const inputRef = useRef(null);

  const SENIORITY_OPTIONS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead', 'Executive'];
  const LOCATION_OPTIONS  = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];
  const DEGREE_LEVELS     = ['Undergraduate', 'Postgraduate', 'Doctorate', 'Diploma'];

  const toggleArr = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  // Build query with sidebar refinements appended
  const buildQuery = () => {
    let q = query.trim();
    if (expMin || expMax) {
      if (expMin && expMax) q += ` ${expMin}-${expMax} years`;
      else if (expMin) q += ` ${expMin}+ years`;
      else q += ` max ${expMax} years`;
    }
    if (selectedLocations.length)   q += ` in ${selectedLocations.join(' or ')}`;
    if (selectedSeniority.length)   q += ` ${selectedSeniority.join(' or ')} level`;
    if (selectedDegreeLevel.length) q += ` ${selectedDegreeLevel.join(' or ')} degree`;
    return q;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const finalQuery = buildQuery();
    if (!finalQuery || finalQuery.length < 2) return;

    setLoading(true);
    setError('');
    setResults(null);
    setMeta(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed. Please try again.');
        return;
      }
      setResults(data.results || []);
      setMeta({
        total_candidates: data.total_candidates,
        matches_found:    data.matches_found,
        query:            data.query,
        extracted_filters: data.extracted_filters || null,
      });
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setExpMin(''); setExpMax('');
    setSelectedSeniority([]); setSelectedLocations([]); setSelectedDegreeLevel([]);
    setQuery('');
    setResults(null); setMeta(null); setError('');
  };

  const activeFilterCount = [
    expMin || expMax ? 1 : 0,
    selectedSeniority.length,
    selectedLocations.length,
    selectedDegreeLevel.length,
  ].reduce((a, b) => a + b, 0);

  const exampleQueries = [
    'IT Recruiter with sourcing experience',
    'Java developer 5+ years Delhi NCR',
    'React frontend engineer Bangalore',
    'MBA fresher in HR',
    'Python data analyst Hyderabad',
  ];

  // ─── SIDEBAR ───────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside style={{
      width: 250, flexShrink: 0,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 12, height: 'fit-content',
      position: 'sticky', top: 80, overflow: 'hidden',
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-surface-200)' }}>
          <FilterIcon />
          Refine Results
          {activeFilterCount > 0 && (
            <span style={{ background: 'var(--color-primary-500)', color: 'white', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
              {activeFilterCount}
            </span>
          )}
        </span>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-surface-500)', fontSize: '0.75rem', padding: 0 }}>
            Clear all
          </button>
        )}
      </div>

      {/* Experience Range */}
      <FilterSection title="Experience" icon={<ClockIcon />} defaultOpen={true}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number" min="0" max="40" value={expMin}
            onChange={e => setExpMin(e.target.value)}
            placeholder="Min"
            style={{
              width: '50%', padding: '6px 8px', borderRadius: 6,
              background: 'var(--bg-subtle)', border: '1px solid var(--border-med)',
              color: 'var(--color-surface-100)', fontSize: '0.8rem', outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <span style={{ color: 'var(--color-surface-500)', fontSize: '0.75rem' }}>to</span>
          <input
            type="number" min="0" max="40" value={expMax}
            onChange={e => setExpMax(e.target.value)}
            placeholder="Max"
            style={{
              width: '50%', padding: '6px 8px', borderRadius: 6,
              background: 'var(--bg-subtle)', border: '1px solid var(--border-med)',
              color: 'var(--color-surface-100)', fontSize: '0.8rem', outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
        <p style={{ margin: '5px 0 0', fontSize: '0.7rem', color: 'var(--color-surface-500)' }}>Years of experience</p>
      </FilterSection>

      {/* Seniority */}
      <FilterSection title="Seniority Level" icon={<UserIcon />} defaultOpen={true}>
        {SENIORITY_OPTIONS.map(s => (
          <CheckOption key={s} label={s} checked={selectedSeniority.includes(s)}
            onChange={() => toggleArr(selectedSeniority, setSelectedSeniority, s)} />
        ))}
      </FilterSection>

      {/* Location */}
      <FilterSection title="Location" icon={<MapPinIcon />} defaultOpen={true}>
        {LOCATION_OPTIONS.map(l => (
          <CheckOption key={l} label={l} checked={selectedLocations.includes(l)}
            onChange={() => toggleArr(selectedLocations, setSelectedLocations, l)} />
        ))}
      </FilterSection>

      {/* Education */}
      <FilterSection title="Education Level" icon={<GraduationIcon />} defaultOpen={false}>
        {DEGREE_LEVELS.map(d => (
          <CheckOption key={d} label={d} checked={selectedDegreeLevel.includes(d)}
            onChange={() => toggleArr(selectedDegreeLevel, setSelectedDegreeLevel, d)} />
        ))}
      </FilterSection>
    </aside>
  );

  return (
    <>
      {/* ─── Scoped Styles ─── */}
      <style>{`
        .resdex-card:hover {
          border-color: rgba(99,102,241,0.3) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          transform: translateY(-1px) !important;
        }
        .resdex-search-input:focus-within {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
        }
        .resdex-example:hover {
          background: rgba(99,102,241,0.08) !important;
          border-color: rgba(99,102,241,0.3) !important;
          color: var(--color-surface-100) !important;
        }
        @media (max-width: 768px) {
          .resdex-layout { flex-direction: column !important; }
          .resdex-sidebar { display: none; }
          .resdex-sidebar.open { display: block !important; width: 100% !important; position: static !important; }
        }
        @keyframes resdex-spin {
          to { transform: rotate(360deg); }
        }
        .resdex-spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: resdex-spin 0.7s linear infinite;
        }
        @keyframes resdex-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .resdex-skeleton {
          background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--border-light) 50%, var(--bg-subtle) 75%);
          background-size: 200% 100%;
          animation: resdex-shimmer 1.5s infinite;
          border-radius: 6px;
        }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        {/* ─── Top Search Bar ─── */}
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-light)',
          padding: '16px 24px',
          position: 'sticky', top: 0, zIndex: 10,
          backdropFilter: 'blur(8px)',
        }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 900, margin: '0 auto' }}>
              {/* AI Badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                padding: '6px 10px', borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                <SparkleIcon /> AI
              </div>

              {/* Search Input */}
              <div
                className="resdex-search-input"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-subtle)', border: '1.5px solid var(--border-med)',
                  borderRadius: 9, padding: '0 14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: 'var(--color-surface-500)', flexShrink: 0 }}><SearchIcon /></span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. IT Recruiter with sourcing experience in Delhi NCR…"
                  style={{
                    flex: 1, padding: '10px 0', background: 'none', border: 'none',
                    outline: 'none', color: 'var(--color-surface-100)',
                    fontSize: '0.9rem', fontFamily: 'var(--font-sans)',
                  }}
                  disabled={loading}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-surface-500)', padding: 0, display: 'flex' }}>
                    <XIcon />
                  </button>
                )}
              </div>

              {/* Search Button */}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-primary"
                style={{
                  padding: '10px 22px', borderRadius: 9, fontSize: '0.875rem',
                  opacity: loading || !query.trim() ? 0.5 : 1,
                  cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap', gap: 7,
                }}
              >
                {loading ? <div className="resdex-spinner" /> : <SearchIcon />}
                {loading ? 'Searching…' : 'Search'}
              </button>

              {/* Mobile filter toggle */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(o => !o)}
                style={{
                  display: 'none',
                  padding: '10px', borderRadius: 9, background: 'var(--bg-subtle)',
                  border: '1.5px solid var(--border-med)', cursor: 'pointer',
                  color: 'var(--color-surface-300)', flexShrink: 0,
                }}
                className="mobile-only-flex"
              >
                <FilterIcon />
              </button>
            </div>
          </form>

          {/* Active Filter Tags */}
          {(activeFilterCount > 0 || meta?.extracted_filters) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, maxWidth: 900, margin: '10px auto 0' }}>
              {expMin && <ActiveTag label={`Exp ≥ ${expMin} yrs`} onRemove={() => setExpMin('')} />}
              {expMax && <ActiveTag label={`Exp ≤ ${expMax} yrs`} onRemove={() => setExpMax('')} />}
              {selectedSeniority.map(s => <ActiveTag key={s} label={s} onRemove={() => toggleArr(selectedSeniority, setSelectedSeniority, s)} />)}
              {selectedLocations.map(l => <ActiveTag key={l} label={l} onRemove={() => toggleArr(selectedLocations, setSelectedLocations, l)} />)}
              {selectedDegreeLevel.map(d => <ActiveTag key={d} label={d} onRemove={() => toggleArr(selectedDegreeLevel, setSelectedDegreeLevel, d)} />)}
              {meta?.extracted_filters?.job_title_hint && (
                <ActiveTag label={`Role: ${meta.extracted_filters.job_title_hint}`} color="indigo" readOnly />
              )}
              {meta?.extracted_filters?.must_have_skills?.map(s => (
                <ActiveTag key={s} label={`Skill: ${s}`} color="indigo" readOnly />
              ))}
            </div>
          )}
        </div>

        {/* ─── Body: Sidebar + Results ─── */}
        <div
          className="resdex-layout"
          style={{ display: 'flex', gap: 20, padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}
        >
          {/* Sidebar */}
          <div className={`resdex-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
            <Sidebar />
          </div>

          {/* Main Results */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Empty State (before first search) */}
            {!results && !loading && !error && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                  border: '1.5px solid rgba(99,102,241,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem',
                }}>
                  🔍
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-surface-200)' }}>
                  Search your candidate database
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: '0.875rem', color: 'var(--color-surface-500)', maxWidth: 420, margin: '0 auto 28px' }}>
                  Describe the candidate you need in plain English. AI will understand context, synonyms, and find the best matches.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {exampleQueries.map((q, i) => (
                    <button
                      key={i}
                      className="resdex-example"
                      onClick={() => { setQuery(q); setTimeout(() => inputRef.current?.focus(), 100); }}
                      style={{
                        padding: '7px 14px', borderRadius: 20,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border-med)',
                        color: 'var(--color-surface-400)', cursor: 'pointer',
                        fontSize: '0.8125rem', transition: 'all 0.15s',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 0' }}>
                  <div className="resdex-spinner" style={{ borderTopColor: 'var(--color-primary-400)', borderColor: 'var(--border-med)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>
                    AI is analyzing candidates…
                  </span>
                </div>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 18, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div className="resdex-skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="resdex-skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
                        <div className="resdex-skeleton" style={{ height: 13, width: '60%', marginBottom: 12 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[80, 60, 70].map((w, j) => (
                            <div key={j} className="resdex-skeleton" style={{ height: 22, width: w }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: '16px 20px', borderRadius: 10,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#fca5a5', fontSize: '0.875rem' }}>Search Error</p>
                  <p style={{ margin: 0, color: '#fca5a5', opacity: 0.8, fontSize: '0.8125rem' }}>{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div>
                {/* Results Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-light)',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-surface-100)' }}>
                      {meta?.matches_found || 0}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', marginLeft: 6 }}>
                      candidate{meta?.matches_found !== 1 ? 's' : ''} found
                    </span>
                    {meta?.total_candidates && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-surface-500)', marginLeft: 6 }}>
                        out of {meta.total_candidates} total
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-500)' }}>Sorted by</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      color: 'var(--color-primary-300)',
                    }}>
                      AI Relevance
                    </span>
                  </div>
                </div>

                {results.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: 'var(--bg-card)', borderRadius: 12, border: '1px dashed var(--border-med)',
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤷</div>
                    <h3 style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '1rem', color: 'var(--color-surface-200)' }}>
                      No matching candidates found
                    </h3>
                    <p style={{ margin: 0, color: 'var(--color-surface-500)', fontSize: '0.875rem' }}>
                      Try different keywords or broaden your search criteria.
                    </p>
                  </div>
                ) : (
                  results.map((r, i) => (
                    <CandidateCard key={r.id} result={r} rank={i + 1} query={meta?.query || ''} />
                  ))
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Active Filter Tag ────────────────────────────────────────────────────────
function ActiveTag({ label, onRemove, color = 'default', readOnly = false }) {
  const isIndigo = color === 'indigo';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: isIndigo ? 'rgba(99,102,241,0.1)' : 'var(--bg-subtle)',
      border: isIndigo ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border-med)',
      color: isIndigo ? 'var(--color-primary-300)' : 'var(--color-surface-300)',
      fontSize: '0.75rem', fontWeight: 500,
    }}>
      {label}
      {!readOnly && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit', opacity: 0.6 }}
        >
          <XIcon />
        </button>
      )}
    </span>
  );
}
