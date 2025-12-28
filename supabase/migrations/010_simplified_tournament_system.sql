-- Migration: Simplified Tournament System
-- Supporta 3 tipi di torneo intuitivi:
-- 1. Eliminazione Diretta (Single Elimination)
-- 2. Girone + Eliminazione (Group Stage + Knockout)  
-- 3. Campionato (Round Robin)
-- Date: 2025-12-28

-- =====================================================
-- STEP 1: Aggiornare la tabella tournaments
-- =====================================================

-- Aggiungere alias per start_date e end_date (manteniamo starts_at/ends_at per compatibilità)
DO $$ 
BEGIN
  -- Rinomina starts_at in start_date se exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN starts_at TO start_date;
  END IF;
  
  -- Rinomina ends_at in end_date se exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE tournaments RENAME COLUMN ends_at TO end_date;
  END IF;
END $$;

-- Rimuovi created_by se esiste (non necessario per il sistema semplificato)
ALTER TABLE tournaments DROP COLUMN IF EXISTS created_by CASCADE;

-- Verifica che status esista (dovrebbe già esistere dalla migrazione 001)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aperto';

-- Aggiungi colonne opzionali se non esistono
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS surface_type TEXT DEFAULT 'terra',
ADD COLUMN IF NOT EXISTS match_format TEXT DEFAULT 'best_of_3';

-- Aggiungere colonne per il sistema semplificato
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'eliminazione_diretta',
ADD COLUMN IF NOT EXISTS num_groups INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS teams_per_group INT DEFAULT 4,
ADD COLUMN IF NOT EXISTS teams_advancing INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS current_phase VARCHAR(50) DEFAULT 'iscrizioni',
ADD COLUMN IF NOT EXISTS bracket_config JSONB DEFAULT '{}'::jsonb;

-- Constraint per tournament_type
ALTER TABLE tournaments
DROP CONSTRAINT IF EXISTS tournaments_type_check;

ALTER TABLE tournaments
ADD CONSTRAINT tournaments_type_check 
CHECK (tournament_type IN ('eliminazione_diretta', 'girone_eliminazione', 'campionato'));

-- Constraint per current_phase
ALTER TABLE tournaments
DROP CONSTRAINT IF EXISTS tournaments_phase_check;

ALTER TABLE tournaments
ADD CONSTRAINT tournaments_phase_check 
CHECK (current_phase IN ('iscrizioni', 'gironi', 'eliminazione', 'completato', 'annullato'));

-- =====================================================
-- STEP 2: Tabella per i gironi
-- =====================================================

CREATE TABLE IF NOT EXISTS tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL, -- "Girone A", "Girone B", etc.
  group_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, group_name)
);

CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament_id ON tournament_groups(tournament_id);

-- =====================================================
-- STEP 3: Aggiornare tournament_participants per gironi
-- =====================================================

-- Assicurati che created_at esista (potrebbe mancare in alcuni setup)
ALTER TABLE tournament_participants
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE tournament_participants
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS seed INT, -- posizione nel seeding
ADD COLUMN IF NOT EXISTS group_position INT, -- posizione finale nel girone
ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{
  "matches_played": 0,
  "matches_won": 0,
  "matches_lost": 0,
  "sets_won": 0,
  "sets_lost": 0,
  "games_won": 0,
  "games_lost": 0,
  "points": 0
}'::jsonb;

-- =====================================================
-- STEP 4: Tabella per le partite
-- =====================================================

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- Informazioni sul round/fase
  phase VARCHAR(50) NOT NULL, -- 'gironi', 'eliminazione'
  round_name VARCHAR(100), -- "Girone A - Giornata 1", "Ottavi", "Quarti", "Semifinale", "Finale"
  round_number INT, -- ordine del round
  match_number INT, -- numero match nel round
  
  -- Partecipanti
  player1_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  
  -- Risultato
  player1_score INT DEFAULT 0, -- set vinti
  player2_score INT DEFAULT 0, -- set vinti
  score_details JSONB DEFAULT '{"sets": []}'::jsonb, -- dettaglio set [{p1: 6, p2: 4}, {p1: 7, p2: 5}]
  winner_id UUID REFERENCES tournament_participants(id),
  
  -- Stato
  status VARCHAR(50) DEFAULT 'programmata',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadati
  court VARCHAR(50),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tournament_matches_phase_check CHECK (phase IN ('gironi', 'eliminazione')),
  CONSTRAINT tournament_matches_status_check CHECK (status IN ('programmata', 'in_corso', 'completata', 'annullata', 'walkover'))
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_phase ON tournament_matches(phase);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player1 ON tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player2 ON tournament_matches(player2_id);

