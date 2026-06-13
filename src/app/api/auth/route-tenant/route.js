import { createClient } from '@/lib/supabase/server';
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
    // Edge Case: They logged in but the profile wasn't created (ghost session).
    // Sign them out automatically to clear the bad state.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=Invalid+Workspace.+Please+register+again.', request.url));
  }
}
