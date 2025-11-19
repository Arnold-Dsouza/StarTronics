import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, serviceRoleKey: string) {
  // Using service role key for backend privileged operations (never expose publicly)
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Helper for anon client (if needed later e.g., public reads)
export function createAnonSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey);
}