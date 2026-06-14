import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js Edge Middleware
 * 
 * This file runs on Vercel's Edge Network before a request ever hits a Server Component
 * or API route. It serves two primary functions:
 * 1. Supabase Session Management (refreshing expired tokens).
 * 2. Multi-Tenant Route Protection (enforcing authentication and redirecting wildcards).
 * 
 * Note: Since this runs on the Edge, we cannot use `pg` or `@supabase/supabase-js` to
 * query the database directly. We can only read cookies and JWTs.
 */
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // ------------------------------------------------------------------------
  // 1. SUPABASE SESSION REFRESH (Crucial for SSR)
  // ------------------------------------------------------------------------
  // We recreate the client here solely to let Supabase read the cookie and 
  // determine if the JWT needs to be refreshed. If it does, Supabase will
  // overwrite the cookie in `supabaseResponse`.
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

  // This call actually triggers the token refresh logic.
  const { data: { user } } = await supabase.auth.getUser();

  // ------------------------------------------------------------------------
  // 2. ROUTE PROTECTION & MULTI-TENANCY INTERCEPTS
  // ------------------------------------------------------------------------
  const url = request.nextUrl.clone();

  // If a user types `recruitflow.com/dashboard` (without their company domain),
  // they will hit a 404 because our folders are structured as `/[domain]/dashboard`.
  // We intercept this and send them to the `route-tenant` API which will look up
  // their company domain in the DB and redirect them appropriately.
  if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    url.pathname = '/api/auth/route-tenant';
    return NextResponse.redirect(url);
  }

  // Protect all `/[domain]/dashboard` routes from unauthenticated users.
  // The Regex matches any string that looks like `/acme/dashboard...`
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
