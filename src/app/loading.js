export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] animate-in">
      <header className="sticky top-0 z-50 bg-[var(--bg-panel)]/80 backdrop-blur-md border-b border-[var(--border-light)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="skeleton" style={{ width: '150px', height: '2rem', borderRadius: '8px' }}></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="skeleton" style={{ width: '80px', height: '2rem', borderRadius: '8px' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '2rem', borderRadius: '8px' }}></div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Skeleton */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
            <div className="skeleton" style={{ width: '120px', height: '2rem', borderRadius: '9999px', marginBottom: '1.5rem' }}></div>
            <div className="skeleton" style={{ width: '80%', maxWidth: '800px', height: '4rem', borderRadius: '16px', marginBottom: '1rem' }}></div>
            <div className="skeleton" style={{ width: '60%', maxWidth: '600px', height: '2rem', borderRadius: '8px', marginBottom: '2.5rem' }}></div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <div className="skeleton" style={{ width: '160px', height: '3.5rem', borderRadius: '9999px' }}></div>
              <div className="skeleton" style={{ width: '160px', height: '3.5rem', borderRadius: '9999px' }}></div>
            </div>
          </div>
        </section>

        {/* Board Skeleton */}
        <section className="py-20 bg-[var(--bg-panel)] relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ textAlign: 'center', marginBottom: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div className="skeleton" style={{ width: '300px', height: '2.5rem', borderRadius: '12px', marginBottom: '1rem' }}></div>
               <div className="skeleton" style={{ width: '400px', height: '1.5rem', borderRadius: '8px' }}></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '12px' }}></div>
                     <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '9999px' }}></div>
                   </div>
                   <div>
                     <div className="skeleton" style={{ width: '70%', height: '1.5rem', borderRadius: '6px', marginBottom: '0.5rem' }}></div>
                     <div className="skeleton" style={{ width: '90%', height: '1rem', borderRadius: '4px' }}></div>
                   </div>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '6px' }}></div>
                     <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '6px' }}></div>
                   </div>
                   <div className="skeleton" style={{ width: '100%', height: '2.5rem', borderRadius: '8px', marginTop: '1rem' }}></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
