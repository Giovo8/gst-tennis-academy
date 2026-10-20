-- =============================================================================
-- 095_avvisi_tipo_scadenza_link.sql
-- Bacheca: tipo di avviso (icona/colore in dashboard), data di scadenza oltre
-- la quale l'avviso non viene più mostrato e link interno facoltativo.
-- =============================================================================

ALTER TABLE public.avvisi
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'generale'
    CHECK (tipo IN ('generale', 'evento', 'chiusura', 'importante')),
  ADD COLUMN IF NOT EXISTS visibile_fino date,
  ADD COLUMN IF NOT EXISTS link text
    CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%' AND char_length(link) <= 300));
