'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JobsClient({ domain, initialJobs }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  const [form, setForm] = useState({
    title: '',
    company: '',
    budget: '',
    experience: '',
    department: '',
    location: '',
    employment_type: 'Full-time',
    description: '',
  });

  const openCreateModal = () => {
    setEditingJobId(null);
    setForm({ title: '', company: '', budget: '', experience: '', department: '', location: '', employment_type: 'Full-time', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title || '',
      company: job.company || '',
      budget: job.budget || '',
      experience: job.experience || '',
      department: job.department || '',
      location: job.location || '',
      employment_type: job.employment_type || 'Full-time',
      description: job.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingJobId) {
        // Edit Mode
        const res = await fetch('/api/jobs/manage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingJobId, ...form }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          router.refresh();
        } else alert('Failed to update job');
      } else {
        // Create Mode
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setIsModalOpen(false);
          router.refresh();
        } else {
          const errData = await res.json();
          alert(`Failed: ${errData.details || errData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      alert('An error occurred: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (job) => {
    try {
      const res = await fetch('/api/jobs/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, is_active: !job.is_active }),
      });
      if (res.ok) router.refresh();
      else alert('Failed to change status');
    } catch (e) {
      alert('Error changing status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/jobs/manage?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) router.refresh();
      else alert('Failed to delete job');
    } catch (e) {
      alert('Error deleting job');
    }
  };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>
            Job Postings
          </h1>
          <p style={{ color: 'var(--color-surface-400)' }}>Manage your open roles and generate application links.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Create New Job
        </button>
      </div>

      {/* Jobs List */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {initialJobs.map((job, index) => (
          <div key={job.id} className={`card-stat job-card-flex stagger-${(index % 4) + 1}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-outfit, var(--font-display))', color: job.is_active ? 'var(--color-surface-100)' : 'var(--color-surface-400)' }}>
                  {job.title}
                </h3>
                {job.is_active ? (
                  <span className="badge badge-shortlisted">Active</span>
                ) : (
                  <span className="badge badge-reviewed">Hidden</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>
                {job.company && <span>🏢 {job.company}</span>}
                {job.budget && <span style={{ color: '#34d399', fontWeight: 500 }}>💰 {job.budget}</span>}
                {job.experience && <span>🎓 {job.experience}</span>}
                <span>📁 {job.department || 'N/A'}</span>
                <span>📍 {job.location || 'N/A'}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={() => handleToggleStatus(job)} className="btn-secondary btn-sm" title={job.is_active ? 'Hide Job' : 'Make Active'}>
                {job.is_active ? '👁️' : '🚫'}
              </button>
              <button onClick={() => openEditModal(job)} className="btn-secondary btn-sm" title="Edit Job">
                ✏️
              </button>
              <button onClick={() => handleDelete(job.id)} className="btn-danger btn-sm" title="Delete Job">
                🗑️
              </button>
              <div style={{ width: '1px', height: '24px', background: 'var(--border-med)', margin: '0 0.5rem' }}></div>
              <Link href={`/boards/${domain}/${job.slug}`} target="_blank" className="btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                Portal ↗
              </Link>
            </div>
          </div>
        ))}
        {initialJobs.length === 0 && (
          <div className="empty-state card" style={{ padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-surface-200)' }}>
              No jobs posted yet
            </h3>
            <p style={{ color: 'var(--color-surface-400)' }}>Create your first job posting to start collecting applications.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Job Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="modal-overlay" onClick={() => !loading && setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-outfit, var(--font-display))' }}>
                {editingJobId ? 'Edit Job Posting' : 'Create New Job'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-surface-400)', fontSize: '1.5rem', cursor: 'pointer' }}
                disabled={loading}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Job Title *</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Senior Frontend Engineer" 
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Company</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Acme Corp" 
                    value={form.company}
                    onChange={(e) => setForm({...form, company: e.target.value})}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Department</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Engineering" 
                    value={form.department}
                    onChange={(e) => setForm({...form, department: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Location</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Remote (India)" 
                    value={form.location}
                    onChange={(e) => setForm({...form, location: e.target.value})}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Internal Budget</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. $100k - $120k" 
                    value={form.budget}
                    onChange={(e) => setForm({...form, budget: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Experience Required</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. 3-5 Years" 
                    value={form.experience}
                    onChange={(e) => setForm({...form, experience: e.target.value})}
                  />
                </div>
                <div style={{ flex: 1 }}>
                </div>
              </div>
              <div>
                <label className="label">Employment Type</label>
                <select 
                  className="select" 
                  value={form.employment_type}
                  onChange={(e) => setForm({...form, employment_type: e.target.value})}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="label">Job Description *</label>
                <textarea 
                  className="textarea" 
                  placeholder="Describe the role, requirements, and benefits..." 
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  required
                  style={{ minHeight: '150px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingJobId ? 'Save Changes' : 'Create Job Post')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
