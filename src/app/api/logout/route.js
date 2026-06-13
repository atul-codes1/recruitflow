import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Sign out properly from Supabase (this clears the sb-xxxx-auth-token cookies)
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });
  
  // Also add caching headers so bfcache doesn't restore the authenticated page!
  response.headers.set('Cache-Control', 'no-store, max-age=0');

  return response;
}
