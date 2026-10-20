-- =============================================================================
-- 094_avvisi_messaggio.sql
-- Testo descrittivo opzionale sotto il titolo dell'avviso (`testo` resta il
-- titolo mostrato in Bacheca).
-- =============================================================================

ALTER TABLE public.avvisi
  ADD COLUMN IF NOT EXISTS messaggio text
  CHECK (messaggio IS NULL OR char_length(messaggio) <= 1000);
