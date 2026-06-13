export default function DashboardLoading() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Skeleton Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="skeleton" style={{ width: '200px', height: '2.5rem', borderRadius: '8px', marginBottom: '0.75rem' }}></div>
          <div className="skeleton" style={{ width: '350px', height: '1rem', borderRadius: '6px' }}></div>
        </div>
        <div className="skeleton" style={{ width: '150px', height: '3rem', borderRadius: '12px' }}></div>
      </div>

      {/* Skeleton Grid */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-stat" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '60%' }}>
              <div className="skeleton" style={{ width: '40%', height: '1.5rem', borderRadius: '6px', marginBottom: '1rem' }}></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="skeleton" style={{ width: '100px', height: '1rem', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '120px', height: '1rem', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '80px', height: '1rem', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px' }}></div>
              <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '40px', borderRadius: '8px' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
