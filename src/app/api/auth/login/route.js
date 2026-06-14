import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 * 
 * Authenticates a user using Supabase Auth (Email & Password).
 * 
 * On success, Supabase automatically sets the session cookies in the user's browser
 * (which are configured in `src/lib/supabase/server.js`).
 * 
 * @param {Request} request - The incoming HTTP request.
 * @returns {NextResponse} - Returns user object on success, or 401 on invalid credentials.
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Initialize the Supabase Server Client (which hooks into Next.js Cookies)
    const supabase = await createClient();

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Note: The actual session cookie is set silently by `createClient` inside Next.js cookies.
    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
