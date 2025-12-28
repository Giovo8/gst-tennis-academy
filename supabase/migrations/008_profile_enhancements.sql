-- Migration: Profile Enhancement for Tennis Athletes
-- Date: 2025-12-28

-- Step 1: Add new profile fields for enhanced user profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_times VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR[],
ADD COLUMN IF NOT EXISTS skill_level VARCHAR(50) DEFAULT 'principiante',
ADD COLUMN IF NOT EXISTS tennis_stats JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS profile_completion_percentage INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb;

-- Step 2: Add constraints for skill_level
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_skill_level_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_skill_level_check 
CHECK (skill_level IN ('principiante', 'intermedio', 'avanzato', 'agonista', 'professionista'));

-- Step 3: Add preferred_times constraint (valid time slots)
-- Valid values: 'mattina', 'pomeriggio', 'sera', 'weekend', 'feriale'

-- Step 4: Create function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INT AS $$
DECLARE
  total_fields INT := 0;
  completed_fields INT := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Essential fields (always counted)
  total_fields := 15;
  
  -- Check each field
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.birth_date IS NOT NULL THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.phone_secondary IS NOT NULL AND profile_record.phone_secondary != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.emergency_contact IS NOT NULL AND 
     jsonb_typeof(profile_record.emergency_contact) = 'object' AND
     profile_record.emergency_contact != '{}'::jsonb THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.preferred_times IS NOT NULL AND array_length(profile_record.preferred_times, 1) > 0 THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.skill_level IS NOT NULL THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.tennis_stats IS NOT NULL AND 
     jsonb_typeof(profile_record.tennis_stats) = 'object' AND
     profile_record.tennis_stats != '{}'::jsonb THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.website_url IS NOT NULL AND profile_record.website_url != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.social_media IS NOT NULL AND 
     jsonb_typeof(profile_record.social_media) = 'object' AND
     profile_record.social_media != '{}'::jsonb THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.user_role IS NOT NULL THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  RETURN ROUND((completed_fields::NUMERIC / total_fields::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update profile_completion_percentage
CREATE OR REPLACE FUNCTION update_profile_completion_percentage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion_percentage := calculate_profile_completion(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_completion ON profiles;
CREATE TRIGGER trigger_update_profile_completion
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_percentage();

-- Step 6: Create athlete_stats table for detailed tennis statistics
CREATE TABLE IF NOT EXISTS athlete_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Match statistics
  total_matches INT DEFAULT 0,
  matches_won INT DEFAULT 0,
  matches_lost INT DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0.00,
  
  -- Set statistics
  total_sets INT DEFAULT 0,
  sets_won INT DEFAULT 0,
  sets_lost INT DEFAULT 0,
  
  -- Game statistics
  total_games INT DEFAULT 0,
  games_won INT DEFAULT 0,
  games_lost INT DEFAULT 0,
  
  -- Service statistics
  aces INT DEFAULT 0,
  double_faults INT DEFAULT 0,
  first_serve_percentage NUMERIC(5,2) DEFAULT 0.00,
  first_serve_points_won INT DEFAULT 0,
  second_serve_points_won INT DEFAULT 0,
  
  -- Return statistics
  break_points_won INT DEFAULT 0,
  break_points_total INT DEFAULT 0,
  return_games_won INT DEFAULT 0,
  
  -- Point statistics
  winners INT DEFAULT 0,
  unforced_errors INT DEFAULT 0,
  total_points_won INT DEFAULT 0,
  
  -- Match history
  longest_win_streak INT DEFAULT 0,
  current_win_streak INT DEFAULT 0,
  best_victory TEXT, -- description of best win
  
  -- Bookings & lessons
  total_bookings INT DEFAULT 0,
  total_lessons INT DEFAULT 0,
  total_tournaments INT DEFAULT 0,
  
  -- Timestamps
  last_match_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Step 7: Create indexes for athlete_stats
CREATE INDEX IF NOT EXISTS idx_athlete_stats_user_id ON athlete_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_stats_win_rate ON athlete_stats(win_rate DESC);

-- Step 8: RLS Policies for athlete_stats
ALTER TABLE athlete_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "athlete_stats_select_own" ON athlete_stats
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Admin/gestore can view all stats
CREATE POLICY "athlete_stats_select_admin" ON athlete_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore', 'maestro')
    )
  );

-- Users can update their own stats
CREATE POLICY "athlete_stats_update_own" ON athlete_stats
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Admin can update any stats
CREATE POLICY "athlete_stats_update_admin" ON athlete_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Auto-create stats for new users
CREATE POLICY "athlete_stats_insert_own" ON athlete_stats
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Step 9: Create function to initialize athlete_stats for existing users
CREATE OR REPLACE FUNCTION initialize_athlete_stats_for_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO athlete_stats (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create function to update athlete_stats from tournament_participants
CREATE OR REPLACE FUNCTION sync_athlete_stats_from_tournaments()
RETURNS TRIGGER AS $$
BEGIN
  -- Update athlete_stats based on tournament_participants data
  INSERT INTO athlete_stats (
    user_id,
    total_matches,
    matches_won,
    matches_lost,
    total_sets,
    sets_won,
    sets_lost,
    total_games,
    games_won,
    games_lost,
    win_rate,
    total_tournaments,
    updated_at
  )
  SELECT 
    NEW.user_id,
    NEW.matches_played,
    NEW.matches_won,
    NEW.matches_lost,
    NEW.sets_won + NEW.sets_lost,
    NEW.sets_won,
    NEW.sets_lost,
    NEW.games_won + NEW.games_lost,
    NEW.games_won,
    NEW.games_lost,
    CASE 
      WHEN NEW.matches_played > 0 THEN ROUND((NEW.matches_won::NUMERIC / NEW.matches_played::NUMERIC) * 100, 2)
      ELSE 0.00
    END,
    1,
    NOW()
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_matches = athlete_stats.total_matches + (NEW.matches_played - COALESCE(OLD.matches_played, 0)),
    matches_won = athlete_stats.matches_won + (NEW.matches_won - COALESCE(OLD.matches_won, 0)),
    matches_lost = athlete_stats.matches_lost + (NEW.matches_lost - COALESCE(OLD.matches_lost, 0)),
    total_sets = athlete_stats.total_sets + ((NEW.sets_won + NEW.sets_lost) - (COALESCE(OLD.sets_won, 0) + COALESCE(OLD.sets_lost, 0))),
    sets_won = athlete_stats.sets_won + (NEW.sets_won - COALESCE(OLD.sets_won, 0)),
    sets_lost = athlete_stats.sets_lost + (NEW.sets_lost - COALESCE(OLD.sets_lost, 0)),
    total_games = athlete_stats.total_games + ((NEW.games_won + NEW.games_lost) - (COALESCE(OLD.games_won, 0) + COALESCE(OLD.games_lost, 0))),
    games_won = athlete_stats.games_won + (NEW.games_won - COALESCE(OLD.games_won, 0)),
    games_lost = athlete_stats.games_lost + (NEW.games_lost - COALESCE(OLD.games_lost, 0)),
    win_rate = CASE 
      WHEN (athlete_stats.total_matches + (NEW.matches_played - COALESCE(OLD.matches_played, 0))) > 0 
      THEN ROUND(((athlete_stats.matches_won + (NEW.matches_won - COALESCE(OLD.matches_won, 0)))::NUMERIC / 
                  (athlete_stats.total_matches + (NEW.matches_played - COALESCE(OLD.matches_played, 0)))::NUMERIC) * 100, 2)
      ELSE 0.00
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for tournament stats sync
DROP TRIGGER IF EXISTS trigger_sync_athlete_stats ON tournament_participants;
CREATE TRIGGER trigger_sync_athlete_stats
  AFTER INSERT OR UPDATE ON tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION sync_athlete_stats_from_tournaments();

-- Step 12: Add comments for documentation
COMMENT ON COLUMN profiles.bio IS 'Biografia atleta o descrizione personale';
COMMENT ON COLUMN profiles.birth_date IS 'Data di nascita per calcolo età';
COMMENT ON COLUMN profiles.phone_secondary IS 'Telefono secondario o di emergenza';
COMMENT ON COLUMN profiles.emergency_contact IS 'Contatto emergenza: {"name": "Mario Rossi", "phone": "123456", "relation": "padre"}';
COMMENT ON COLUMN profiles.preferred_times IS 'Orari preferiti: array di [mattina, pomeriggio, sera, weekend, feriale]';
COMMENT ON COLUMN profiles.skill_level IS 'Livello tennis: principiante, intermedio, avanzato, agonista, professionista';
COMMENT ON COLUMN profiles.tennis_stats IS 'Statistiche tennis personalizzate: {"racket": "Wilson Pro Staff", "grip_size": "3", "playing_style": "baseline"}';
COMMENT ON COLUMN profiles.profile_completion_percentage IS 'Percentuale completamento profilo (0-100), auto-calcolata';

COMMENT ON TABLE athlete_stats IS 'Statistiche dettagliate tennis per atleti GST Academy';
COMMENT ON COLUMN athlete_stats.win_rate IS 'Percentuale vittorie sul totale match (0.00-100.00)';
COMMENT ON COLUMN athlete_stats.first_serve_percentage IS 'Percentuale prime di servizio valide';
COMMENT ON COLUMN athlete_stats.best_victory IS 'Descrizione migliore vittoria conseguita';

-- Migration completed successfully!
-- Next: Create ProfileEditor UI component with multi-step form
