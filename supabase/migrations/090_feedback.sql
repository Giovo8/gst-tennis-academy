-- =============================================================================
-- 090_feedback.sql
-- Feedback di atleti e maestri sulla web app (fase di sviluppo), consultabili
-- da admin/gestore in /dashboard/admin/feedback.
--
-- Accesso solo via API route con service role (/api/feedback e
-- /api/admin/feedback), con controllo di ruolo e ownership nel codice.
-- La RLS è abilitata SENZA policy: la tabella resta chiusa alla anon key
-- pubblica; la service role la ignora.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  categoria text NOT NULL CHECK (categoria IN ('suggerimento', 'problema', 'altro')),
  messaggio text NOT NULL CHECK (char_length(messaggio) BETWEEN 5 AND 2000),
  stato text NOT NULL DEFAULT 'nuovo' CHECK (stato IN ('nuovo', 'letto', 'archiviato')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx
  ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_stato_created_at_idx
  ON public.feedback (stato, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx
  ON public.feedback (user_id, created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feedback_updated_at_trigger ON public.feedback;
CREATE TRIGGER update_feedback_updated_at_trigger
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_feedback_updated_at();
