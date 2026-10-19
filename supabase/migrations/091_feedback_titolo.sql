-- =============================================================================
-- 091_feedback_titolo.sql
-- Titolo del feedback (campo breve mostrato nelle liste). Nullable perché i
-- feedback inseriti prima di questa migrazione non ce l'hanno; l'obbligo di
-- compilarlo è applicato dall'API (createFeedbackSchema).
-- =============================================================================

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS titolo text
  CHECK (titolo IS NULL OR char_length(titolo) BETWEEN 3 AND 100);
