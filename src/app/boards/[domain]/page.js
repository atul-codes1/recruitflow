import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import HomeJobsClient from '@/components/HomeJobsClient';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

export default async function CompanyBoardPage({ params }) {
  const { domain } = await params;
  
  const supabaseAdmin = createAdminClient();

  // Fetch the company to ensure it exists
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .eq('domain', domain)
    .single();

  if (!company) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>Company not found.</div>;
  }

  // Fetch only this company's active jobs
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
