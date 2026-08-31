// Supabase client — pinned to NEW project smcwrriaraptzjhqdktg.
// URL/key are hardcoded here to override any stale env (Lovable Cloud
// auto-generated .env may still point at the old project bmtjibrqehallcnjhjlf).
// The key below is the project's PUBLISHABLE (public) key — safe for the
// browser and RLS-protected, same anon role as the legacy JWT it replaces.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabaseUrl = "https://smcwrriaraptzjhqdktg.supabase.co";
export const supabaseAnonKey = "sb_publishable_U-PDGrDaiMX5ldaVQeFldA_R7Yn3rKV";
const SUPABASE_URL = supabaseUrl;
const SUPABASE_PUBLISHABLE_KEY = supabaseAnonKey;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
  }
});
