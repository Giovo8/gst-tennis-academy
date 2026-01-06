-- Verify Arena Stats Integrity (No Draws in Tennis)
-- In tennis, total_matches MUST always equal wins + losses

-- Check if any records violate this rule
SELECT 
  user_id,
  total_matches,
  wins,
  losses,
  (wins + losses) as calculated_total,
  (total_matches - (wins + losses)) as difference,
  win_rate,
  ((wins::float / NULLIF(total_matches, 0)) * 100) as calculated_win_rate
FROM public.arena_stats
WHERE total_matches != (wins + losses)
   OR total_matches < 0
   OR wins < 0
   OR losses < 0
   OR wins > total_matches
   OR losses > total_matches;

-- Fix any inconsistent data
UPDATE public.arena_stats
SET total_matches = (wins + losses),
    win_rate = CASE 
      WHEN (wins + losses) > 0 THEN (wins::float / (wins + losses)::float) * 100
      ELSE 0
    END,
    updated_at = NOW()
WHERE total_matches != (wins + losses);

-- Show results after fix
SELECT 
  COUNT(*) as total_players,
  SUM(total_matches) as total_matches_played,
  SUM(wins) as total_wins,
  SUM(losses) as total_losses,
  AVG(win_rate) as avg_win_rate
FROM public.arena_stats
WHERE total_matches > 0;

-- Verify: This should return 0 rows (all data is now consistent)
SELECT COUNT(*) as inconsistent_records
FROM public.arena_stats
WHERE total_matches != (wins + losses);

