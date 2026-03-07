import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://hwoywqlmyzgraosqdhxa.supabase.co";
// Use the anon (public) key so RLS policies are enforced.
// Get this from Supabase Dashboard → Settings → API → anon/public key
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.warn("VITE_SUPABASE_ANON_KEY is not set. Get it from Supabase Dashboard → Settings → API.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
