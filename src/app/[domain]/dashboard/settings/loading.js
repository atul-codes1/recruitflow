/**
 * Settings Page Loading Skeleton
 * 
 * Renders instantly while the server fetches the user's current cloud storage 
 * configuration from Supabase.
 */
export default function SettingsLoading() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '800px' }}>
      {/* Header Skeleton */}
      <div>
        <div className="skeleton" style={{ width: '250px', height: '2.5rem', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
        <div className="skeleton" style={{ width: '350px', height: '1rem', borderRadius: '6px' }}></div>
      </div>

      {/* Form Skeleton */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: '150px', height: '1.25rem', borderRadius: '4px', marginBottom: '0.75rem' }}></div>
          <div className="skeleton" style={{ width: '100%', height: '3rem', borderRadius: '8px' }}></div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '100px', height: '1.25rem', borderRadius: '4px', marginBottom: '0.75rem' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '3rem', borderRadius: '8px' }}></div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '120px', height: '1.25rem', borderRadius: '4px', marginBottom: '0.75rem' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '3rem', borderRadius: '8px' }}></div>
          </div>
        </div>

        <div>
          <div className="skeleton" style={{ width: '180px', height: '1.25rem', borderRadius: '4px', marginBottom: '0.75rem' }}></div>
          <div className="skeleton" style={{ width: '100%', height: '6rem', borderRadius: '8px' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '3rem', borderRadius: '8px' }}></div>
        </div>
      </div>
    </div>
  );
}
