-- Migration: Support External Players in Tournaments
-- Allows adding players to tournaments without requiring a Supabase auth account.
-- Useful for importing external championships (e.g., from score7.io).
-- Date: 2026-03-21

-- 1. Add player_name column for external players who don't have app accounts
ALTER TABLE public.tournament_participants
  ADD COLUMN IF NOT EXISTS player_name TEXT;

-- 2. Make user_id nullable (external players won't have an app account)
ALTER TABLE public.tournament_participants
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Drop the FK constraint to auth.users (external players don't exist there)
ALTER TABLE public.tournament_participants
  DROP CONSTRAINT IF EXISTS fk_user_id;

-- 4. Add a CHECK constraint: either user_id or player_name must be provided
ALTER TABLE public.tournament_participants
  DROP CONSTRAINT IF EXISTS participant_identity_check;

ALTER TABLE public.tournament_participants
  ADD CONSTRAINT participant_identity_check
  CHECK (user_id IS NOT NULL OR player_name IS NOT NULL);

-- 5. Add a source column to distinguish internal vs external tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS external_source TEXT;
  -- e.g. 'score7:ijmxbvwrep' to identify the origin

COMMENT ON COLUMN public.tournament_participants.player_name IS 'Name of external player without an app account';
COMMENT ON COLUMN public.tournament_participants.user_id IS 'App user account (nullable for external players)';
COMMENT ON COLUMN public.tournaments.external_source IS 'Source identifier for externally imported tournaments (e.g. score7:tournamentId)';
