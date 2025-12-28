-- Migration: Tennis Tournament System Enhancement
-- Sport: TENNIS (set, game, tie-break scoring)
-- Date: 2025-12-28

-- Step 1: Add new columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS has_groups BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS group_stage_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS knockout_stage_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'registration',
ADD COLUMN IF NOT EXISTS scoring_system JSONB DEFAULT '{"type": "tennis", "format": "best_of_3", "tiebreak_at": "6-6"}'::jsonb,
ADD COLUMN IF NOT EXISTS match_format VARCHAR(50) DEFAULT 'best_of_3',
ADD COLUMN IF NOT EXISTS surface_type VARCHAR(50) DEFAULT 'terra',
ADD COLUMN IF NOT EXISTS ball_type VARCHAR(50) DEFAULT 'regular';

-- Step 2: Add check constraint for current_stage
ALTER TABLE tournaments
DROP CONSTRAINT IF EXISTS tournaments_current_stage_check;

ALTER TABLE tournaments
ADD CONSTRAINT tournaments_current_stage_check 
CHECK (current_stage IN ('registration', 'groups', 'knockout', 'completed', 'cancelled'));

-- Step 3: Add check constraint for match_format
ALTER TABLE tournaments
ADD CONSTRAINT tournaments_match_format_check 
CHECK (match_format IN ('best_of_1', 'best_of_3', 'best_of_5'));

-- Step 4: Add check constraint for surface_type (tennis-specific)
ALTER TABLE tournaments
ADD CONSTRAINT tournaments_surface_type_check 
CHECK (surface_type IN ('terra', 'erba', 'cemento', 'sintetico', 'indoor', 'carpet'));

-- Step 5: Create groups table for group stage
CREATE TABLE IF NOT EXISTS tournament_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL, -- "Gruppo A", "Gruppo B", etc.
  group_order INT NOT NULL,
  max_participants INT DEFAULT 4,
  advancement_count INT DEFAULT 2, -- quanti avanzano alla fase knockout
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, group_name)
);

-- Step 6: Add group_id to tournament_participants
ALTER TABLE tournament_participants
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS seeding INT, -- posizione seeding per knockout
ADD COLUMN IF NOT EXISTS group_position INT, -- posizione nel girone
ADD COLUMN IF NOT EXISTS matches_played INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_lost INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sets_won INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sets_lost INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_won INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_lost INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0; -- punti classifica girone

-- Step 7: Create matches table (tennis-specific scoring)
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_name VARCHAR(100), -- "Gruppo A - Giornata 1", "Ottavi di Finale", "Quarti", etc.
  round_order INT,
  stage VARCHAR(50) NOT NULL, -- 'groups' or 'knockout'
  
  -- Match participants
  player1_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  
  -- Tennis scoring
  player1_sets INT DEFAULT 0,
  player2_sets INT DEFAULT 0,
  score_detail JSONB DEFAULT '{"sets": []}'::jsonb, -- [{set: 1, p1_games: 6, p2_games: 4, tiebreak: null}]
  
  -- Match metadata
  winner_id UUID REFERENCES tournament_participants(id),
  match_status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, walkover, retired
  scheduled_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Tennis-specific
  court_number VARCHAR(20),
  surface_type VARCHAR(50),
  duration_minutes INT,
  
  -- Stats (optional)
  stats JSONB DEFAULT '{}'::jsonb, -- aces, double faults, winners, unforced errors, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tournament_matches_stage_check CHECK (stage IN ('groups', 'knockout')),
  CONSTRAINT tournament_matches_status_check CHECK (match_status IN ('scheduled', 'in_progress', 'completed', 'walkover', 'retired', 'cancelled'))
);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament_id ON tournament_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_group_id ON tournament_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_stage ON tournament_matches(tournament_id, stage);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_players ON tournament_matches(player1_id, player2_id);

-- Step 9: RLS Policies for tournament_groups
ALTER TABLE tournament_groups ENABLE ROW LEVEL SECURITY;

-- Public can view groups
CREATE POLICY "tournament_groups_select_all" ON tournament_groups
  FOR SELECT USING (true);

-- Only admin/gestore can insert/update/delete groups
CREATE POLICY "tournament_groups_insert_admin" ON tournament_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "tournament_groups_update_admin" ON tournament_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "tournament_groups_delete_admin" ON tournament_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 10: RLS Policies for tournament_matches
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Public can view matches
CREATE POLICY "tournament_matches_select_all" ON tournament_matches
  FOR SELECT USING (true);

-- Only admin/gestore can insert matches
CREATE POLICY "tournament_matches_insert_admin" ON tournament_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Admin/gestore + match participants can update scores
CREATE POLICY "tournament_matches_update_scores" ON tournament_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (
        profiles.user_role IN ('admin', 'gestore')
        OR profiles.id IN (
          SELECT user_id FROM tournament_participants 
          WHERE id = tournament_matches.player1_id 
          OR id = tournament_matches.player2_id
        )
      )
    )
  );

