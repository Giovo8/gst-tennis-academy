-- Create arena_challenges table for player challenges
CREATE TABLE IF NOT EXISTS public.arena_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'completed', 'cancelled'
  scheduled_date TIMESTAMPTZ,
  court TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  message TEXT, -- Optional challenge message
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score TEXT, -- e.g., "6-4, 6-2"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT challenge_different_players CHECK (challenger_id != opponent_id),
  CONSTRAINT challenge_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled'))
);

-- Create indexes
CREATE INDEX idx_arena_challenges_challenger ON public.arena_challenges(challenger_id, created_at DESC);
CREATE INDEX idx_arena_challenges_opponent ON public.arena_challenges(opponent_id, created_at DESC);
CREATE INDEX idx_arena_challenges_status ON public.arena_challenges(status);
CREATE INDEX idx_arena_challenges_booking ON public.arena_challenges(booking_id);

-- Create arena_stats table for player statistics
CREATE TABLE IF NOT EXISTS public.arena_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ranking INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0.00,
  current_streak INTEGER DEFAULT 0, -- Positive for wins, negative for losses
  longest_win_streak INTEGER DEFAULT 0,
  level TEXT DEFAULT 'Bronzo', -- 'Bronzo', 'Argento', 'Oro', 'Platino', 'Diamante'
  last_match_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT arena_stats_level_check CHECK (level IN ('Bronzo', 'Argento', 'Oro', 'Platino', 'Diamante'))
);

-- Create indexes
CREATE INDEX idx_arena_stats_ranking ON public.arena_stats(ranking ASC);
CREATE INDEX idx_arena_stats_points ON public.arena_stats(points DESC);
CREATE INDEX idx_arena_stats_level ON public.arena_stats(level);

-- Enable Row Level Security
ALTER TABLE public.arena_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for arena_challenges

-- Users can view challenges they're involved in
CREATE POLICY "Users can view their challenges"
ON public.arena_challenges FOR SELECT
USING (
  auth.uid() = challenger_id 
  OR auth.uid() = opponent_id
  OR public.get_my_role() IN ('admin', 'gestore', 'maestro')
);

-- Users can create challenges (as challenger)
CREATE POLICY "Users can create challenges"
ON public.arena_challenges FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

-- Users can update challenges they're involved in
CREATE POLICY "Users can update their challenges"
ON public.arena_challenges FOR UPDATE
USING (
  auth.uid() = challenger_id 
  OR auth.uid() = opponent_id
  OR public.get_my_role() IN ('admin', 'gestore')
);

-- Users can delete challenges they created (only if pending)
CREATE POLICY "Users can delete their pending challenges"
ON public.arena_challenges FOR DELETE
USING (
  auth.uid() = challenger_id 
  AND status = 'pending'
);

-- RLS Policies for arena_stats

-- Everyone can view stats (for leaderboard)
CREATE POLICY "Everyone can view arena stats"
ON public.arena_stats FOR SELECT
USING (true);

-- Only system/admin can create stats
CREATE POLICY "Admin can create arena stats"
ON public.arena_stats FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

-- Only system/admin can update stats
CREATE POLICY "Admin can update arena stats"
ON public.arena_stats FOR UPDATE
USING (public.get_my_role() IN ('admin', 'gestore'));

-- Function to update arena stats when a challenge is completed
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
    
    -- Update winner stats
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
      points = points + 50, -- Base points for a win
      last_match_date = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.winner_id;
    
    -- Update loser stats
    UPDATE public.arena_stats
    SET 
      total_matches = total_matches + 1,
      losses = losses + 1,
      win_rate = (wins::float / (total_matches + 1.0)) * 100,
      current_streak = CASE 
        WHEN current_streak <= 0 THEN current_streak - 1 
        ELSE -1 
      END,
      points = GREATEST(0, points - 20), -- Lose points but not below 0
      last_match_date = NOW(),
      updated_at = NOW()
    WHERE user_id = loser_id;
    
    -- Update levels based on points
    UPDATE public.arena_stats
    SET level = CASE
      WHEN points >= 2500 THEN 'Diamante'
      WHEN points >= 2000 THEN 'Platino'
      WHEN points >= 1500 THEN 'Oro'
      WHEN points >= 800 THEN 'Argento'
      ELSE 'Bronzo'
    END
    WHERE user_id IN (NEW.winner_id, loser_id);
    
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_arena_stats ON public.arena_challenges;
CREATE TRIGGER trigger_update_arena_stats
AFTER INSERT OR UPDATE ON public.arena_challenges
FOR EACH ROW
EXECUTE FUNCTION update_arena_stats_on_challenge_complete();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_arena_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_arena_challenges_timestamp
BEFORE UPDATE ON public.arena_challenges
FOR EACH ROW
EXECUTE FUNCTION update_arena_challenges_updated_at();

CREATE TRIGGER update_arena_stats_timestamp
BEFORE UPDATE ON public.arena_stats
FOR EACH ROW
EXECUTE FUNCTION update_arena_challenges_updated_at();

-- Insert initial stats for existing athletes
INSERT INTO public.arena_stats (user_id)
SELECT id FROM public.profiles WHERE role = 'atleta'
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.arena_challenges IS 'Stores challenges between athletes in the Arena';
COMMENT ON TABLE public.arena_stats IS 'Stores statistics and rankings for athletes in the Arena';
