import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client with service role key
 * Use this in Server Actions to bypass RLS policies
 * Only available if SUPABASE_SERVICE_ROLE_KEY is set
 */
export const supabaseServer = serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Fallback to regular client if service role key is not available
 * This will still respect RLS but may fail if RLS policies require auth.uid()
 */
export const supabaseFallback = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

/**
 * Default database client - uses service role if available, otherwise falls back to anon key
 * Import this in server actions and route handlers
 */
export const db = supabaseServer ?? supabaseFallback;
