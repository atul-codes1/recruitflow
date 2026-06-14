import { createClient } from '@supabase/supabase-js';

/**
 * [LEGACY] Standard Supabase Client
 * 
 * DEPRECATION WARNING:
 * This client does NOT use `@supabase/ssr` and is completely ignorant of Next.js cookies.
 * It was used in the original v1.0 prototype.
 * 
 * Modern code should import from `@/lib/supabase/client` or `@/lib/supabase/server`.
 * This file is only kept for legacy scripts that run completely outside the Next.js runtime.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

import fetch from 'cross-fetch';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch }
});
