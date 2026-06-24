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


      <HealthClient role={role} />
    </div>
  );
}
