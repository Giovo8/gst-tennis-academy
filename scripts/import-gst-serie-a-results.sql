-- ============================================================
-- RISULTATI: GST SERIE A (da score7.io/tournaments/ijmxbvwrep)
-- ============================================================
-- Aggiorna i risultati delle partite giocate nel campionato
-- GST SERIE A importate con lo script import-gst-serie-a.sql
--
-- NOTA: Il sito score7.io carica i round 3-31 tramite
-- JavaScript, accessibile solo via browser. Questo script
-- copre i round 1 e 2 visibili nel codice HTML statico.
-- Per i round successivi, puoi usare la funzione
-- update_match_result() definita qui sotto.
--
-- ISTRUZIONI:
--   1. Esegui questo script nell'SQL editor di Supabase
--   2. Per aggiungere altri risultati, chiama:
--      SELECT update_match_result(
--        'Nome Vincitore', 'Nome Perdente',
--        vincitore_set, perdente_set,
--        '[{"player1_score":6,"player2_score":3},...]'::jsonb
--      );
-- ============================================================

DO $$
DECLARE
  v_tournament_id UUID;
BEGIN
  -- Trova il torneo
  SELECT id INTO v_tournament_id
  FROM tournaments
  WHERE external_source = 'score7:ijmxbvwrep'
  LIMIT 1;

  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Torneo GST SERIE A non trovato. Eseguire prima import-gst-serie-a.sql';
  END IF;

  RAISE NOTICE 'Torneo trovato: %', v_tournament_id;
END $$;

-- ============================================================
-- Funzione helper per aggiornare un risultato
-- Trova il match per nome giocatori (indipendente da player1/player2)
-- ============================================================
CREATE OR REPLACE FUNCTION update_match_result(
  p_tournament_ext_source TEXT,
  p_player_a          TEXT,   -- nome giocatore A (può essere vincitore o perdente)
  p_player_b          TEXT,   -- nome giocatore B
  p_sets_a            INT,    -- set vinti da A
  p_sets_b            INT,    -- set vinti da B
  p_score_detail      JSONB   -- es: '[{"player1_score":6,"player2_score":3},{"player1_score":6,"player2_score":4}]'
                               --     dove player1 = il player1_id nel DB (non necessariamente A)
) RETURNS TEXT AS $$
DECLARE
  v_tournament_id UUID;
  v_pid_a         UUID;
  v_pid_b         UUID;
  v_match         RECORD;
  v_winner_id     UUID;
  v_p1_sets       INT;
  v_p2_sets       INT;
  v_sets_json     JSONB;
