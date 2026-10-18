-- =============================================================================
-- 089 — Codici invito non più leggibili pubblicamente
-- =============================================================================
-- La policy "Anyone can validate a specific code" (migrazione 015) era
-- FOR SELECT USING (true): chiunque, con la anon key pubblica, poteva leggere
-- TUTTI i codici invito con il relativo ruolo e usarli per registrarsi.
--
-- Non serve più a nessuno:
--   - la pagina /register valida il codice con GET /api/invite-codes/validate,
--     che usa la service role key;
--   - POST /api/auth/signup rilegge e consuma il codice con la service role e
--     ricava il ruolo dal codice stesso (non più dal client);
--   - le pagine /dashboard/admin/invite-codes leggono come admin/gestore,
--     coperte dalla policy "Admin/Gestore can view invite codes".
--
-- Non distruttiva: rimuove solo una policy, nessun dato.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can validate a specific code" ON public.invite_codes;
