import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import Link from 'next/link';

/**
 * Blog Page (Server Component)
 * 
 * Route: `/blog`
 * 
 * Marketing page listing recent blog posts. 
 * Currently displays hardcoded mock posts. Could be connected to 
 * a headless CMS (like Sanity or Contentful) later.
 */
export default function BlogPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '1000px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '1rem', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          RecruitFlow Blog
        </h1>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '1.25rem', marginBottom: '3rem' }}>
          Insights, thoughts, and best practices for modern hiring.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Mock Blog Post 1 */}
          <Link href="#" className="card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>Product Update</span>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', margin: 0 }}>Introducing the new Grid Layout</h2>
            <p style={{ color: 'var(--color-surface-400)', fontSize: '0.875rem', margin: 0, flex: 1 }}>Learn how our new dashboard layout improves recruiter efficiency by 40%.</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-500)' }}>June 7, 2026</span>
          </Link>
          
          {/* Mock Blog Post 2 */}
          <Link href="#" className="card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6366f1', fontWeight: 600 }}>Thought Leadership</span>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-surface-100)', margin: 0 }}>The Future of ATS is Glassmorphic</h2>
            <p style={{ color: 'var(--color-surface-400)', fontSize: '0.875rem', margin: 0, flex: 1 }}>Why UI/UX is the most important factor in preventing recruiter burnout.</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-500)' }}>May 24, 2026</span>
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
