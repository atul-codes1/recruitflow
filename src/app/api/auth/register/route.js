import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// Blocklist of popular free/disposable email domains
const FREE_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
  'aol.com', 'icloud.com', 'protonmail.com', 'yandex.com', 'mail.ru'
]);

export async function POST(request) {
  try {
    const { fullName, email, password } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Corporate Email Validation
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || FREE_DOMAINS.has(domain)) {
      return NextResponse.json({ 
        error: 'Please use your official corporate work email to register. Personal emails are not allowed.' 
      }, { status: 403 });
    }

    // 2. Setup Supabase Admin Client to bypass email limits
    const supabaseAdmin = createAdminClient();

    // 3. Register the user and auto-confirm them to bypass Free Tier email limits
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        domain: domain
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const user = authData.user;

    // 4. Auto-provision Workspace right now (replaces auth/callback)
    let { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('domain', domain)
      .single();

    let role = 'recruiter';

    if (!company) {
      const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({ name: companyName, domain: domain })
        .select()
        .single();

      if (companyError) throw companyError;
      company = newCompany;
      role = 'admin';
    }

    // 5. Create Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        company_id: company.id,
        role: role,
        full_name: fullName
      });

    if (profileError) throw profileError;

    // Success! The user is fully provisioned and can instantly login.
    return NextResponse.json({ success: true, message: 'Workspace created successfully. You can now log in!' });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
