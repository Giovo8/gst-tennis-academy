-- Migration: Tennis Scoring System
-- Adds sets array and tennis scoring fields to tournament_matches

-- Add sets column to store set-by-set scores
ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS sets JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining sets structure
COMMENT ON COLUMN tournament_matches.sets IS 'Array of sets: [{"player1_score": 6, "player2_score": 3}, ...]';

-- Update existing matches to have empty sets array
UPDATE tournament_matches 
SET sets = '[]'::jsonb 
WHERE sets IS NULL;

-- Add best_of column to tournaments to specify match format (3 or 5 sets)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS best_of INTEGER DEFAULT 3 CHECK (best_of IN (3, 5));

COMMENT ON COLUMN tournaments.best_of IS 'Best of N sets (3 or 5) for match format';

-- Update existing tournaments to best of 3
UPDATE tournaments 
SET best_of = 3 
WHERE best_of IS NULL;
