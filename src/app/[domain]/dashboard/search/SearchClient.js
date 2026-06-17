'use client';

import { useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 14, stroke = 'currentColor', fill = 'none', sw = 2 }) => (
  <svg width={size} height={size} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const icons = {
  search:    <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
  x:         <path d="M18 6 6 18M6 6l12 12" strokeWidth="2.5"/>,
  filter:    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
  copy:      <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  check:     <path d="M20 6 9 17l-5-5" strokeWidth="2.5"/>,
  mail:      <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
  phone:     <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>,
  pin:       <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  grad:      <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
  brief:     <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>,
  clock:     <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  eye:       <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:   <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  spark:     <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>,
  link:      <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
  chevDown:  <path d="m6 9 6 6 6-6"/>,
  user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
};

// ─────────────────────────────────────────────────────────────────────────────
// COPY BUTTON — small inline button with "Copied!" feedback
// ─────────────────────────────────────────────────────────────────────────────
function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label || text}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '2px 7px', borderRadius: 4, border: 'none', cursor: 'pointer',
        fontSize: '0.68rem', fontWeight: 600, fontFamily: 'var(--font-sans)',
        background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.08)',
        color: copied ? '#4ade80' : 'var(--color-surface-500)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon d={copied ? icons.check : icons.copy} size={10} sw={copied ? 2.5 : 1.8} />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LABELED ROW — the Naukri-style label + value pair
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon, copyText, color, isSkills = false, skills = [] }) {
  if (!value && !isSkills) return null;
  if (isSkills && skills.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: 6 }}>
      {/* Label */}
      <div style={{
        width: 105, flexShrink: 0,
        fontSize: '0.75rem', color: 'var(--color-surface-500)',
        fontWeight: 600, paddingTop: 2, letterSpacing: '0.01em',
      }}>
        {label}
      </div>
      {/* Value */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
        {isSkills ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {skills.slice(0, 12).map((s, i) => (
              <span key={i} style={{
                padding: '2px 8px', borderRadius: 4,
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                color: 'var(--color-primary-300)', fontSize: '0.71rem', fontWeight: 500,
              }}>{s}</span>
            ))}
            {skills.length > 12 && (
              <span style={{ fontSize: '0.71rem', color: 'var(--color-surface-500)', alignSelf: 'center' }}>
                +{skills.length - 12} more
              </span>
            )}
          </div>
        ) : (
          <>
            <span style={{
              fontSize: '0.8rem',
              color: color || 'var(--color-surface-200)',
              lineHeight: 1.4,
              fontWeight: 500,
            }}>
              {value}
            </span>
            {copyText && <CopyBtn text={copyText} label={label} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH SCORE RING
// ─────────────────────────────────────────────────────────────────────────────
function MatchScore({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#94a3b8';
  const bg    = score >= 80 ? 'rgba(34,197,94,0.1)' : score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(148,163,184,0.08)';
  const border = score >= 80 ? 'rgba(34,197,94,0.35)' : score >= 60 ? 'rgba(245,158,11,0.35)' : 'rgba(148,163,184,0.2)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '10px 14px', borderRadius: 10,
      background: bg, border: `1px solid ${border}`,
    }}>
      <span style={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Match</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD — Naukri-inspired two-panel layout
// ─────────────────────────────────────────────────────────────────────────────
function CandidateCard({ result, rank }) {
  const [phoneVisible, setPhoneVisible] = useState(false);

  const expLabel = result.experience_years != null
    ? `${result.experience_years} yr${result.experience_years !== 1 ? 's' : ''}`
    : null;

  const currentRole = [result.current_title, result.current_company]
    .filter(Boolean).join(' at ') || null;

  const prevRole = [result.previous_title, result.previous_company]
    .filter(Boolean).join(' at ') || null;

  const education = result.degrees?.length > 0 ? result.degrees.join(', ') : null;

  const phone = result.candidate_phone
    ? result.candidate_phone.toString().replace(/\n|\r/g, '').trim()
    : null;

  return (
    <div
      className="resdex-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
      }}
    >
      {/* ── Top strip: rank + name + quick stats ─────────────────────────── */}
      <div style={{
        padding: '14px 18px 10px',
        borderBottom: '1px solid var(--border-light)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Rank bubble */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: rank <= 3 ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--bg-subtle)',
            border: rank <= 3 ? 'none' : '1px solid var(--border-med)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.68rem', fontWeight: 800,
            color: rank <= 3 ? '#fff' : 'var(--color-surface-500)',
            boxShadow: rank <= 3 ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
          }}>{rank}</div>

          {/* Name */}
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-surface-100)' }}>
            {result.candidate_name || 'Unnamed Candidate'}
          </h3>

          {/* Seniority badge */}
          {result.seniority && (
            <span style={{
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20,
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              color: '#c4b5fd', fontWeight: 700, letterSpacing: '0.04em',
            }}>
              {result.seniority}
            </span>
          )}

          {/* Applied for */}
          <span style={{
            marginLeft: 'auto', fontSize: '0.68rem',
            color: 'var(--color-surface-500)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Applied for: <strong style={{ color: 'var(--color-surface-400)' }}>{result.job_title}</strong>
          </span>
        </div>

        {/* Quick stats row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
          {expLabel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.775rem', color: 'var(--color-surface-400)' }}>
              <Icon d={icons.clock} size={13} />
              <strong style={{ color: 'var(--color-surface-200)' }}>{expLabel}</strong> experience
            </span>
          )}
          {result.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.775rem', color: 'var(--color-surface-400)' }}>
              <Icon d={icons.pin} size={13} />
              {result.location}
            </span>
          )}
          {result.degree_level && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.775rem', color: 'var(--color-surface-400)' }}>
              <Icon d={icons.grad} size={13} />
              {result.degree_level}
            </span>
          )}
        </div>
      </div>

      {/* ── Body: left info + right panel ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0 }}>

        {/* LEFT — labeled rows */}
        <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>

          <InfoRow
            label="Current"
            value={currentRole}
            copyText={currentRole}
            color="var(--color-surface-100)"
          />

          {prevRole && (
            <InfoRow
              label="Previous"
              value={prevRole}
              color="var(--color-surface-300)"
            />
          )}

          <InfoRow
            label="Education"
            value={education}
            copyText={education}
            color="#93c5fd"
          />

          <InfoRow
            label="Location"
            value={result.location || null}
            copyText={result.location}
            color="var(--color-surface-200)"
          />

          {/* Email row with copy */}
          {result.candidate_email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 6 }}>
              <div style={{ width: 105, flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-surface-500)', fontWeight: 600 }}>
                Email
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-surface-200)', fontWeight: 500 }}>
                  {result.candidate_email}
                </span>
                <CopyBtn text={result.candidate_email} label="Email" />
              </div>
            </div>
          )}

          {/* Mobile row — hidden by default like Naukri */}
          {phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 6 }}>
              <div style={{ width: 105, flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-surface-500)', fontWeight: 600 }}>
                Mobile
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {phoneVisible ? (
                  <>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-surface-200)', fontWeight: 600 }}>
                      {phone}
                    </span>
                    <CopyBtn text={phone} label="Mobile" />
                    <button
                      onClick={() => setPhoneVisible(false)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-surface-500)', fontSize: '0.68rem', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <Icon d={icons.eyeOff} size={11} /> Hide
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setPhoneVisible(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 5,
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                      color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Icon d={icons.eye} size={12} />
                    Show Mobile Number
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
              <div style={{ width: 105, flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-surface-500)', fontWeight: 600, paddingTop: 4 }}>
                Key Skills
              </div>
              <div style={{ flex: 1 }}>
                {result.skills?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {result.skills.slice(0, 14).map((s, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.71rem', fontWeight: 500,
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        color: 'var(--color-primary-300)',
                      }}>{s}</span>
                    ))}
                    {result.skills.length > 14 && (
                      <span style={{ fontSize: '0.71rem', color: 'var(--color-surface-500)', alignSelf: 'center' }}>
                        +{result.skills.length - 14} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-600)', fontStyle: 'italic' }}>Not specified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — divider + score + summary + actions */}
        <div style={{
          width: 220, flexShrink: 0,
          borderLeft: '1px solid var(--border-light)',
          padding: '14px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'rgba(255,255,255,0.01)',
        }}>
          {/* Match Score */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MatchScore score={result.score} />
          </div>

          {/* AI Reason */}
          {result.reason && (
            <div style={{
              padding: '8px 10px', borderRadius: 7,
              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)',
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                <span style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }}>
                  <Icon d={icons.spark} size={11} />
                </span>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--color-surface-400)', lineHeight: 1.5 }}>
                  {result.reason}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
            {result.drive_web_url ? (
              <a
                href={result.drive_web_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 10px', borderRadius: 7,
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  color: '#fff', fontSize: '0.775rem', fontWeight: 600,
                  textDecoration: 'none', transition: 'opacity 0.15s',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                }}
              >
                <Icon d={icons.link} size={12} stroke="#fff" /> View Resume
              </a>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px 10px', borderRadius: 7,
                background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                color: 'var(--color-surface-500)', fontSize: '0.75rem',
              }}>
                No Resume Link
              </div>
            )}

            {/* Quick copy row */}
            <div style={{ display: 'flex', gap: 5 }}>
              {result.candidate_email && (
                <CopyBtn text={result.candidate_email} label="Email" />
              )}
              {phone && phoneVisible && (
                <CopyBtn text={phone} label="Phone" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer strip ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '6px 18px',
        borderTop: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.01)',
      }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-surface-600)' }}>
          {result.applied_at ? `Applied: ${new Date(result.applied_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : ''}
        </span>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-surface-600)', fontStyle: 'italic' }}>
          AI Score: {result.score}/100
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SECTION
// ─────────────────────────────────────────────────────────────────────────────
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-surface-200)', fontSize: '0.775rem', fontWeight: 700,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span>{title}</span>
        <Icon d={icons.chevDown} size={13} stroke="var(--color-surface-500)" />
      </button>
      {open && <div style={{ padding: '2px 14px 12px' }}>{children}</div>}
    </div>
  );
}

function CheckOption({ label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
      cursor: 'pointer', fontSize: '0.775rem',
      color: checked ? 'var(--color-surface-100)' : 'var(--color-surface-400)',
      transition: 'color 0.15s',
    }}>
      <div
        onClick={onChange}
        style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: checked ? '2px solid #6366f1' : '2px solid var(--border-med)',
          background: checked ? '#6366f1' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {checked && <Icon d={icons.check} size={8} stroke="white" sw={3} />}
      </div>
      {label}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE FILTER TAG
// ─────────────────────────────────────────────────────────────────────────────
function ActiveTag({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
      color: 'var(--color-primary-300)', fontSize: '0.73rem', fontWeight: 500,
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit', opacity: 0.7 }}>
        <Icon d={icons.x} size={10} sw={2.5} />
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border-light)' }}>
        <div className="sk" style={{ height: 16, width: '35%', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="sk" style={{ height: 12, width: 80 }} />
          <div className="sk" style={{ height: 12, width: 100 }} />
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, padding: '14px 18px' }}>
          {[['35%', '55%'], ['30%', '45%'], ['25%', '40%'], ['20%', '60%']].map(([l, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
              <div className="sk" style={{ height: 12, width: 90, marginRight: 15, flexShrink: 0 }} />
              <div className="sk" style={{ height: 12, width: v }} />
            </div>
          ))}
        </div>
        <div style={{ width: 220, borderLeft: '1px solid var(--border-light)', padding: 14 }}>
          <div className="sk" style={{ height: 50, width: 70, borderRadius: 10, margin: '0 auto 10px' }} />
          <div className="sk" style={{ height: 60, width: '100%', borderRadius: 7 }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEARCH CLIENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SearchClient() {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [meta, setMeta]     = useState(null);

  // Sidebar filters
  const [expMin, setExpMin] = useState('');
  const [expMax, setExpMax] = useState('');
  const [selectedSeniority,  setSelectedSeniority]  = useState([]);
  const [selectedLocations,  setSelectedLocations]  = useState([]);
  const [selectedDegreeLevel, setSelectedDegreeLevel] = useState([]);

  const inputRef = useRef(null);

  const SENIORITY_OPTIONS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead', 'Executive'];
  const LOCATION_OPTIONS  = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];
  const DEGREE_LEVELS     = ['Undergraduate', 'Postgraduate', 'Doctorate', 'Diploma'];

  const toggle = (setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const buildFinalQuery = () => {
    let q = query.trim();
    if (expMin && expMax) q += ` ${expMin}-${expMax} years experience`;
    else if (expMin) q += ` minimum ${expMin} years experience`;
    else if (expMax) q += ` maximum ${expMax} years experience`;
    if (selectedLocations.length)    q += ` in ${selectedLocations.join(' or ')}`;
    if (selectedSeniority.length)    q += ` seniority ${selectedSeniority.join(' or ')}`;
    if (selectedDegreeLevel.length)  q += ` ${selectedDegreeLevel.join(' or ')} degree`;
    return q;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const finalQuery = buildFinalQuery();
    if (!finalQuery || finalQuery.trim().length < 2) return;

    setLoading(true); setError(''); setResults(null); setMeta(null);

    try {
      const res  = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Search failed.'); return; }
      setResults(data.results || []);
      setMeta({
        total_candidates:  data.total_candidates,
        matches_found:     data.matches_found,
        query:             data.query,
        extracted_filters: data.extracted_filters || null,
      });
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setQuery(''); setResults(null); setMeta(null); setError('');
    setExpMin(''); setExpMax('');
    setSelectedSeniority([]); setSelectedLocations([]); setSelectedDegreeLevel([]);
  };

  const activeFilterCount = [
    expMin || expMax ? 1 : 0,
    selectedSeniority.length,
    selectedLocations.length,
    selectedDegreeLevel.length,
  ].reduce((a, b) => a + b, 0);

  const exampleQueries = [
    'IT Recruiter with sourcing experience',
    'Java developer 5+ years in Delhi NCR',
    'React frontend engineer Bangalore',
    'MBA fresher in Human Resources',
    'Python data analyst with machine learning',
  ];

  return (
    <>
      {/* ── Global Scoped Styles ── */}
      <style>{`
        .resdex-card:hover {
          border-color: rgba(99,102,241,0.35) !important;
          box-shadow: 0 6px 24px rgba(0,0,0,0.18) !important;
          transform: translateY(-1px) !important;
        }
        .resdex-input-wrap:focus-within {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
        }
        .sk {
          border-radius: 6px;
          background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--border-light) 50%, var(--bg-subtle) 75%);
          background-size: 200% 100%;
          animation: sk-shimmer 1.5s infinite;
          display: block;
        }
        @keyframes sk-shimmer { to { background-position: -200% 0; } }
        @keyframes resdex-spin { to { transform: rotate(360deg); } }
        .rsdx-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: resdex-spin 0.65s linear infinite;
        }
        .ex-btn:hover {
          background: rgba(99,102,241,0.1) !important;
          border-color: rgba(99,102,241,0.3) !important;
          color: var(--color-surface-100) !important;
        }
      `}</style>

      <div style={{ minHeight: '100vh' }}>

        {/* ── Sticky Search Header ── */}
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-light)',
          padding: '14px 24px',
          position: 'sticky', top: 0, zIndex: 20,
          backdropFilter: 'blur(10px)',
        }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 1000, margin: '0 auto' }}>

              {/* AI Chip */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 10px', borderRadius: 8,
                background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
              }}>
                <Icon d={icons.spark} size={12} /> AI SEARCH
              </div>

              {/* Input */}
              <div
                className="resdex-input-wrap"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-subtle)', border: '1.5px solid var(--border-med)',
                  borderRadius: 9, padding: '0 12px', transition: 'all 0.2s',
                }}
              >
                <Icon d={icons.search} size={16} stroke="var(--color-surface-500)" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Describe the candidate you're looking for…  e.g. IT Recruiter in Delhi NCR with 3+ years"
                  style={{
                    flex: 1, padding: '10px 0', background: 'none', border: 'none',
                    outline: 'none', color: 'var(--color-surface-100)',
                    fontSize: '0.875rem', fontFamily: 'var(--font-sans)',
                  }}
                  disabled={loading}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-surface-500)', padding: 0, display: 'flex' }}>
                    <Icon d={icons.x} size={13} sw={2.5} />
                  </button>
                )}
              </div>

              {/* Search button */}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-primary"
                style={{
                  padding: '10px 20px', borderRadius: 9, fontSize: '0.85rem',
                  opacity: loading || !query.trim() ? 0.5 : 1,
                  cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                  gap: 7,
                }}
              >
                {loading ? <div className="rsdx-spinner" /> : <Icon d={icons.search} size={14} stroke="#fff" />}
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>

          {/* Active filter tags row */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, maxWidth: 1000, margin: '10px auto 0' }}>
              {expMin && <ActiveTag label={`Exp ≥ ${expMin}y`}  onRemove={() => setExpMin('')} />}
              {expMax && <ActiveTag label={`Exp ≤ ${expMax}y`}  onRemove={() => setExpMax('')} />}
              {selectedSeniority.map(s  => <ActiveTag key={s} label={s}         onRemove={() => toggle(setSelectedSeniority, s)} />)}
              {selectedLocations.map(l  => <ActiveTag key={l} label={l}         onRemove={() => toggle(setSelectedLocations, l)} />)}
              {selectedDegreeLevel.map(d => <ActiveTag key={d} label={d}        onRemove={() => toggle(setSelectedDegreeLevel, d)} />)}
              <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-surface-500)', fontSize: '0.73rem', padding: '3px 6px' }}>
                Clear all ×
              </button>
            </div>
          )}
        </div>

        {/* ── Page Body ── */}
        <div style={{ display: 'flex', gap: 0, maxWidth: 1280, margin: '0 auto', padding: '20px 24px', alignItems: 'flex-start' }}>

          {/* ── SIDEBAR ── */}
          <aside style={{
            width: 236, flexShrink: 0, marginRight: 20,
            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
            borderRadius: 12, overflow: 'hidden',
            position: 'sticky', top: 82,
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid var(--border-light)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.775rem', fontWeight: 700, color: 'var(--color-surface-200)' }}>
                <Icon d={icons.filter} size={13} />
                Refine Search
                {activeFilterCount > 0 && (
                  <span style={{ background: '#6366f1', color: 'white', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                    {activeFilterCount}
                  </span>
                )}
              </span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-surface-500)', fontSize: '0.7rem', padding: 0 }}>
                  Reset
                </button>
              )}
            </div>

            {/* Experience */}
            <FilterSection title="Experience (Years)">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {['Min', 'Max'].map((p, idx) => (
                  <input key={p} type="number" min="0" max="40"
                    value={idx === 0 ? expMin : expMax}
                    onChange={e => idx === 0 ? setExpMin(e.target.value) : setExpMax(e.target.value)}
                    placeholder={p}
                    style={{
                      width: '50%', padding: '5px 8px', borderRadius: 6, fontSize: '0.78rem',
                      background: 'var(--bg-subtle)', border: '1px solid var(--border-med)',
                      color: 'var(--color-surface-100)', outline: 'none', fontFamily: 'var(--font-sans)',
                    }}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Seniority */}
            <FilterSection title="Seniority Level">
              {SENIORITY_OPTIONS.map(s => (
                <CheckOption key={s} label={s} checked={selectedSeniority.includes(s)}
                  onChange={() => toggle(setSelectedSeniority, s)} />
              ))}
            </FilterSection>

            {/* Location */}
            <FilterSection title="Location">
              {LOCATION_OPTIONS.map(l => (
                <CheckOption key={l} label={l} checked={selectedLocations.includes(l)}
                  onChange={() => toggle(setSelectedLocations, l)} />
              ))}
            </FilterSection>

            {/* Education */}
            <FilterSection title="Education Level" defaultOpen={false}>
              {DEGREE_LEVELS.map(d => (
                <CheckOption key={d} label={d} checked={selectedDegreeLevel.includes(d)}
                  onChange={() => toggle(setSelectedDegreeLevel, d)} />
              ))}
            </FilterSection>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main style={{ flex: 1, minWidth: 0 }}>

            {/* Empty / Welcome state */}
            {!results && !loading && !error && (
              <div style={{
                textAlign: 'center', padding: '64px 24px',
                background: 'var(--bg-card)', borderRadius: 14,
                border: '1px solid var(--border-light)',
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: '50%', margin: '0 auto 18px',
                  background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))',
                  border: '1.5px solid rgba(99,102,241,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
                }}>🔍</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-surface-200)' }}>
                  Search your candidate database
                </h2>
                <p style={{ margin: '0 auto 28px', fontSize: '0.85rem', color: 'var(--color-surface-500)', maxWidth: 420, lineHeight: 1.6 }}>
                  Type naturally — AI understands context, synonyms, skills, and domains.
                  Use the sidebar to narrow by experience, location, or seniority.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {exampleQueries.map((q, i) => (
                    <button
                      key={i}
                      className="ex-btn"
                      onClick={() => { setQuery(q); setTimeout(() => inputRef.current?.focus(), 80); }}
                      style={{
                        padding: '7px 14px', borderRadius: 20,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border-med)',
                        color: 'var(--color-surface-400)', cursor: 'pointer',
                        fontSize: '0.8rem', transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 0' }}>
                  <div className="rsdx-spinner" style={{ borderTopColor: '#818cf8', borderColor: 'var(--border-med)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-surface-400)' }}>
                    AI is analyzing your candidates…
                  </span>
                </div>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{
                padding: '16px 20px', borderRadius: 10,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fca5a5', fontSize: '0.875rem' }}>Search Failed</p>
                  <p style={{ margin: 0, color: '#fca5a5', opacity: 0.8, fontSize: '0.8rem' }}>{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {results && !loading && (
              <div>
                {/* Results bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-surface-100)' }}>{meta?.matches_found || 0}</strong>
                    {' '}candidate{meta?.matches_found !== 1 ? 's' : ''} found
                    {meta?.total_candidates ? (
                      <span style={{ color: 'var(--color-surface-600)', marginLeft: 6 }}>
                        out of {meta.total_candidates} total
                      </span>
                    ) : null}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: '0.73rem', fontWeight: 600,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    color: 'var(--color-primary-300)',
                  }}>
                    Sorted by AI Relevance
                  </span>
                </div>

                {/* AI extracted filter tags */}
                {meta?.extracted_filters && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {meta.extracted_filters.job_title_hint && (
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary-300)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        🎯 Role: {meta.extracted_filters.job_title_hint}
                      </span>
                    )}
                    {meta.extracted_filters.locations?.map(l => (
                      <span key={l} style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                        📍 {l}
                      </span>
                    ))}
                    {meta.extracted_filters.experience_min != null && (
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
                        ⏱ {meta.extracted_filters.experience_min}+ yrs
                      </span>
                    )}
                    {meta.extracted_filters.must_have_skills?.map(s => (
                      <span key={s} style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>
                        ⚙ {s}
                      </span>
                    ))}
                  </div>
                )}

                {results.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '60px 24px',
                    background: 'var(--bg-card)', borderRadius: 12, border: '1px dashed var(--border-med)',
                  }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>🤷</div>
                    <h3 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-surface-200)' }}>
                      No matching candidates found
                    </h3>
                    <p style={{ margin: 0, color: 'var(--color-surface-500)', fontSize: '0.84rem' }}>
                      Try different keywords, broaden experience range, or remove location filters.
                    </p>
                  </div>
                ) : (
                  results.map((r, i) => (
                    <CandidateCard key={r.id} result={r} rank={i + 1} />
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
