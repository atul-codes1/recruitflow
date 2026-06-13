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
    // SECURITY: The user has a ghost session from before the auto-provisioning was built.
    // We will not auto-generate the workspace here to prevent security flaws.
    // Instead, we force the user to re-register to go through the proper domain validation flow.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=Invalid+Workspace.+For+security+reasons,+please+re-register+your+account+to+provision+your+workspace.', request.url));
  }
}
