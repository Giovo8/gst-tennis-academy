-- Ensure arena_challenges.status supports all app statuses, including awaiting_score.
-- Idempotent and resilient to legacy constraint names.

DO $$
BEGIN
  -- If status is not text for any legacy reason, normalize it to text.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'arena_challenges'
      AND column_name = 'status'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.arena_challenges
      ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop any CHECK constraint on arena_challenges that validates status values.
  FOR r IN
    SELECT c.conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'arena_challenges'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.arena_challenges DROP CONSTRAINT IF EXISTS %I',
      r.constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_status_check
  CHECK (status IN (
    'pending',
    'accepted',
    'awaiting_score',
    'declined',
    'cancelled',
    'completed',
    'counter_proposal'
  ));