-- =====================================================
-- STEP 5: Funzioni helper
-- =====================================================

-- Funzione per creare i gironi automaticamente
CREATE OR REPLACE FUNCTION create_tournament_groups(
  p_tournament_id UUID,
  p_num_groups INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_name VARCHAR(50);
  v_i INT;
BEGIN
  -- Crea i gironi con nomi A, B, C, etc.
  FOR v_i IN 1..p_num_groups LOOP
    v_group_name := 'Girone ' || CHR(64 + v_i); -- A=65, quindi 64+1=65='A'
    
    INSERT INTO tournament_groups (tournament_id, group_name, group_order)
    VALUES (p_tournament_id, v_group_name, v_i)
    ON CONFLICT (tournament_id, group_name) DO NOTHING;
  END LOOP;
END;
$$;

-- Funzione per assegnare partecipanti ai gironi in modo bilanciato
CREATE OR REPLACE FUNCTION assign_participants_to_groups(
  p_tournament_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant RECORD;
  v_groups UUID[];
  v_group_index INT := 0;
  v_seed INT := 1;
BEGIN
  -- Prendi tutti i gruppi del torneo
  SELECT ARRAY_AGG(id ORDER BY group_order) INTO v_groups
  FROM tournament_groups
  WHERE tournament_id = p_tournament_id;
  
  IF v_groups IS NULL OR array_length(v_groups, 1) = 0 THEN
    RAISE EXCEPTION 'Nessun girone trovato per il torneo %', p_tournament_id;
  END IF;
  
  -- Assegna i partecipanti ai gironi in modo rotativo (serpentina)
  FOR v_participant IN 
    SELECT id FROM tournament_participants 
    WHERE tournament_id = p_tournament_id 
    AND group_id IS NULL
    ORDER BY created_at
  LOOP
    UPDATE tournament_participants
    SET 
      group_id = v_groups[(v_group_index % array_length(v_groups, 1)) + 1],
      seed = v_seed
    WHERE id = v_participant.id;
    
    v_group_index := v_group_index + 1;
    v_seed := v_seed + 1;
  END LOOP;
END;
$$;

-- Funzione per calcolare la classifica di un girone
CREATE OR REPLACE FUNCTION calculate_group_standings(
  p_group_id UUID
)
RETURNS TABLE (
  participant_id UUID,
  points INT,
  matches_played INT,
  matches_won INT,
  matches_lost INT,
  sets_won INT,
  sets_lost INT,
  games_won INT,
  games_lost INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    (tp.stats->>'points')::INT,
    (tp.stats->>'matches_played')::INT,
    (tp.stats->>'matches_won')::INT,
    (tp.stats->>'matches_lost')::INT,
    (tp.stats->>'sets_won')::INT,
    (tp.stats->>'sets_lost')::INT,
    (tp.stats->>'games_won')::INT,
    (tp.stats->>'games_lost')::INT
  FROM tournament_participants tp
  WHERE tp.group_id = p_group_id
  ORDER BY 
    (tp.stats->>'points')::INT DESC,
    (tp.stats->>'sets_won')::INT - (tp.stats->>'sets_lost')::INT DESC,
    (tp.stats->>'games_won')::INT - (tp.stats->>'games_lost')::INT DESC;
END;
$$;

-- Funzione per aggiornare le statistiche dopo una partita
CREATE OR REPLACE FUNCTION update_match_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_player1_stats JSONB;
  v_player2_stats JSONB;
BEGIN
  -- Solo quando la partita è completata
  IF NEW.status = 'completata' AND OLD.status != 'completata' THEN
    -- Aggiorna statistiche player1
    SELECT stats INTO v_player1_stats FROM tournament_participants WHERE id = NEW.player1_id;
    
    v_player1_stats = jsonb_set(v_player1_stats, '{matches_played}', 
      to_jsonb((v_player1_stats->>'matches_played')::INT + 1));
    v_player1_stats = jsonb_set(v_player1_stats, '{sets_won}', 
      to_jsonb((v_player1_stats->>'sets_won')::INT + NEW.player1_score));
    v_player1_stats = jsonb_set(v_player1_stats, '{sets_lost}', 
      to_jsonb((v_player1_stats->>'sets_lost')::INT + NEW.player2_score));
    
    IF NEW.winner_id = NEW.player1_id THEN
      v_player1_stats = jsonb_set(v_player1_stats, '{matches_won}', 
        to_jsonb((v_player1_stats->>'matches_won')::INT + 1));
      v_player1_stats = jsonb_set(v_player1_stats, '{points}', 
        to_jsonb((v_player1_stats->>'points')::INT + 2)); -- 2 punti per vittoria
    ELSE
      v_player1_stats = jsonb_set(v_player1_stats, '{matches_lost}', 
        to_jsonb((v_player1_stats->>'matches_lost')::INT + 1));
    END IF;
    
    UPDATE tournament_participants SET stats = v_player1_stats WHERE id = NEW.player1_id;
    
    -- Aggiorna statistiche player2
    SELECT stats INTO v_player2_stats FROM tournament_participants WHERE id = NEW.player2_id;
    
    v_player2_stats = jsonb_set(v_player2_stats, '{matches_played}', 
      to_jsonb((v_player2_stats->>'matches_played')::INT + 1));
    v_player2_stats = jsonb_set(v_player2_stats, '{sets_won}', 
      to_jsonb((v_player2_stats->>'sets_won')::INT + NEW.player2_score));
    v_player2_stats = jsonb_set(v_player2_stats, '{sets_lost}', 
      to_jsonb((v_player2_stats->>'sets_lost')::INT + NEW.player1_score));
    
    IF NEW.winner_id = NEW.player2_id THEN
      v_player2_stats = jsonb_set(v_player2_stats, '{matches_won}', 
        to_jsonb((v_player2_stats->>'matches_won')::INT + 1));
      v_player2_stats = jsonb_set(v_player2_stats, '{points}', 
        to_jsonb((v_player2_stats->>'points')::INT + 2));
    ELSE
      v_player2_stats = jsonb_set(v_player2_stats, '{matches_lost}', 
        to_jsonb((v_player2_stats->>'matches_lost')::INT + 1));
    END IF;
    
    UPDATE tournament_participants SET stats = v_player2_stats WHERE id = NEW.player2_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger per aggiornare statistiche
DROP TRIGGER IF EXISTS trigger_update_match_stats ON tournament_matches;
CREATE TRIGGER trigger_update_match_stats
AFTER UPDATE ON tournament_matches
FOR EACH ROW
EXECUTE FUNCTION update_match_stats();

-- =====================================================
-- STEP 6: RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Policies per tournament_groups (tutti possono leggere)
DROP POLICY IF EXISTS tournament_groups_select ON tournament_groups;
CREATE POLICY tournament_groups_select ON tournament_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS tournament_groups_insert ON tournament_groups;
CREATE POLICY tournament_groups_insert ON tournament_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

DROP POLICY IF EXISTS tournament_groups_update ON tournament_groups;
CREATE POLICY tournament_groups_update ON tournament_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policies per tournament_matches (tutti possono leggere)
DROP POLICY IF EXISTS tournament_matches_select ON tournament_matches;
CREATE POLICY tournament_matches_select ON tournament_matches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS tournament_matches_insert ON tournament_matches;
CREATE POLICY tournament_matches_insert ON tournament_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

DROP POLICY IF EXISTS tournament_matches_update ON tournament_matches;
CREATE POLICY tournament_matches_update ON tournament_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore', 'maestro')
    )
  );

-- =====================================================
-- STEP 7: Commenti per documentazione
-- =====================================================

COMMENT ON COLUMN tournaments.tournament_type IS 'Tipo torneo: eliminazione_diretta, girone_eliminazione, campionato';
COMMENT ON COLUMN tournaments.num_groups IS 'Numero di gironi (per girone_eliminazione)';
COMMENT ON COLUMN tournaments.teams_per_group IS 'Squadre per girone';
COMMENT ON COLUMN tournaments.teams_advancing IS 'Squadre che avanzano per girone';
COMMENT ON COLUMN tournaments.current_phase IS 'Fase corrente: iscrizioni, gironi, eliminazione, completato, annullato';
COMMENT ON COLUMN tournaments.bracket_config IS 'Configurazione del bracket (struttura ad eliminazione)';

COMMENT ON TABLE tournament_groups IS 'Gironi per tornei con fase a gironi';
COMMENT ON TABLE tournament_matches IS 'Partite del torneo (sia gironi che eliminazione)';

-- Fine migrazione
