import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase Browser Client (SSR Compatible)
 * 
 * Used EXCLUSIVELY inside React Client Components (`'use client'`).
 * This client automatically handles reading/writing the `sb-[project]-auth-token` 
 * cookie from the browser's `document.cookie`.
 * 
 * Do NOT use this inside API routes or Server Components.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
