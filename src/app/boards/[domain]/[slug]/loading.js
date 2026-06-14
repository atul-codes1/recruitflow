/**
 * Public Job Board Loading Skeleton
 * 
 * Uses Next.js App Router conventions to display an instant skeleton state
 * while `page.js` is fetching data on the server.
 */
export default function JobBoardLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] animate-in">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-[var(--bg-panel)]/80 backdrop-blur-md border-b border-[var(--border-light)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="skeleton" style={{ width: '150px', height: '2rem', borderRadius: '8px' }}></div>
          <div className="skeleton" style={{ width: '100px', height: '2.5rem', borderRadius: '8px' }}></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Job Title Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3rem' }}>
          <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '20px', marginBottom: '1.5rem' }}></div>
          <div className="skeleton" style={{ width: '350px', height: '3rem', borderRadius: '12px', marginBottom: '1rem' }}></div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: '100px', height: '1.5rem', borderRadius: '16px' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '1.5rem', borderRadius: '16px' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '1.5rem', borderRadius: '16px' }}></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="card" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <div className="skeleton" style={{ width: '200px', height: '1.5rem', borderRadius: '6px', marginBottom: '1rem' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
            <div className="skeleton" style={{ width: '80%', height: '1rem', borderRadius: '4px' }}></div>
          </div>
          
          <div>
            <div className="skeleton" style={{ width: '250px', height: '1.5rem', borderRadius: '6px', marginBottom: '1rem' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
            <div className="skeleton" style={{ width: '90%', height: '1rem', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* Apply Button Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <div className="skeleton" style={{ width: '200px', height: '4rem', borderRadius: '9999px' }}></div>
        </div>
      </main>
    </div>
  );
}
