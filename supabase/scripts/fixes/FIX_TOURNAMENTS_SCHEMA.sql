-- Fix per lo schema tournaments
-- Applica queste modifiche se hai già eseguito le migrazioni precedenti
-- Date: 2025-12-28

-- 0. Drop della cache dello schema
NOTIFY pgrst, 'reload schema';

-- 1. Rinomina le colonne da starts_at/ends_at a start_date/end_date
DO $$ 
BEGIN
  -- Rinomina starts_at in start_date se exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.tournaments RENAME COLUMN starts_at TO start_date;
    RAISE NOTICE 'Renamed starts_at to start_date';
  END IF;
  
  -- Rinomina ends_at in end_date se exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE public.tournaments RENAME COLUMN ends_at TO end_date;
    RAISE NOTICE 'Renamed ends_at to end_date';
  END IF;
END $$;

-- 2. Rimuovi la colonna created_by (non più necessaria)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.tournaments DROP COLUMN created_by CASCADE;
    RAISE NOTICE 'Dropped created_by column';
  END IF;
END $$;

-- 3. Verifica e assicurati che la colonna status esista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.tournaments ADD COLUMN status TEXT NOT NULL DEFAULT 'Aperto';
    RAISE NOTICE 'Added status column';
  END IF;
END $$;

-- 4. Assicurati che tutte le colonne necessarie esistano
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'eliminazione_diretta',
ADD COLUMN IF NOT EXISTS num_groups INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS teams_per_group INT DEFAULT 4,
ADD COLUMN IF NOT EXISTS teams_advancing INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS current_phase VARCHAR(50) DEFAULT 'iscrizioni',
ADD COLUMN IF NOT EXISTS bracket_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS surface_type TEXT DEFAULT 'terra',
ADD COLUMN IF NOT EXISTS match_format TEXT DEFAULT 'best_of_3';

-- 6. Verifica e assicurati che tournament_participants abbia created_at
ALTER TABLE public.tournament_participants
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. Aggiorna gli indici
DROP INDEX IF EXISTS idx_tournaments_starts_at;
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON public.tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);

-- 8. Ricarica la cache dello schema
NOTIFY pgrst, 'reload schema';

-- 9. Verifica lo schema finale
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tournaments'
ORDER BY ordinal_position;
