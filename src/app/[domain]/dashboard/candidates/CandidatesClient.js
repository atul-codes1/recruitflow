'use client';

import { useState, useEffect } from 'react';
import StatusSelect from './StatusSelect';

export default function CandidatesClient({ initialApplications, jobs }) {
  const [applications, setApplications] = useState(initialApplications);
  const [expFilter, setExpFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isReparsing, setIsReparsing] = useState(false);



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplications(initialApplications);
  }, [initialApplications]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const date = String(d.getDate()).padStart(2, '0') + '-' + 
                 String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                 d.getFullYear();
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
    return { date, time };
  };

  const isWithinDays = (dateString, days) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = now - d;
    return diff <= days * 24 * 60 * 60 * 1000;
  };

  const filteredApps = applications.filter((app) => {
    // Experience Filter
    if (expFilter !== 'all') {
      const appExp = app.experience_level || '';
      if (appExp !== expFilter) return false;
    }

    // Date Filter
    if (dateFilter !== 'all') {
      if (dateFilter === 'today' && !isWithinDays(app.created_at, 1)) return false;
      if (dateFilter === 'week' && !isWithinDays(app.created_at, 7)) return false;
      if (dateFilter === 'month' && !isWithinDays(app.created_at, 30)) return false;
    }

    // Role Filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'general_pool') {
        if (app.job_id !== null && app.job_id !== undefined) return false;
      } else {
        if (app.job_id !== roleFilter) return false;
      }
    }

    // Status Filter
    if (statusFilter !== 'all') {
      if (app.status !== statusFilter) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Filters Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        alignItems: 'center',
        background: 'var(--bg-panel)',
        padding: '0.75rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🎓</span>
          <select 
            value={expFilter} 
            onChange={(e) => setExpFilter(e.target.value)}
            style={{ 
              padding: '0.5rem 2rem 0.5rem 1rem', 
              borderRadius: '9999px', 
              background: 'var(--bg-card)', 
              color: 'var(--color-surface-100)', 
              border: '1px solid var(--border-med)', 
              fontSize: '0.875rem', 
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-med)'}
          >
            <option value="all">All Experience Levels</option>
            <option value="0-1 Years (Fresher)">0-1 Years (Fresher)</option>
            <option value="1-3 Years (Junior)">1-3 Years (Junior)</option>
            <option value="3-5 Years (Mid-level)">3-5 Years (Mid-level)</option>
            <option value="5-8 Years (Senior)">5-8 Years (Senior)</option>
            <option value="8+ Years (Lead/Director)">8+ Years (Lead/Director)</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-med)', margin: '0 0.5rem' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ 
              padding: '0.5rem 2rem 0.5rem 1rem', 
              borderRadius: '9999px', 
              background: 'var(--bg-card)', 
              color: 'var(--color-surface-100)', 
              border: '1px solid var(--border-med)', 
              fontSize: '0.875rem', 
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-med)'}
          >
            <option value="all">Anytime</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-med)', margin: '0 0.5rem' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>💼</span>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ 
              padding: '0.5rem 2rem 0.5rem 1rem', 
              borderRadius: '9999px', 
              background: 'var(--bg-card)', 
              color: 'var(--color-surface-100)', 
              border: '1px solid var(--border-med)', 
              fontSize: '0.875rem', 
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
              transition: 'all 0.2s ease',
              maxWidth: '200px',
              textOverflow: 'ellipsis'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-med)'}
          >
            <option value="all">All Roles</option>
            <option value="general_pool">General Pool (Unassigned)</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-med)', margin: '0 0.5rem' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🏷️</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ 
              padding: '0.5rem 2rem 0.5rem 1rem', 
              borderRadius: '9999px', 
              background: 'var(--bg-card)', 
              color: 'var(--color-surface-100)', 
              border: '1px solid var(--border-med)', 
              fontSize: '0.875rem', 
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-med)'}
          >
            <option value="all">All Statuses</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="reviewed">Reviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

      </div>

      {filteredApps.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderStyle: 'dashed' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-surface-200)' }}>
            No candidates match your filters.
          </h3>
        </div>
      ) : (
        <div className="table-container responsive-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile No</th>
                <th>Email Id</th>
                <th>Experience</th>
                <th>Role</th>
                <th>Date Applied</th>
                <th>Status</th>
                <th>Resume</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map(app => {
                const job = jobs.find(j => j.id === app.job_id);
                return (
                  <tr key={app.id} className="hover-row">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-surface-100)', fontSize: '0.875rem', letterSpacing: '0.01em', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: app.status === 'hired' ? '#10b981' : app.status === 'rejected' ? '#ef4444' : '#6366f1' }}></div>
                          {app.parsed_data?.candidate?.name || app.candidate_name || 'Anonymous Applicant'}
                        </div>
                        {app.ai_status && app.ai_status !== 'completed' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`badge badge-${app.ai_status}`} style={{ fontSize: '0.65rem' }}>
                              {app.ai_status === 'uploading' ? 'Uploading...' : app.ai_status === 'queued' ? 'Queued for AI' : 'AI Failed'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-surface-300)', display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}>
                        <span style={{ opacity: 0.7 }}>📱</span> {(app.parsed_data?.candidate?.contact?.phone || app.candidate_phone || 'N/A').replace(/\n/g, '').trim()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-surface-300)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ opacity: 0.7 }}>📧</span> {app.parsed_data?.candidate?.contact?.email || app.candidate_email || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {app.experience_level && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-surface-100)', background: 'var(--bg-subtle)', padding: '0.125rem 0.5rem', borderRadius: '4px', width: 'fit-content' }}>
                            {app.experience_level}
                          </div>
                        )}
                        {(app.parsed_data?.professional_narrative?.years_of_experience_calculated !== null && app.parsed_data?.professional_narrative?.years_of_experience_calculated !== undefined) && (
                          <div style={{ 
                            padding: '0.125rem 0.375rem', 
                            borderRadius: '4px', 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            color: '#a5b4fc', 
                            fontSize: '0.7rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem', 
                            border: '1px solid rgba(99, 102, 241, 0.2)', 
                            width: 'fit-content' 
                          }}>
                            <span style={{ color: '#818cf8' }}>✨</span> AI: {app.parsed_data.professional_narrative.years_of_experience_calculated} yrs
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, color: app.job_id ? '#93c5fd' : '#c084fc', fontSize: '0.8125rem' }}>
                          {app.job_id ? (job?.title || 'Unknown Job') : 'General Pool'}
                        </span>
                        {job?.experience && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-surface-400)', border: '1px solid var(--border-med)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                            Req: {job.experience}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>{formatDate(app.created_at).date}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-surface-400)' }}>{formatDate(app.created_at).time}</div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StatusSelect application={app} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {app.drive_web_url ? (
                        <a href={app.drive_web_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                          View Resume ↗
                        </a>
                      ) : app.local_path ? (
                        <span className="badge badge-reviewed" style={{ fontSize: '0.65rem' }}>Saved locally</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-surface-500)' }}>No resume</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
