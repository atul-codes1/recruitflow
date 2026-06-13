import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing email or OTP' }, { status: 400 });
    }

    const supabase = createClient();
    
    // 1. Verify the OTP
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });

    if (authError || !authData.user) {
      // If 'signup' fails, it might be an existing user trying to login via OTP
      const { data: loginData, error: loginError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'magiclink' // Fallback for general OTP login
      });
      
      if (loginError || !loginData.user) {
        return NextResponse.json({ error: authError?.message || loginError?.message || 'Invalid OTP' }, { status: 400 });
      }
      authData.user = loginData.user;
    }

    const user = authData.user;
    const fullName = user.user_metadata?.full_name || 'Unknown Recruiter';
    const domain = user.user_metadata?.domain || email.split('@')[1];

    // 2. Auto-Routing Engine (Requires Admin Client to bypass RLS during setup)
    const adminSupabase = createAdminClient();

    // Check if the user already has a profile
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    // If profile already exists, they are just logging in. Skip creation!
    if (existingProfile) {
      return NextResponse.json({ success: true, message: 'Login successful' });
    }

    // 3. New User Setup - Check if Company exists
    let { data: company } = await adminSupabase
      .from('companies')
      .select('id')
      .eq('domain', domain)
      .single();

    let role = 'recruiter'; // Default to standard recruiter

    // 4. Create Company if it doesn't exist
    if (!company) {
      // The Pioneer! They get Admin rights and we create the company.
      const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1); // e.g., "Nexion"
      
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

    return NextResponse.json({ success: true, message: 'Verification successful' });

  } catch (error) {
    console.error('OTP Verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
