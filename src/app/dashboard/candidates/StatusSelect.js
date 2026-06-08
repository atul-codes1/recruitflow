'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StatusSelect({ application }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const statuses = [
    { value: 'unreviewed', label: 'Unreviewed' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setLoading(true);

    try {
      const res = await fetch('/api/applications/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: application.id, status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      alert('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={application.status}
        onChange={handleStatusChange}
        disabled={loading}
        className={`badge badge-${application.status}`}
        style={{
          appearance: 'none',
          paddingRight: '1.5rem',
          cursor: loading ? 'wait' : 'pointer',
          outline: 'none',
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value} style={{ background: 'var(--color-surface-800)', color: 'var(--color-surface-100)' }}>
            {s.label}
          </option>
        ))}
      </select>
      <div style={{
        position: 'absolute',
        right: '0.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        fontSize: '0.6rem',
        opacity: 0.5
      }}>
        ▼
      </div>
    </div>
  );
}
