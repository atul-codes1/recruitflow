'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ApplyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({});

  useEffect(() => {
    fetch(`/api/jobs/${params.slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError('Job not found');
        } else {
          setJob(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load job');
        setLoading(false);
      });
  }, [params.slug]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected) => {
    if (!selected) return;

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowed.includes(selected.type)) {
      setError('Please upload a PDF or Word document (.pdf, .doc, .docx)');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    setError('');
    setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please upload your resume');
      return;
    }
    
    if (!experienceLevel) {
      setError('Please select your experience level');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('job_slug', job.slug);
      formData.append('experience_level', experienceLevel);
      
      const ref = searchParams.get('ref');
      if (ref) {
        formData.append('ref', ref);
      }

      const response = await fetch('/api/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit application');
        setSubmitting(false);
        return;
      }

      router.push(`/boards/${params.domain}/success?job=${encodeURIComponent(job.title)}`);
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-hero bg-grid-pattern" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-surface-400)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse-glow 2s infinite' }}>⚡</div>
          Loading...
        </div>
      </div>
    );
  }

  if (error === 'Job not found' || !job) {
    return (
      <div className="bg-gradient-hero bg-grid-pattern" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Position Not Found</h2>
          <p style={{ color: 'var(--color-surface-400)', marginBottom: '1.5rem' }}>
            This job posting may have been closed or the link is incorrect.
          </p>
          <Link href="/" className="btn-primary">View Open Positions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-hero bg-grid-pattern" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="animate-float" style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
            }}>
              ⚡
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              fontFamily: 'var(--font-outfit, var(--font-display))',
              background: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              RecruitFlow
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem 6rem' }}>
        {/* Back link */}
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'var(--color-surface-400)',
          fontSize: '0.875rem',
          textDecoration: 'none',
          marginBottom: '2rem',
          transition: 'color 0.15s',
        }}>
          ← All Positions
        </Link>

        {/* Job Info */}
        <div className="card-stat animate-in" style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#34d399',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Actively Hiring
          </div>

          <h1 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 800,
            fontFamily: 'var(--font-outfit, var(--font-display))',
            marginBottom: '1rem',
            color: 'var(--color-surface-100)',
          }}>
            {job.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-surface-400)', marginBottom: '1.5rem' }}>
            {job.department && <span>📁 {job.department}</span>}
            {job.experience && <span>🎓 {job.experience}</span>}
            {job.location && <span>📍 {job.location}</span>}
            {job.employment_type && <span>⏰ {job.employment_type}</span>}
          </div>

          <div style={{
            whiteSpace: 'pre-wrap',
            fontSize: '0.9375rem',
            color: 'var(--color-surface-300)',
            lineHeight: 1.7,
          }}>
            {job.description}
          </div>
        </div>

        {/* Application Form */}
        <div className="card-stat animate-in" style={{ animationDelay: '0.1s' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'var(--font-outfit, var(--font-display))',
            marginBottom: '0.5rem',
          }}>
            Apply for this position
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', marginBottom: '2rem' }}>
            Fill in your details and upload your resume. We&apos;ll review your application shortly.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Experience Level *</label>
                <select 
                  className="select" 
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  required
                >
                  <option value="" disabled>Select your experience level</option>
                  <option value="0-1 Years (Fresher)">0-1 Years (Fresher)</option>
                  <option value="1-3 Years (Junior)">1-3 Years (Junior)</option>
                  <option value="3-5 Years (Mid-level)">3-5 Years (Mid-level)</option>
                  <option value="5-8 Years (Senior)">5-8 Years (Senior)</option>
                  <option value="8+ Years (Lead/Director)">8+ Years (Lead/Director)</option>
                </select>
              </div>

              {/* Resume Upload */}
              <div>
                <label className="label">Resume *</label>
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {file ? (
                    <div>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                      <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '0.25rem' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-surface-400)' }}>
                        {(file.size / 1024).toFixed(0)} KB — Click or drop to replace
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📎</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-surface-200)', marginBottom: '0.25rem' }}>
                        Drag & drop your resume here
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-surface-500)' }}>
                        or click to browse · PDF, DOCX, PNG, JPG · Max 10MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && error !== 'Job not found' && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'pulse-glow 1s infinite' }}>⏳</span>
                    Submitting your application...
                  </>
                ) : (
                  <>🚀 Submit Application</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="bg-gradient-hero bg-grid-pattern" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: '2rem', animation: 'pulse-glow 2s infinite' }}>⚡</div></div>}>
      <ApplyContent />
    </Suspense>
  );
}
