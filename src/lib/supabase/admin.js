import { createClient } from '@supabase/supabase-js';

// This client uses the Service Role Key to bypass RLS.
// WARNING: NEVER USE THIS ON THE FRONTEND OR FOR REGULAR USER OPERATIONS!
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
