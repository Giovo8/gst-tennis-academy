-- Fix Arena Challenge System to enforce NO DRAWS (Tennis rule)
-- In tennis, there are NEVER draws - every match must have a winner

-- Add constraint to ensure completed challenges always have a winner
ALTER TABLE public.arena_challenges 
ADD CONSTRAINT check_completed_has_winner 
CHECK (
  (status != 'completed') OR 
  (status = 'completed' AND winner_id IS NOT NULL)
);

-- Add comment explaining the rule
COMMENT ON CONSTRAINT check_completed_has_winner ON public.arena_challenges 
IS 'Tennis rule: completed matches must always have a winner (no draws allowed)';

-- Verify existing data complies with the rule
-- This will show any completed challenges without a winner (should be empty)
SELECT 
  id, 
  challenger_id, 
  opponent_id, 
  status, 
  winner_id,
  score,
  created_at
FROM public.arena_challenges
WHERE status = 'completed' AND winner_id IS NULL;

-- Optional: If any invalid data exists, you can either:
-- 1. Delete those records: DELETE FROM arena_challenges WHERE status = 'completed' AND winner_id IS NULL;
-- 2. Or reset them to pending: UPDATE arena_challenges SET status = 'pending' WHERE status = 'completed' AND winner_id IS NULL;

