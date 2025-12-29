-- Migration: Make start_date and end_date optional for tournaments
-- Date: 2025-12-29
-- Description: Rimuove il vincolo NOT NULL dalle colonne start_date/end_date
-- permettendo la creazione di tornei senza date specifiche

-- Verifica quale colonna è presente (start_date o starts_at)
DO $$ 
BEGIN
  -- Se esiste la colonna start_date, rendila opzionale
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE tournaments ALTER COLUMN start_date DROP NOT NULL;
    
    -- Imposta un default per i record esistenti che non hanno una data
    UPDATE tournaments 
    SET start_date = NOW() 
    WHERE start_date IS NULL;
  END IF;
  
  -- Se esiste la colonna starts_at, rendila opzionale
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE tournaments ALTER COLUMN starts_at DROP NOT NULL;
    
    -- Imposta un default per i record esistenti che non hanno una data
    UPDATE tournaments 
    SET starts_at = NOW() 
    WHERE starts_at IS NULL;
  END IF;
  
  -- Rendi anche end_date/ends_at opzionale (dovrebbero già esserlo, ma per sicurezza)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE tournaments ALTER COLUMN end_date DROP NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE tournaments ALTER COLUMN ends_at DROP NOT NULL;
  END IF;
END $$;

-- Aggiungi un commento per documentare il cambio
COMMENT ON COLUMN tournaments.start_date IS 'Data di inizio del torneo (opzionale). Se non specificata, il torneo può essere avviato immediatamente.';