-- Only admin/gestore can delete matches
CREATE POLICY "tournament_matches_delete_admin" ON tournament_matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 11: Create function to calculate group standings
CREATE OR REPLACE FUNCTION calculate_group_standings(group_uuid UUID)
RETURNS TABLE (
  participant_id UUID,
  user_id UUID,
  full_name TEXT,
  points INT,
  matches_played INT,
  matches_won INT,
  matches_lost INT,
  sets_won INT,
  sets_lost INT,
  set_diff INT,
  games_won INT,
  games_lost INT,
  game_diff INT,
  group_position INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id AS participant_id,
    tp.user_id,
    p.full_name,
    tp.points,
    tp.matches_played,
    tp.matches_won,
    tp.matches_lost,
    tp.sets_won,
    tp.sets_lost,
    (tp.sets_won - tp.sets_lost) AS set_diff,
    tp.games_won,
    tp.games_lost,
    (tp.games_won - tp.games_lost) AS game_diff,
    ROW_NUMBER() OVER (
      ORDER BY 
        tp.points DESC, 
        (tp.sets_won - tp.sets_lost) DESC,
        (tp.games_won - tp.games_lost) DESC,
        tp.games_won DESC
    )::INT AS group_position
  FROM tournament_participants tp
  LEFT JOIN profiles p ON tp.user_id = p.id
  WHERE tp.group_id = group_uuid
  ORDER BY group_position;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create function to update participant stats after match
CREATE OR REPLACE FUNCTION update_participant_stats_from_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if match is completed
  IF NEW.match_status = 'completed' AND NEW.winner_id IS NOT NULL THEN
    
    -- Update player1 stats
    UPDATE tournament_participants
    SET 
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN NEW.winner_id = NEW.player1_id THEN 1 ELSE 0 END,
      matches_lost = matches_lost + CASE WHEN NEW.winner_id != NEW.player1_id THEN 1 ELSE 0 END,
      sets_won = sets_won + NEW.player1_sets,
      sets_lost = sets_lost + NEW.player2_sets,
      points = points + CASE WHEN NEW.winner_id = NEW.player1_id THEN 2 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.player1_id;
    
    -- Update player2 stats
    UPDATE tournament_participants
    SET 
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN NEW.winner_id = NEW.player2_id THEN 1 ELSE 0 END,
      matches_lost = matches_lost + CASE WHEN NEW.winner_id != NEW.player2_id THEN 1 ELSE 0 END,
      sets_won = sets_won + NEW.player2_sets,
      sets_lost = sets_lost + NEW.player1_sets,
      points = points + CASE WHEN NEW.winner_id = NEW.player2_id THEN 2 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.player2_id;
    
    -- Update games_won/lost from score_detail
    IF NEW.score_detail IS NOT NULL AND jsonb_array_length(NEW.score_detail->'sets') > 0 THEN
      DECLARE
        total_p1_games INT := 0;
        total_p2_games INT := 0;
        set_record JSONB;
      BEGIN
        FOR set_record IN SELECT * FROM jsonb_array_elements(NEW.score_detail->'sets')
        LOOP
          total_p1_games := total_p1_games + (set_record->>'p1_games')::INT;
          total_p2_games := total_p2_games + (set_record->>'p2_games')::INT;
        END LOOP;
        
        UPDATE tournament_participants
        SET games_won = games_won + total_p1_games,
            games_lost = games_lost + total_p2_games
        WHERE id = NEW.player1_id;
        
        UPDATE tournament_participants
        SET games_won = games_won + total_p2_games,
            games_lost = games_lost + total_p1_games
        WHERE id = NEW.player2_id;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger for automatic stats update
DROP TRIGGER IF EXISTS trigger_update_participant_stats ON tournament_matches;
CREATE TRIGGER trigger_update_participant_stats
  AFTER UPDATE OF match_status, winner_id ON tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_stats_from_match();

-- Step 14: Add comments for documentation
COMMENT ON COLUMN tournaments.has_groups IS 'Se true, il torneo ha una fase a gironi prima del knockout';
COMMENT ON COLUMN tournaments.group_stage_config IS 'Configurazione gironi: {num_groups: 4, participants_per_group: 4, advancement_count: 2}';
COMMENT ON COLUMN tournaments.knockout_stage_config IS 'Configurazione eliminazione diretta: {starting_round: "ottavi", seeding_method: "group_winners"}';
COMMENT ON COLUMN tournaments.current_stage IS 'Fase attuale: registration, groups, knockout, completed, cancelled';
COMMENT ON COLUMN tournaments.scoring_system IS 'Sistema punteggio tennis: {type: "tennis", format: "best_of_3", tiebreak_at: "6-6"}';
COMMENT ON COLUMN tournaments.match_format IS 'Formato incontri: best_of_1, best_of_3, best_of_5';
COMMENT ON COLUMN tournaments.surface_type IS 'Superficie campo tennis: terra, erba, cemento, sintetico, indoor, carpet';

COMMENT ON TABLE tournament_groups IS 'Gironi per fase a gruppi dei tornei tennis';
COMMENT ON TABLE tournament_matches IS 'Incontri tennis con punteggi dettagliati (set, game, tie-break)';

COMMENT ON COLUMN tournament_matches.score_detail IS 'Punteggio dettagliato: {"sets": [{"set": 1, "p1_games": 6, "p2_games": 4, "tiebreak": null}, {"set": 2, "p1_games": 7, "p2_games": 6, "tiebreak": {"p1_points": 7, "p2_points": 3}}]}';
COMMENT ON COLUMN tournament_matches.stats IS 'Statistiche tennis: {"p1_aces": 5, "p1_double_faults": 2, "p1_winners": 25, "p1_unforced_errors": 18, "p2_aces": 3, ...}';

-- Step 15: Insert sample data for testing (OPTIONAL - remove in production)
-- Example: Update existing tournament to use groups
-- UPDATE tournaments 
-- SET has_groups = true,
--     group_stage_config = '{"num_groups": 4, "participants_per_group": 4, "advancement_count": 2}'::jsonb,
--     knockout_stage_config = '{"starting_round": "quarti", "seeding_method": "group_standings"}'::jsonb,
--     match_format = 'best_of_3',
--     surface_type = 'terra'
-- WHERE title LIKE '%Open%' AND start_date > NOW();

-- Migration completed successfully!
-- Next steps: Create API endpoints and UI components for tennis scoring
