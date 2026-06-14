import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import HomeJobsClient from '@/components/HomeJobsClient';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic'; // Ensures this page renders server-side dynamically

/**
 * Public Job Board Home Page
 * 
 * Route: `/boards/[domain]`
 * 
 * This is the public-facing landing page for a specific company's job board.
 * It uses the `[domain]` URL parameter to dynamically fetch the correct company
 * and its active jobs. This is the core of our multi-tenant public architecture.
 * 
 * Example: recruitflow.com/boards/acme -> Shows Acme Corp's jobs.
 */
export default async function CompanyBoardPage({ params }) {
  const { domain } = await params;
  
  // We use the Admin Client here because this is a public page (no user session).
  // Standard Supabase client would enforce RLS and block the read if not authenticated.
  const supabaseAdmin = createAdminClient();

  // ------------------------------------------------------------------------
  // 1. TENANT RESOLUTION
  // ------------------------------------------------------------------------
  // Look up the company ID using the domain string from the URL
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .eq('domain', domain)
    .single();

  if (!company) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>Company not found.</div>;
  }

  // ------------------------------------------------------------------------
  // 2. DATA FETCHING
  // ------------------------------------------------------------------------
  // Fetch only this specific company's active jobs
  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader jobCount={(jobs || []).length} companyName={company.name} />

      {/* Main Layout */}
      <main className="home-main-wrapper" style={{ 
        flex: 1, 
        maxWidth: '1400px', 
        margin: '0 auto', 
        width: '100%', 
        padding: '2rem',
      }}>
        <HomeJobsClient domain={domain} jobs={jobs || []} />
      </main>

      <PublicFooter />
    </div>
  );
}
