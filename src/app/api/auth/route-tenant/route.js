import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('companies(domain)')
    .eq('id', user.id)
    .single();

  const domain = profile?.companies?.domain;

  if (domain) {
    return NextResponse.redirect(new URL(`/${domain}/dashboard/candidates`, request.url));
  } else {
    // Edge Case: Legacy user who logged in but their profile/workspace wasn't created.
    // Auto-provision it right now using the Admin Client.
    const supabaseAdmin = createAdminClient();
    const emailDomain = user.email.split('@')[1];
    
    let { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, domain')
      .eq('domain', emailDomain)
      .single();

    let role = 'recruiter';

    if (!company) {
      const companyName = emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1);
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({ name: companyName, domain: emailDomain })
        .select()
        .single();
        
      if (!companyError) {
        company = newCompany;
        role = 'admin';
      }
    }

    if (company) {
      const fullName = user.user_metadata?.full_name || 'Legacy User';
      await supabaseAdmin.from('profiles').insert({
        id: user.id,
        company_id: company.id,
        role: role,
        full_name: fullName
      });
      return NextResponse.redirect(new URL(`/${company.domain}/dashboard/candidates`, request.url));
    }

    // Absolute fallback if everything fails
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=Failed+to+recover+legacy+workspace', request.url));
  }
}
