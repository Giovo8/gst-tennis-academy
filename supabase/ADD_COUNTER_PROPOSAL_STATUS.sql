-- Add 'counter_proposal' to valid challenge statuses
-- This status is used when the opponent proposes modifications to a challenge
-- requiring confirmation from the original challenger

-- First, check current constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public' 
  AND constraint_name LIKE '%arena_challenges%status%';

-- Drop existing constraint if exists
ALTER TABLE arena_challenges 
DROP CONSTRAINT IF EXISTS arena_challenges_status_check;

-- Add new constraint with counter_proposal status
ALTER TABLE arena_challenges
ADD CONSTRAINT arena_challenges_status_check 
CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'cancelled', 'counter_proposal'));

-- Verify the change
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public' 
  AND constraint_name = 'arena_challenges_status_check';

-- Show current challenges to ensure no data issues
SELECT id, status, challenger_id, opponent_id, created_at
FROM arena_challenges
ORDER BY created_at DESC
LIMIT 10;
