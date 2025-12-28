import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceRole) {
  // Warning only: in tests the module is mocked, in production these should be set
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing SUPABASE_URL or SERVICE_ROLE key. Ensure env vars are set.');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});
