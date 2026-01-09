-- Fix foreign key constraints for arena_challenges table
-- This resolves the error: "Could not find a relationship between 'arena_challenges' and 'profiles'"

-- Drop existing foreign keys if they exist
ALTER TABLE IF EXISTS public.arena_challenges 
  DROP CONSTRAINT IF EXISTS arena_challenges_challenger_id_fkey,
  DROP CONSTRAINT IF EXISTS arena_challenges_opponent_id_fkey,
  DROP CONSTRAINT IF EXISTS arena_challenges_winner_id_fkey;

-- Re-add foreign keys that reference profiles table instead of auth.users
ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_challenger_id_fkey 
    FOREIGN KEY (challenger_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT arena_challenges_opponent_id_fkey 
    FOREIGN KEY (opponent_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT arena_challenges_winner_id_fkey 
    FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Verify the constraints were added
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = 'public.arena_challenges'::regclass
  AND contype = 'f';
