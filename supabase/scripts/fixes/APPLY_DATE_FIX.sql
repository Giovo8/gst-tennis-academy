-- Script per applicare la migrazione che rende le date opzionali
-- Esegui questo file su Supabase SQL Editor

-- Make start_date and end_date optional for tournaments
-- Rimuove il vincolo NOT NULL dalle colonne start_date/end_date

DO $$ 
BEGIN
  -- Se esiste la colonna start_date, rendila opzionale
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournaments' 
    AND column_name = 'start_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments ALTER COLUMN start_date DROP NOT NULL';
    RAISE NOTICE 'Colonna start_date resa opzionale';
  END IF;
  
  -- Se esiste la colonna starts_at, rendila opzionale
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'tournaments' 
    AND column_name = 'starts_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments ALTER COLUMN starts_at DROP NOT NULL';
    RAISE NOTICE 'Colonna starts_at resa opzionale';
  END IF;
  
  -- Rendi anche end_date/ends_at opzionale
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'tournaments' 
    AND column_name = 'end_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments ALTER COLUMN end_date DROP NOT NULL';
    RAISE NOTICE 'Colonna end_date resa opzionale';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'tournaments' 
    AND column_name = 'ends_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments ALTER COLUMN ends_at DROP NOT NULL';
    RAISE NOTICE 'Colonna ends_at resa opzionale';
  END IF;
END $$;

SELECT 'Migration completata con successo!' as status;
