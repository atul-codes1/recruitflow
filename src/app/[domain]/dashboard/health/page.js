import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HealthClient from './HealthClient';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure only admins can access this page? 
  // The user didn't specify restricted access yet, but let's check role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role || 'recruiter';

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-surface-100)', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
          System Health & Queue Operations
        </h1>
        <p style={{ color: 'var(--color-surface-400)', marginTop: '0.5rem' }}>
          Monitor your AI pipeline limits, queue status, and manage edge-case failures.
        </p>
      </div>

      <HealthClient role={role} />
    </div>
  );
}
