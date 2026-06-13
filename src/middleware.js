import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          supabaseResponse.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options });
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          supabaseResponse.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // If trying to access the legacy /dashboard route without a domain, intercept it.
  // Actually, we don't have a /dashboard route anymore.
  if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // We can't query the profile here easily (middleware runs on Edge).
    // The `layout.js` inside `/[domain]/dashboard` handles the strict domain isolation.
    // So if they just hit `/dashboard`, we should ideally redirect to their tenant.
    // But since we can't easily fetch their domain here, we can redirect them to the auth callback 
    // to auto-route them, OR let a small catch-all page route them.
    // Actually, `layout.js` does the routing! But wait, `/[domain]/dashboard` requires the domain in the URL!
    // So `/dashboard` will 404 because it doesn't match `/[domain]/dashboard`.
    // Let's redirect `/dashboard` to an API route or callback that can fetch their domain and redirect them.
    url.pathname = '/api/auth/route-tenant';
    return NextResponse.redirect(url);
  }

  // Protect /[domain]/dashboard routes from unauthenticated users
  if (url.pathname.match(/^\/[^\/]+\/dashboard/)) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
