-- Migration 045: Update Arena points system to match-result-based scoring
-- 
-- Best-of-3 format:
--   2-0 (clean sweep)   → winner +30 pts, loser +0 pts
--   2-1 (fought match)  → winner +20 pts, loser +10 pts
--
-- Best-of-5 format:
--   3-0 (clean sweep)   → winner +30 pts, loser +0 pts
--   3-1                 → winner +25 pts, loser +5 pts
--   3-2 (fought match)  → winner +20 pts, loser +10 pts
--
-- Points are ADDED (never subtracted). Losing a match awards 0 pts in BO3/BO5 clean,
-- or up to 10 pts in fought matches. The old +50/-20 system is replaced.

CREATE OR REPLACE FUNCTION update_arena_stats_on_challenge_complete()
RETURNS TRIGGER AS $$
DECLARE
  loser_id UUID;
  winner_sets_won INTEGER;
  loser_sets_won INTEGER;
  winner_pts INTEGER;
  loser_pts INTEGER;
  set_rec RECORD;
BEGIN
  -- Only process when status changes to 'completed' with a winner set
  IF NEW.status = 'completed'
     AND NEW.winner_id IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'completed' OR OLD.winner_id IS NULL)
  THEN

    -- Determine loser
    IF NEW.winner_id = NEW.challenger_id THEN
      loser_id := NEW.opponent_id;
    ELSE
      loser_id := NEW.challenger_id;
    END IF;

    -- Ensure stats rows exist for both players
    INSERT INTO public.arena_stats (user_id) VALUES (NEW.winner_id) ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.arena_stats (user_id) VALUES (loser_id)      ON CONFLICT (user_id) DO NOTHING;

    -- Parse score string (format: "6-4, 3-6, 6-2") to count sets won by each side
    winner_sets_won := 0;
    loser_sets_won  := 0;

    IF NEW.score IS NOT NULL AND trim(NEW.score) != '' THEN
      FOR set_rec IN
        SELECT
          split_part(trim(s), '-', 1)::int AS left_g,
          split_part(trim(s), '-', 2)::int AS right_g
        FROM unnest(string_to_array(trim(NEW.score), ',')) AS s
        WHERE trim(s) ~ '^\d+-\d+$'
      LOOP
        IF NEW.winner_id = NEW.challenger_id THEN
          -- Winner is challenger: left_g > right_g means winner won this set
          IF set_rec.left_g > set_rec.right_g THEN
            winner_sets_won := winner_sets_won + 1;
          ELSE
            loser_sets_won := loser_sets_won + 1;
          END IF;
        ELSE
          -- Winner is opponent: right_g > left_g means winner won this set
          IF set_rec.right_g > set_rec.left_g THEN
            winner_sets_won := winner_sets_won + 1;
          ELSE
            loser_sets_won := loser_sets_won + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Assign points based on set-level result
    IF loser_sets_won = 0 THEN
      -- Clean sweep: 2-0 or 3-0
      winner_pts := 30;
      loser_pts  := 0;
    ELSIF winner_sets_won = 3 AND loser_sets_won = 1 THEN
      -- Best-of-5: 3-1
      winner_pts := 25;
      loser_pts  := 5;
    ELSE
      -- Fought match: 2-1 or 3-2
      winner_pts := 20;
      loser_pts  := 10;
    END IF;

    -- Update winner stats
    UPDATE public.arena_stats
    SET
      total_matches      = total_matches + 1,
      wins               = wins + 1,
      win_rate           = ((wins + 1.0) / (total_matches + 1.0)) * 100,
      current_streak     = CASE WHEN current_streak >= 0 THEN current_streak + 1 ELSE 1 END,
      longest_win_streak = GREATEST(longest_win_streak,
                             CASE WHEN current_streak >= 0 THEN current_streak + 1 ELSE 1 END),
      points             = points + winner_pts,
      last_match_date    = NOW(),
      updated_at         = NOW()
    WHERE user_id = NEW.winner_id;

    -- Update loser stats
    UPDATE public.arena_stats
    SET
      total_matches   = total_matches + 1,
      losses          = losses + 1,
      win_rate        = (wins::float / (total_matches + 1.0)) * 100,
      current_streak  = CASE WHEN current_streak <= 0 THEN current_streak - 1 ELSE -1 END,
      points          = points + loser_pts,
      last_match_date = NOW(),
      updated_at      = NOW()
    WHERE user_id = loser_id;

    -- Recalculate global rankings
    WITH ranked_users AS (
      SELECT
        user_id,
        ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, win_rate DESC) AS new_ranking
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

-- Recreate trigger (drop first to guarantee clean state)
DROP TRIGGER IF EXISTS trigger_update_arena_stats ON public.arena_challenges;

CREATE TRIGGER trigger_update_arena_stats
AFTER INSERT OR UPDATE ON public.arena_challenges
FOR EACH ROW
EXECUTE FUNCTION update_arena_stats_on_challenge_complete();
