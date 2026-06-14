/**
 * AI Semantic Search Loading Skeleton
 * 
 * Renders instantly while the Next.js App Router fetches the page component.
 */
export default function SearchLoading() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Header Skeleton */}
      <div>
        <div className="skeleton" style={{ width: '300px', height: '2.5rem', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
        <div className="skeleton" style={{ width: '450px', height: '1rem', borderRadius: '6px' }}></div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="skeleton" style={{ width: '100%', height: '4rem', borderRadius: '16px' }}></div>

      {/* Example Queries Skeleton */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="skeleton" style={{ width: '150px', height: '2.5rem', borderRadius: '9999px' }}></div>
        <div className="skeleton" style={{ width: '180px', height: '2.5rem', borderRadius: '9999px' }}></div>
        <div className="skeleton" style={{ width: '130px', height: '2.5rem', borderRadius: '9999px' }}></div>
      </div>

      {/* Results Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
             <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '12px', flexShrink: 0 }}></div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
               <div className="skeleton" style={{ width: '25%', height: '1.5rem', borderRadius: '6px' }}></div>
               <div className="skeleton" style={{ width: '40%', height: '1rem', borderRadius: '4px' }}></div>
               <div className="skeleton" style={{ width: '80%', height: '1rem', borderRadius: '4px' }}></div>
               <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '8px' }}></div>
                  <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '8px' }}></div>
                  <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '8px' }}></div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
