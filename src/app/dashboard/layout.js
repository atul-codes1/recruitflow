import DashboardHeader from './DashboardHeader';

export default function DashboardLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-surface-950)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Dynamic Background Orbs */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="animate-float" style={{ 
          position: 'absolute', top: '-10%', left: '5%', width: '600px', height: '600px', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(80px)', animationDuration: '15s'
        }}></div>
        <div className="animate-float" style={{ 
          position: 'absolute', bottom: '-20%', right: '-5%', width: '800px', height: '800px', 
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 70%)', 
          filter: 'blur(100px)', animationDuration: '20s', animationDelay: '2s'
        }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <DashboardHeader />

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1400px', margin: '0 auto', overflowX: 'hidden' }}>
          <div className="animate-in p-responsive" style={{ padding: '2rem' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
