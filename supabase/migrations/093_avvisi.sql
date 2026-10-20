-- =============================================================================
-- 093_avvisi.sql
-- Avvisi scritti da admin/gestore e mostrati agli atleti nella sezione
-- "Bacheca" della dashboard (solo quelli attivi).
--
-- Accesso solo via API con service role (/api/avvisi, /api/admin/avvisi), con
-- controllo di ruolo nel codice. RLS abilitata SENZA policy: la tabella resta
-- chiusa alla anon key pubblica.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.avvisi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testo text NOT NULL CHECK (char_length(testo) BETWEEN 1 AND 120),
  attivo boolean NOT NULL DEFAULT true,
  autore_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avvisi_attivo_created_at_idx
  ON public.avvisi (attivo, created_at DESC);

ALTER TABLE public.avvisi ENABLE ROW LEVEL SECURITY;
