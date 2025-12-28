-- Migration: 002_rls_policies_tournaments.sql
-- Abilita RLS e aggiunge policy di base per tournaments e tournament_participants

-- Abilita RLS su tables
ALTER TABLE IF EXISTS public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Policy: tornei pubblici visibili (status = 'Aperto')
-- Policy: allow selecting tournaments that are public (status = 'Aperto'),
-- or those owned by the requesting user, or visible to gestore/admin roles.
DROP POLICY IF EXISTS "select_public_owner_manager" ON public.tournaments;
CREATE POLICY "select_public_owner_manager"
ON public.tournaments
FOR SELECT
USING (
  status = 'Aperto'
  OR auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('gestore','admin')
  )
);

DROP POLICY IF EXISTS "manage_tournaments_by_owner_or_role" ON public.tournaments;
CREATE POLICY "manage_tournaments_by_owner_or_role"
ON public.tournaments
FOR ALL
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('gestore','admin')
  )
)
WITH CHECK (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('gestore','admin')
  )
);

DROP POLICY IF EXISTS "select_own_participations" ON public.tournament_participants;
CREATE POLICY "select_own_participations"
ON public.tournament_participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('gestore','admin')
  )
);

DROP POLICY IF EXISTS "insert_participation_when_space" ON public.tournament_participants;
CREATE POLICY "insert_participation_when_space"
ON public.tournament_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    (SELECT COUNT(*) FROM public.tournament_participants tp WHERE tp.tournament_id = tournament_id) <
    (SELECT COALESCE(max_participants,0) FROM public.tournaments t WHERE t.id = tournament_id)
  )
);

DROP POLICY IF EXISTS "delete_participation_owner_or_role" ON public.tournament_participants;
CREATE POLICY "delete_participation_owner_or_role"
ON public.tournament_participants
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('gestore','admin')
  )
);

-- Nota: le policy qui fornite sono di base. Se il tuo schema `profiles` usa una colonna diversa
-- per il ruolo o se gestisci i ruoli in un altro modo, adatta le queries sopra.
