-- Migration: Add missing columns to tournament_matches for bracket system
-- Date: 2025-12-29

-- Aggiungi colonne per il sistema bracket se non esistono
DO $$ 
BEGIN
  -- Aggiungi stage (alias di phase per compatibilità)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'stage'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN stage VARCHAR(50);
    -- Popola stage con i valori di phase
    UPDATE tournament_matches SET stage = phase WHERE stage IS NULL;
  END IF;
  
  -- Aggiungi match_status (alias di status per compatibilità)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'match_status'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN match_status VARCHAR(50) DEFAULT 'scheduled';
    -- Popola match_status con i valori di status
    UPDATE tournament_matches SET match_status = 
      CASE 
        WHEN status = 'programmata' THEN 'scheduled'
        WHEN status = 'in_corso' THEN 'in_progress'
        WHEN status = 'completata' THEN 'completed'
        WHEN status = 'annullata' THEN 'cancelled'
        ELSE status
      END
    WHERE match_status = 'scheduled';
  END IF;
  
  -- Aggiungi bracket_position
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'bracket_position'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN bracket_position INT;
  END IF;
  
  -- Aggiungi scheduled_time (alias di scheduled_at)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN scheduled_time TIMESTAMPTZ;
    UPDATE tournament_matches SET scheduled_time = scheduled_at WHERE scheduled_time IS NULL;
  END IF;
  
  -- Aggiungi start_time (alias di started_at)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'start_time'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN start_time TIMESTAMPTZ;
    UPDATE tournament_matches SET start_time = started_at WHERE start_time IS NULL;
  END IF;
  
  -- Aggiungi end_time (alias di completed_at)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'end_time'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN end_time TIMESTAMPTZ;
    UPDATE tournament_matches SET end_time = completed_at WHERE end_time IS NULL;
  END IF;
  
  -- Aggiungi player1_sets e player2_sets (alias di player1_score e player2_score)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'player1_sets'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN player1_sets INT DEFAULT 0;
    UPDATE tournament_matches SET player1_sets = player1_score WHERE player1_sets = 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'player2_sets'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN player2_sets INT DEFAULT 0;
    UPDATE tournament_matches SET player2_sets = player2_score WHERE player2_sets = 0;
  END IF;
  
  -- Aggiungi score_detail (alias di score_details)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_matches' 
    AND column_name = 'score_detail'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN score_detail JSONB;
    UPDATE tournament_matches SET score_detail = score_details WHERE score_detail IS NULL;
  END IF;
  
END $$;

-- Aggiungi constraint per match_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournament_matches_match_status_check'
  ) THEN
    ALTER TABLE tournament_matches 
    ADD CONSTRAINT tournament_matches_match_status_check 
    CHECK (match_status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'pending', 'walkover'));
  END IF;
END $$;

SELECT 'Migration completed: tournament_matches updated for bracket system' as status;
