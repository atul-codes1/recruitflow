import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public Job View API
 * 
 * Route: `/api/jobs/[slug]`
 * 
 * Allows candidates to view job details without being authenticated.
 * Uses the Supabase Admin Client to bypass RLS, but strictly limits 
 * queries to jobs where `is_active=true` and matching the exact `slug`.
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const supabase = createAdminClient();

    // The Admin Client bypasses RLS so candidates can view active jobs
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*, companies(name, domain)') // Fetch company details too
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    
    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json(job);
  } catch (err) {
    console.error('API /jobs/[slug] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
