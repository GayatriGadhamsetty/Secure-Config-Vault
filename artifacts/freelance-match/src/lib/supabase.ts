import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabasePublishableKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to Replit Secrets.',
  );
}

// This is the publishable anon key. Row-level security is enabled for every
// user-owned table; never use a Supabase service-role key in the browser.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});
