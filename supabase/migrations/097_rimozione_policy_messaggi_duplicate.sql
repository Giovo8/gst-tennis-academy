-- =============================================================================
-- 097 — Rimozione delle policy duplicate su internal_messages
-- =============================================================================
-- Contesto (ottobre 2026): dopo la 096 su internal_messages risultavano anche
-- "internal_messages_insert_policy" e "internal_messages_select_policy",
-- create a mano dallo SQL Editor e assenti dalle migrazioni. Le policy
-- permissive si sommano in OR: finché restano, i controlli della 096
-- (scrittura nei gruppi solo per i membri, lettura dei soli messaggi propri e
-- dei propri gruppi) possono essere aggirati.
--
-- Le policy della 096 coprono già tutti gli usi dell'app (messaggi diretti dal
-- client, gruppi via /api/chat-groups con service role, che bypassa la RLS).
--
-- Per vedere cosa permettevano prima di eliminarle:
--   select policyname, cmd, qual, with_check
--   from pg_policies where tablename = 'internal_messages';
-- Idempotente.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "internal_messages_insert_policy" ON public.internal_messages;
DROP POLICY IF EXISTS "internal_messages_select_policy" ON public.internal_messages;

COMMIT;
