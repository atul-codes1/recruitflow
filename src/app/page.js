import Link from 'next/link';
import { getAllJobs } from '@/lib/db';
import HomeJobsClient from './HomeJobsClient';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jobs = await getAllJobs(true);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader jobCount={jobs.filter(j => j.is_active).length} />

      {/* Main Layout */}
      <main className="home-main-wrapper" style={{ 
        flex: 1, 
        maxWidth: '1400px', 
        margin: '0 auto', 
        width: '100%', 
        padding: '2rem',
      }}>
        <HomeJobsClient jobs={jobs} />
      </main>

      <PublicFooter />
    </div>
  );
}
