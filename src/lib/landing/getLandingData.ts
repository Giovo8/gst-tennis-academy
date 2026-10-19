import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger/secure-logger';

/**
 * Dati pubblici della home letti lato server, così la pagina arriva al browser
 * già completa (niente segnaposto) e resta in cache ISR (vedi `revalidate` in
 * app/page.tsx).
 *
 * Chiave anon e nessun cookie: valgono le stesse policy RLS di un visitatore
 * anonimo e la pagina resta statica. `null` = lettura fallita: la sezione
 * ripiega sul caricamento nel browser.
 */
function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const LANDING_NEWS_COLUMNS =
  'id, title, category, content, excerpt, image_url, stato, is_published, published_at, created_at';
const LANDING_NEWS_LIMIT = 12;

export async function getLandingNews() {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('news')
    .select(LANDING_NEWS_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(LANDING_NEWS_LIMIT);
  if (error) {
    logger.error('Lettura news per la home fallita', error);
    return null;
  }
  // La card mostra al massimo 120 caratteri del testo: non serve spedire l'articolo intero
  return (data ?? []).map((item) => ({ ...item, content: (item.content ?? '').slice(0, 200) }));
}

export async function getLandingStaff() {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('staff')
    .select(
      'id, full_name, role, order_index, bio, image_url, facebook_url, instagram_url, linkedin_url, twitter_url',
    )
    .eq('active', true)
    .order('order_index', { ascending: true, nullsFirst: false });
  if (error) {
    logger.error('Lettura staff per la home fallita', error);
    return null;
  }
  return data ?? [];
}
