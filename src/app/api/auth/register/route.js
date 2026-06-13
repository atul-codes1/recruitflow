import { createClient } from '@/lib/supabase/server';
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

    // 2. Setup Supabase Client
    const supabase = createClient();

    // 3. Register the user with Supabase Auth
    // Supabase will automatically send the Magic Link email.
    const origin = new URL(request.url).origin;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: fullName,
          domain: domain
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success! The OTP email is on its way to the user.
    return NextResponse.json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
