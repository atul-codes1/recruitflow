import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Service Role Client (Admin / God Mode)
 * 
 * This client uses the `SUPABASE_SERVICE_ROLE_KEY` to completely bypass Row Level Security (RLS).
 * It acts as the database administrator.
 * 
 * USE CASES:
 * 1. Webhook processing (where there is no user session).
 * 2. Background Queue Workers (QStash).
 * 3. Auto-provisioning users during B2B registration (bypassing email confirmation limits).
 * 
 * WARNING: NEVER USE THIS ON THE FRONTEND OR FOR REGULAR USER OPERATIONS!
 * If this key leaks to the client, an attacker has full control over the database.
 */
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // You MUST add this to your .env.local!
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
