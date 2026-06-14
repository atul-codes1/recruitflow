import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Supabase Middleware Session Updater
 * 
 * This function intercepts requests at the Edge (before they hit Server Components)
 * to check if the user's JWT access token has expired. If it has, it uses the 
 * refresh token to generate a new session and writes the new cookie back to the response.
 * 
 * This is CRITICAL for SSR because Next.js Server Components cannot set cookies.
 * 
 * @param {Request} request - The incoming Edge request.
 * @returns {NextResponse} - The modified response containing fresh auth cookies.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Trigger token refresh validation
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ------------------------------------------------------------------------
  // ROUTE PROTECTION
  // ------------------------------------------------------------------------
  // If the user is unauthenticated and tries to hit ANY `/dashboard` route,
  // we immediately redirect them to `/login` before rendering the page.
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
