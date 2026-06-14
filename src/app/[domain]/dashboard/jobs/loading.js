/**
 * Job Postings Loading Skeleton
 * 
 * Renders instantly while the server fetches job postings from Supabase.
 */
export default function JobsLoading() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="skeleton" style={{ width: '200px', height: '2.5rem', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
          <div className="skeleton" style={{ width: '350px', height: '1rem', borderRadius: '6px' }}></div>
        </div>
        <div className="skeleton" style={{ width: '180px', height: '3rem', borderRadius: '12px' }}></div>
      </div>

      {/* Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card hover-glow" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ width: '60%', height: '1.5rem', borderRadius: '6px' }}></div>
              <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%' }}></div>
            </div>
            
            <div className="skeleton" style={{ width: '80%', height: '1rem', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '40%', height: '1rem', borderRadius: '4px' }}></div>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '16px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '16px' }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1.5rem' }}>
              <div className="skeleton" style={{ width: '100px', height: '1rem', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '100px', height: '2rem', borderRadius: '8px' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
