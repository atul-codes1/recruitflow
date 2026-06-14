import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardHeader from './DashboardHeader';

/**
 * Recruiter Dashboard Layout (Server Component)
 * 
 * Route: `/[domain]/dashboard/*`
 * 
 * This is the master layout for the internal recruiter dashboard.
 * It is responsible for STRICT tenant isolation.
 * 
 * Flow:
 * 1. Verify user is logged in.
 * 2. Fetch user's assigned `company_id` and `domain`.
 * 3. Ensure the URL `[domain]` matches their assigned domain.
 * 4. If there's a mismatch (e.g., User A tries to access Company B's dashboard), 
 *    they are forcefully redirected to their own domain.
 */
export default async function DashboardLayout({ children, params }) {
  const { domain } = await params;
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  // ------------------------------------------------------------------------
  // TENANT ISOLATION & GHOST SESSION HANDLING
  // ------------------------------------------------------------------------
  // Fetch the user's company domain and ID via the `profiles` join
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, companies(id, domain)')
    .eq('id', user.id)
    .single();

  const userDomain = profile?.companies?.domain;
  const companyId = profile?.companies?.id;

  if (!userDomain) {
    // Edge Case: Ghost session. 
    // This happens if an admin deleted the workspace, but the user still has a valid JWT cookie.
    // Force them to log out to clear the stale token.
    redirect('/login?error=GhostSession');
  }

  // Security Lock: If they try to access someone else's workspace URL, boot them to their own
  if (domain !== userDomain) {
    redirect(`/${userDomain}/dashboard`);
  }

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
        <DashboardHeader domain={domain} profile={profile} />

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
