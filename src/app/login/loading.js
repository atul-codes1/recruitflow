/**
 * Authentication Page Loading Skeleton
 * 
 * Mirrors the exact layout of the Login/Register card to prevent layout shifts.
 */
export default function AuthLoading() {
  return (
    <div className="animate-fade" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--color-surface-950)', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Orbs (Same as login page to prevent layout shift) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="animate-float" style={{ 
          position: 'absolute', top: '-10%', left: '10%', width: '500px', height: '500px', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)', animationDuration: '10s'
        }}></div>
        <div className="animate-pulse" style={{ 
          position: 'absolute', top: '40%', left: '50%', width: '800px', height: '800px', transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 60%)', filter: 'blur(100px)', animationDuration: '8s'
        }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '2rem' }}>
        <div style={{ 
          padding: '3rem', 
          background: 'var(--color-surface-900)', 
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--color-border)', 
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          
          {/* Header Skeleton */}
          <div className="skeleton" style={{ width: '60%', height: '2rem', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
          <div className="skeleton" style={{ width: '80%', height: '1rem', borderRadius: '4px', marginBottom: '1rem' }}></div>

          {/* Form Fields Skeleton */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton" style={{ width: '100%', height: '3.5rem', borderRadius: '12px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '3.5rem', borderRadius: '12px' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
               <div className="skeleton" style={{ width: '100px', height: '1rem', borderRadius: '4px' }}></div>
            </div>

            <div className="skeleton" style={{ width: '100%', height: '3.5rem', borderRadius: '12px', marginTop: '0.5rem' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
               <div className="skeleton" style={{ width: '180px', height: '1rem', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
