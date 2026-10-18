import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

/**
 * Utente corrente lato browser, letto dalla sessione locale (cookie) senza
 * chiamate di rete. Ha la stessa forma di `supabase.auth.getUser()`, così può
 * sostituirlo nei componenti client.
 *
 * `getUser()` interroga ogni volta il server Auth (un round-trip prima di ogni
 * caricamento dati); qui basta l'id utente per filtrare le query, mentre la
 * validità del token viene comunque verificata da Supabase (RLS) e dalle API
 * (`verifyAuth`). Se il token è scaduto, `getSession()` lo rinnova da solo.
 *
 * Da NON usare lato server: lì serve sempre `getUser()`.
 */
export async function getSessionUser(): Promise<{ data: { user: User | null }; error: null }> {
  const { data } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null }, error: null };
}