BEGIN
  -- Trova il torneo
  SELECT id INTO v_tournament_id
  FROM tournaments
  WHERE external_source = p_tournament_ext_source
  LIMIT 1;

  IF v_tournament_id IS NULL THEN
    RETURN 'ERROR: torneo ' || p_tournament_ext_source || ' non trovato';
  END IF;

  -- Trova i partecipanti
  SELECT id INTO v_pid_a
  FROM tournament_participants
  WHERE player_name = p_player_a AND tournament_id = v_tournament_id
  LIMIT 1;

  SELECT id INTO v_pid_b
  FROM tournament_participants
  WHERE player_name = p_player_b AND tournament_id = v_tournament_id
  LIMIT 1;

  IF v_pid_a IS NULL THEN
    RETURN 'ERROR: giocatore "' || p_player_a || '" non trovato';
  END IF;
  IF v_pid_b IS NULL THEN
    RETURN 'ERROR: giocatore "' || p_player_b || '" non trovato';
  END IF;

  -- Trova il match (in qualsiasi orientamento player1/player2)
  SELECT * INTO v_match
  FROM tournament_matches
  WHERE tournament_id = v_tournament_id
    AND (
      (player1_id = v_pid_a AND player2_id = v_pid_b)
      OR
      (player1_id = v_pid_b AND player2_id = v_pid_a)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    RETURN 'ERROR: match ' || p_player_a || ' vs ' || p_player_b || ' non trovato nel DB';
  END IF;

  -- Determina il vincitore
  IF p_sets_a > p_sets_b THEN
    v_winner_id := v_pid_a;
  ELSE
    v_winner_id := v_pid_b;
  END IF;

  -- Adatta i set al punto di vista di player1_id nel DB
  -- Il campo `sets` usa sempre player1_id come riferimento
  IF v_match.player1_id = v_pid_a THEN
    -- A è player1: i set sono già orientati correttamente
    v_p1_sets   := p_sets_a;
    v_p2_sets   := p_sets_b;
    v_sets_json := p_score_detail;
  ELSE
    -- A è player2: inverte i set e il json
    v_p1_sets   := p_sets_b;
    v_p2_sets   := p_sets_a;
    -- Inverte player1_score <-> player2_score nel JSONB
    SELECT jsonb_agg(
      jsonb_build_object(
        'player1_score', (elem->>'player2_score')::int,
        'player2_score', (elem->>'player1_score')::int
      )
    )
    INTO v_sets_json
    FROM jsonb_array_elements(p_score_detail) AS elem;
  END IF;

  -- Aggiorna il match
  UPDATE tournament_matches SET
    sets          = v_sets_json,
    player1_sets  = v_p1_sets,
    player2_sets  = v_p2_sets,
    winner_id     = v_winner_id,
    match_status  = 'completed',
    status        = 'completata',
    updated_at    = NOW()
  WHERE id = v_match.id;

  RETURN 'OK: ' || p_player_a || ' ' || p_sets_a || '-' || p_sets_b || ' ' || p_player_b;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- ROUND 1
-- ============================================================

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Angelo Pazzaglia', 'Ugo De Santis',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":1}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Andrea Mencaroni', 'Pier Daniele Tomat',
  2, 0,
  '[{"player1_score":6,"player2_score":4},{"player1_score":6,"player2_score":3}]'::jsonb
);

-- Maurizio Rossi def Daniele Cammarone 6-0, 6-2
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Maurizio Rossi', 'Daniele Cammarone',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":2}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Fabrizio Lombroni', 'Andrea Ciancarelli',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":0}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Fabrizio Sacco', 'Vito Fascia',
  2, 0,
  '[{"player1_score":6,"player2_score":3},{"player1_score":6,"player2_score":3}]'::jsonb
);

-- Morrone def De Leo 6-4, 2-6, 10-4 (super tiebreak)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Stefano Morrone', 'Carlo De Leo',
  2, 1,
  '[{"player1_score":6,"player2_score":4},{"player1_score":2,"player2_score":6},{"player1_score":10,"player2_score":4}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Enrico Agosta', 'Marco Salzano',
  2, 0,
  '[{"player1_score":6,"player2_score":3},{"player1_score":6,"player2_score":4}]'::jsonb
);

-- Bottero def Giovagnoli 7-6, 2-6, 10-8 (super tiebreak)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Enrico Bottero', 'Stefano Giovagnoli',
  2, 1,
  '[{"player1_score":7,"player2_score":6},{"player1_score":2,"player2_score":6},{"player1_score":10,"player2_score":8}]'::jsonb
);

-- Santarpia def Patrizio Mocci 6-2, 6-1
-- (nel round 1 Claudio Sansone aveva il BYE)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Alessandro Santarpia', 'Patrizio Mocci',
  2, 0,
  '[{"player1_score":6,"player2_score":2},{"player1_score":6,"player2_score":1}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Andrea Bianconi', 'Antonio Colelli',
  2, 0,
  '[{"player1_score":6,"player2_score":4},{"player1_score":6,"player2_score":4}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Manuel Belardinelli', 'Francesco Madonna',
  2, 0,
  '[{"player1_score":6,"player2_score":2},{"player1_score":6,"player2_score":1}]'::jsonb
);

-- Caponegro def Olliana 6-3, 2-6, 10-7 (super tiebreak)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Gianluca Caponegro', 'Marco Olliana',
  2, 1,
  '[{"player1_score":6,"player2_score":3},{"player1_score":2,"player2_score":6},{"player1_score":10,"player2_score":7}]'::jsonb
);

