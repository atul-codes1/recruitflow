export default function CandidatesLoading() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="skeleton" style={{ width: '250px', height: '2.5rem', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
          <div className="skeleton" style={{ width: '400px', height: '1rem', borderRadius: '6px' }}></div>
        </div>
        <div className="skeleton" style={{ width: '150px', height: '2.5rem', borderRadius: '8px' }}></div>
      </div>

      {/* Filters Skeleton */}
      <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-panel)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)' }}>
        <div className="skeleton" style={{ width: '150px', height: '2rem', borderRadius: '9999px' }}></div>
        <div className="skeleton" style={{ width: '120px', height: '2rem', borderRadius: '9999px' }}></div>
        <div className="skeleton" style={{ width: '180px', height: '2rem', borderRadius: '9999px' }}></div>
        <div className="skeleton" style={{ width: '140px', height: '2rem', borderRadius: '9999px' }}></div>
      </div>

      {/* Table Skeleton */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '10%' }}>
           <div className="skeleton" style={{ width: '100px', height: '1rem', borderRadius: '4px' }}></div>
           <div className="skeleton" style={{ width: '80px', height: '1rem', borderRadius: '4px' }}></div>
           <div className="skeleton" style={{ width: '120px', height: '1rem', borderRadius: '4px' }}></div>
           <div className="skeleton" style={{ width: '60px', height: '1rem', borderRadius: '4px' }}></div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '10%', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '150px' }}>
              <div className="skeleton" style={{ width: '120px', height: '1.25rem', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '0.75rem', borderRadius: '4px' }}></div>
            </div>
            <div className="skeleton" style={{ width: '100px', height: '1rem', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '150px', height: '1rem', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '80px', height: '2rem', borderRadius: '16px' }}></div>
            <div className="skeleton" style={{ width: '80px', height: '2rem', borderRadius: '6px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
