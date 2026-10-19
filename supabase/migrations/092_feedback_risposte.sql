-- =============================================================================
-- 092_feedback_risposte.sql
-- Conversazione su un feedback: risposte di admin/gestore e dell'autore del
-- feedback (atleta o maestro), mostrate nelle pagine di dettaglio.
--
-- Accesso solo via API con service role (/api/feedback/[id]/risposte), con
-- controllo di ruolo e ownership nel codice. RLS abilitata SENZA policy: la
-- tabella resta chiusa alla anon key pubblica.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feedback_risposte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  autore_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  messaggio text NOT NULL CHECK (char_length(messaggio) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_risposte_feedback_id_idx
  ON public.feedback_risposte (feedback_id, created_at);

ALTER TABLE public.feedback_risposte ENABLE ROW LEVEL SECURITY;