-- Melilla def Sandro Mocci 6-1, 5-7, 10-7 (super tiebreak)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Massimo Melilla', 'Sandro Mocci',
  2, 1,
  '[{"player1_score":6,"player2_score":1},{"player1_score":5,"player2_score":7},{"player1_score":10,"player2_score":7}]'::jsonb
);

-- TODO Round 1: match Ernesto Azzolina vs Alessio Romiti (risultato non visibile nel sito)
-- TODO Round 1: match Roberto Pompei vs Francesco De Angelis (da verificare)


-- ============================================================
-- ROUND 2
-- ============================================================

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Angelo Pazzaglia', 'Francesco De Angelis',
  2, 0,
  '[{"player1_score":6,"player2_score":1},{"player1_score":6,"player2_score":2}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Ugo De Santis', 'Alessio Romiti',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":0}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Andrea Mencaroni', 'Daniele Cammarone',
  2, 0,
  '[{"player1_score":6,"player2_score":2},{"player1_score":6,"player2_score":1}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Ernesto Azzolina', 'Andrea Ciancarelli',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":0}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Maurizio Rossi', 'Vito Fascia',
  2, 0,
  '[{"player1_score":6,"player2_score":3},{"player1_score":6,"player2_score":1}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Fabrizio Lombroni', 'Stefano Morrone',
  2, 0,
  '[{"player1_score":6,"player2_score":2},{"player1_score":6,"player2_score":0}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Fabrizio Sacco', 'Marco Salzano',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":0}]'::jsonb
);

-- De Leo def Giovagnoli 6-7, 6-0, 10-8 (super tiebreak)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Carlo De Leo', 'Stefano Giovagnoli',
  2, 1,
  '[{"player1_score":6,"player2_score":7},{"player1_score":6,"player2_score":0},{"player1_score":10,"player2_score":8}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Enrico Agosta', 'Claudio Sansone',
  2, 0,
  '[{"player1_score":6,"player2_score":2},{"player1_score":6,"player2_score":1}]'::jsonb
);

-- Bottero def Pompei 2-6, 6-4, 10-7 (super tiebreak)
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Enrico Bottero', 'Roberto Pompei',
  2, 1,
  '[{"player1_score":2,"player2_score":6},{"player1_score":6,"player2_score":4},{"player1_score":10,"player2_score":7}]'::jsonb
);

SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Manuel Belardinelli', 'Patrizio Mocci',
  2, 0,
  '[{"player1_score":6,"player2_score":3},{"player1_score":6,"player2_score":0}]'::jsonb
);

-- Olliana def Melilla 6-0, 6-2
SELECT update_match_result(
  'score7:ijmxbvwrep',
  'Marco Olliana', 'Massimo Melilla',
  2, 0,
  '[{"player1_score":6,"player2_score":0},{"player1_score":6,"player2_score":2}]'::jsonb
);

-- TODO Round 2: match Santarpia vs Andrea Bianconi (punteggio parziale visibile: 6-? 6-?)
-- TODO Round 2: match tra (Colelli / Caponegro / Madonna) vs Sandro Mocci 6-0, 6-3 (nome sfidante da verificare)


-- ============================================================
-- ROUND 3-31: da inserire manualmente
-- ============================================================
-- Il sito score7.io carica i round 3-31 solo via JavaScript
-- (non accessibili via scraping statico).
--
-- Per ogni partita successiva, usa questa sintassi:
--
-- SELECT update_match_result(
--   'score7:ijmxbvwrep',
--   'Nome Vincitore', 'Nome Perdente',
--   2, 0,  -- set vinti: 2-0
--   '[{"player1_score":6,"player2_score":3},{"player1_score":6,"player2_score":4}]'::jsonb
-- );
--
-- Per un 2-1 con super tiebreak:
-- SELECT update_match_result(
--   'score7:ijmxbvwrep',
--   'Nome Vincitore', 'Nome Perdente',
--   2, 1,
--   '[{"player1_score":6,"player2_score":4},{"player1_score":3,"player2_score":6},{"player1_score":10,"player2_score":7}]'::jsonb
-- );
-- ============================================================
