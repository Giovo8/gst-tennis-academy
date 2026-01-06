-- Add match configuration fields to arena_challenges table

-- Add new columns for match configuration
ALTER TABLE public.arena_challenges 
  ADD COLUMN IF NOT EXISTS match_format TEXT DEFAULT 'best_of_3' CHECK (match_format IN ('best_of_1', 'best_of_3', 'best_of_5')),
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'singolo' CHECK (match_type IN ('singolo', 'doppio')),
  ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT 'ranked' CHECK (challenge_type IN ('ranked', 'amichevole')),
  ADD COLUMN IF NOT EXISTS my_partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opponent_partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.arena_challenges.match_format IS 'Match format: best of 1, 3, or 5 sets';
COMMENT ON COLUMN public.arena_challenges.duration_minutes IS 'Estimated match duration in minutes';
COMMENT ON COLUMN public.arena_challenges.match_type IS 'Single or double match';
COMMENT ON COLUMN public.arena_challenges.challenge_type IS 'Ranked (affects ranking) or friendly (just for fun)';
COMMENT ON COLUMN public.arena_challenges.my_partner_id IS 'Partner ID for challenger in doubles matches';
COMMENT ON COLUMN public.arena_challenges.opponent_partner_id IS 'Partner ID for opponent in doubles matches';
