import { createClient } from "@supabase/supabase-js";

// ⚠️ SICUREZZA: Non usare MAI NEXT_PUBLIC_ per la service role key!
// La service role key bypassa RLS e deve essere usata SOLO lato server
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[supabase] Missing SUPABASE_URL. Ensure env vars are set.");
  }
}

if (!supabaseServiceRole && process.env.NODE_ENV !== "test") {
  if (process.env.NODE_ENV === "development") {
    console.warn("[supabase] Missing SUPABASE_SERVICE_ROLE_KEY. Server operations will fail.");
  }
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});
