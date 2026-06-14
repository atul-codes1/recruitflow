import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth Callback & JIT Provisioning
 * 
 * Route: `/auth/callback`
 * 
 * This is the heart of the "Zero Friction Onboarding" architecture. 
 * When a user registers or clicks a Magic Link, they land here. 
 * 
 * Flow:
 * 1. Exchanges the Auth `code` for an active secure session.
 * 2. Parses their email domain (e.g. `jane@acme.com` -> `acme.com`).
 * 3. If `acme.com` does not exist in `companies`, it auto-generates the tenant 
 *    workspace and promotes Jane to 'admin' (The Pioneer).
 * 4. If `acme.com` DOES exist, it adds Jane as a 'recruiter' to that tenant.
 * 5. Redirects to `/api/auth/route-tenant` for final dashboard routing.
 */
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') || '/api/auth/route-tenant';
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Invalid verification link', request.url));
  }

  const supabase = await createClient();
  
  // 1. Exchange the secure code for an active session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error || !data?.user) {
    return NextResponse.redirect(new URL('/login?error=Verification failed or expired', request.url));
  }

  const user = data.user;
  const email = user.email;
  const fullName = user.user_metadata?.full_name || 'Unknown Recruiter';
  const domain = user.user_metadata?.domain || email.split('@')[1];

  try {
    // 2. Auto-Routing Engine (Requires Admin Client to bypass RLS)
    const adminSupabase = createAdminClient();

    // Check if the user already has a profile (in case they click an old link or login via magic link)
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
       return NextResponse.redirect(new URL(nextPath, request.url));
    }

    // 3. New User Setup - Check if Company exists
    let { data: company } = await adminSupabase
      .from('companies')
      .select('id')
      .eq('domain', domain)
      .single();

    let role = 'recruiter';

    // 4. Create Company if it doesn't exist (The Pioneer)
    if (!company) {
      const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      
      const { data: newCompany, error: companyError } = await adminSupabase
        .from('companies')
        .insert({ name: companyName, domain: domain })
        .select()
        .single();

      if (companyError) throw companyError;
      company = newCompany;
      role = 'admin'; // Promote to Admin
    }

    // 5. Create the Profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: user.id,
        company_id: company.id,
        role: role,
        full_name: fullName
      });

    if (profileError) throw profileError;

    // Everything is set up! Send them into their tenant app.
    return NextResponse.redirect(new URL(nextPath, request.url));

  } catch (err) {
    console.error('Auto-Routing Error:', err);
    return NextResponse.redirect(new URL('/login?error=Workspace setup failed', request.url));
  }
}
