-- Fix arena levels to match the correct point thresholds
-- and ensure levels are automatically updated when points change

-- Create function to calculate level based on points
CREATE OR REPLACE FUNCTION calculate_arena_level(points_value INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN points_value >= 500 THEN 'Diamante'
    WHEN points_value >= 300 THEN 'Platino'
    WHEN points_value >= 150 THEN 'Oro'
    WHEN points_value >= 50 THEN 'Argento'
    ELSE 'Bronzo'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function to auto-update level when points change
CREATE OR REPLACE FUNCTION update_arena_level_on_points_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := calculate_arena_level(NEW.points);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_arena_level ON public.arena_stats;

-- Create trigger
CREATE TRIGGER trigger_update_arena_level
BEFORE INSERT OR UPDATE OF points ON public.arena_stats
FOR EACH ROW
EXECUTE FUNCTION update_arena_level_on_points_change();

-- Update all existing records to have correct levels
UPDATE public.arena_stats
SET level = calculate_arena_level(points);

-- Update the challenge completion function to use correct point values
CREATE OR REPLACE FUNCTION update_arena_stats_on_challenge_complete()
RETURNS TRIGGER AS $$
DECLARE
  winner_record RECORD;
  loser_record RECORD;
  loser_id UUID;
BEGIN
  -- Only proceed if challenge is being marked as completed and has a winner
  IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Determine loser
    IF NEW.winner_id = NEW.challenger_id THEN
      loser_id := NEW.opponent_id;
    ELSE
      loser_id := NEW.challenger_id;
    END IF;
    
    -- Ensure stats exist for both players
    INSERT INTO public.arena_stats (user_id)
    VALUES (NEW.winner_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.arena_stats (user_id)
    VALUES (loser_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update winner stats (+10 points for win)
    UPDATE public.arena_stats
    SET 
      total_matches = total_matches + 1,
      wins = wins + 1,
      win_rate = ((wins + 1.0) / (total_matches + 1.0)) * 100,
      current_streak = CASE 
        WHEN current_streak >= 0 THEN current_streak + 1 
        ELSE 1 
      END,
      longest_win_streak = GREATEST(longest_win_streak, CASE 
        WHEN current_streak >= 0 THEN current_streak + 1 
        ELSE 1 
      END),
      points = points + 10, -- +10 points for win
      last_match_date = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.winner_id;
    
    -- Update loser stats (no points change for loss)
    UPDATE public.arena_stats
    SET 
      total_matches = total_matches + 1,
      losses = losses + 1,
      win_rate = (wins::float / (total_matches + 1.0)) * 100,
      current_streak = CASE 
        WHEN current_streak <= 0 THEN current_streak - 1 
        ELSE -1 
      END,
      last_match_date = NOW(),
      updated_at = NOW()
    WHERE user_id = loser_id;
    
    -- Recalculate rankings (simple point-based ranking)
    WITH ranked_users AS (
      SELECT 
        user_id,
        ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, win_rate DESC) as new_ranking
      FROM public.arena_stats
    )
    UPDATE public.arena_stats s
    SET ranking = r.new_ranking
    FROM ranked_users r
    WHERE s.user_id = r.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the levels are correct
SELECT 
  user_id,
  points,
  level,
  calculate_arena_level(points) as correct_level,
  CASE WHEN level != calculate_arena_level(points) THEN 'MISMATCH' ELSE 'OK' END as status
FROM public.arena_stats
ORDER BY points DESC;
