-- Script per applicare tutte le fix necessarie per il sistema bracket
-- Esegui questo file su Supabase SQL Editor

-- 1. Rendi le date opzionali
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournaments' 
    AND column_name = 'start_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments ALTER COLUMN start_date DROP NOT NULL';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'tournaments' 
    AND column_name = 'starts_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments ALTER COLUMN starts_at DROP NOT NULL';
  END IF;
END $$;

-- 2. Aggiungi colonne a tournament_matches per il bracket system
DO $$ 
BEGIN
  -- stage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'stage'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN stage VARCHAR(50);
    UPDATE tournament_matches SET stage = phase WHERE stage IS NULL;
  END IF;
  
  -- match_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'match_status'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN match_status VARCHAR(50) DEFAULT 'scheduled';
    UPDATE tournament_matches SET match_status = 
      CASE 
        WHEN status = 'programmata' THEN 'scheduled'
        WHEN status = 'in_corso' THEN 'in_progress'
        WHEN status = 'completata' THEN 'completed'
        ELSE 'scheduled'
      END;
  END IF;
  
  -- bracket_position
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'bracket_position'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN bracket_position INT;
  END IF;
  
  -- scheduled_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN scheduled_time TIMESTAMPTZ;
    UPDATE tournament_matches SET scheduled_time = scheduled_at;
  END IF;
  
  -- start_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN start_time TIMESTAMPTZ;
    UPDATE tournament_matches SET start_time = started_at;
  END IF;
  
  -- end_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN end_time TIMESTAMPTZ;
    UPDATE tournament_matches SET end_time = completed_at;
  END IF;
  
  -- player1_sets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'player1_sets'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN player1_sets INT DEFAULT 0;
    UPDATE tournament_matches SET player1_sets = player1_score;
  END IF;
  
  -- player2_sets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'player2_sets'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN player2_sets INT DEFAULT 0;
    UPDATE tournament_matches SET player2_sets = player2_score;
  END IF;
  
  -- score_detail
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_matches' AND column_name = 'score_detail'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN score_detail JSONB;
    UPDATE tournament_matches SET score_detail = score_details;
  END IF;
END $$;

SELECT 'Tutte le migrazioni applicate con successo!' as status;
