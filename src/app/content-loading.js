/**
 * Static Content Page Loading Skeleton
 * 
 * Used for static markdown-like pages (e.g., Privacy, Terms, Cookies)
 * to provide a smooth transition.
 */
export default function ContentLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] animate-in">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-[var(--bg-panel)]/80 backdrop-blur-md border-b border-[var(--border-light)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="skeleton" style={{ width: '150px', height: '2rem', borderRadius: '8px' }}></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '1.5rem', borderRadius: '4px' }}></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="skeleton" style={{ width: '400px', height: '3rem', borderRadius: '12px', marginBottom: '2rem' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="skeleton" style={{ width: '100%', height: '1.5rem', borderRadius: '6px' }}></div>
           <div className="skeleton" style={{ width: '100%', height: '1.5rem', borderRadius: '6px' }}></div>
           <div className="skeleton" style={{ width: '80%', height: '1.5rem', borderRadius: '6px' }}></div>
        </div>

        <div className="skeleton" style={{ width: '250px', height: '2rem', borderRadius: '8px', marginTop: '3rem', marginBottom: '1.5rem' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="skeleton" style={{ width: '100%', height: '1.5rem', borderRadius: '6px' }}></div>
           <div className="skeleton" style={{ width: '90%', height: '1.5rem', borderRadius: '6px' }}></div>
           <div className="skeleton" style={{ width: '95%', height: '1.5rem', borderRadius: '6px' }}></div>
        </div>
      </main>
    </div>
  );
}
