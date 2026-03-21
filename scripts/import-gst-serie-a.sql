-- ============================================================
-- IMPORT: GST SERIE A (da score7.io/tournaments/ijmxbvwrep)
-- ============================================================
-- Questo script crea il campionato "GST SERIE A" con tutti i
-- 31 partecipanti e genera il calendario round-robin completo
-- IDENTICO a quello di score7.io.
--
-- L'ordinamento dei giocatori (circle-method) è stato
-- ricostruito analizzando Round 1 e Round 2 visibili sul sito:
--   - pos 1 (FISSO) = Francesco De Angelis (bye al round 1)
--   - pos 2..31 = giocatori nell'ordine circle score7
--   - pos 32 = BYE (implicito, valore 0 nell'algoritmo)
--
-- ISTRUZIONI:
--   1. Applica prima la migration 035_support_external_players.sql
--   2. Esegui questo script nell'SQL editor di Supabase
--   3. Il torneo sarà visibile nel pannello admin → Tornei
-- ============================================================

DO $$
DECLARE
  v_tournament_id UUID;
  v_participants  UUID[];
  v_names         TEXT[];
  v_participant_id UUID;
  v_ids           UUID[];
  v_num_players   INT;
  v_idx           INT[];
  v_half          INT;
  v_num_rounds    INT;
  v_round         INT;
  v_match         INT;
  v_match_number  INT;
  v_home          INT;
  v_away          INT;
  v_home_id       UUID;
  v_away_id       UUID;
  v_temp          INT;
  v_i             INT;

BEGIN
  -- --------------------------------------------------------
  -- 1. Crea il torneo
  -- --------------------------------------------------------
  INSERT INTO public.tournaments (
    title,
    description,
    tournament_type,
    current_phase,
    status,
    max_participants,
    match_format,
    best_of,
    surface_type,
    external_source,
    start_date
  )
  VALUES (
    'GST SERIE A',
    'Campionato GST Serie A — Round Robin. Fonte: score7.io',
    'campionato',
    'completato',       -- fase: calendario generato e in corso
    'In Corso',
    31,
    'best_of_3',
    3,
    'terra',
    'score7:ijmxbvwrep',
    CURRENT_DATE
  )
  RETURNING id INTO v_tournament_id;

  RAISE NOTICE 'Torneo creato: %', v_tournament_id;

  -- --------------------------------------------------------
  -- 2. Inserisci i 31 partecipanti (giocatori esterni)
  --    Ordine: ordinamento circle-method di score7.io
  --    (ricostruito da Round 1 + Round 2 visibili sul sito)
  --
  --    pos 1  = Francesco De Angelis (FISSO, bye al round 1)
  --    pos 2  = Ugo De Santis
  --    pos 3  = Andrea Mencaroni
  --    ... vedi commenti in linea
  --    pos 31 = Angelo Pazzaglia
  --    pos 32 = BYE (aggiunto automaticamente dall'algoritmo come 0)
  -- --------------------------------------------------------
  v_names := ARRAY[
    'Francesco De Angelis',   -- pos  1 (FISSO)
    'Ugo De Santis',          -- pos  2
    'Andrea Mencaroni',       -- pos  3
    'Ernesto Azzolina',       -- pos  4
    'Maurizio Rossi',         -- pos  5
    'Fabrizio Lombroni',      -- pos  6
    'Fabrizio Sacco',         -- pos  7
    'Carlo De Leo',           -- pos  8
    'Enrico Agosta',          -- pos  9
    'Enrico Bottero',         -- pos 10
    'Alessandro Santarpia',   -- pos 11
    'Patrizio Mocci',         -- pos 12
    'Antonio Colelli',        -- pos 13
    'Francesco Madonna',      -- pos 14
    'Marco Olliana',          -- pos 15
    'Massimo Melilla',        -- pos 16
    'Sandro Mocci',           -- pos 17
    'Gianluca Caponegro',     -- pos 18
    'Manuel Belardinelli',    -- pos 19
    'Andrea Bianconi',        -- pos 20
    'Roberto Pompei',         -- pos 21
    'Claudio Sansone',        -- pos 22
    'Stefano Giovagnoli',     -- pos 23
    'Marco Salzano',          -- pos 24
    'Stefano Morrone',        -- pos 25
    'Vito Fascia',            -- pos 26
    'Andrea Ciancarelli',     -- pos 27
    'Daniele Cammarone',      -- pos 28
    'Alessio Romiti',         -- pos 29
    'Pier Daniele Tomat',     -- pos 30
    'Angelo Pazzaglia'        -- pos 31
  ];

  -- Inserisci e raccogli gli ID nell'ordine di inserimento
  v_ids := ARRAY[]::UUID[];
  FOR v_i IN 1..array_length(v_names, 1) LOOP
    INSERT INTO public.tournament_participants (
      tournament_id,
      player_name,
      user_id,
      status,
      stats
    )
    VALUES (
      v_tournament_id,
      v_names[v_i],
      NULL,   -- nessun account app
      'confirmed',
      '{
        "matches_played": 0,
        "matches_won": 0,
        "matches_lost": 0,
        "sets_won": 0,
        "sets_lost": 0,
        "games_won": 0,
        "games_lost": 0,
        "points": 0
      }'::jsonb
    )
    RETURNING id INTO v_participant_id;

    v_ids := array_append(v_ids, v_participant_id);
  END LOOP;

  RAISE NOTICE 'Inseriti % partecipanti', array_length(v_ids, 1);

  -- --------------------------------------------------------
  -- 3. Genera il calendario round-robin completo
  --    Algoritmo: con N dispari aggiunge un "bye" (NULL)
  --    per arrivare a N+1 = 32 -> 31 giornate x 15 match = 465 match
  -- --------------------------------------------------------
  v_num_players := array_length(v_ids, 1);  -- 31

  -- Se dispari aggiungiamo NULL come "bye"
  -- Lo gestiamo tramite v_idx che mappa posizione -> indice in v_ids
  -- L'indice 0 rappresenta il BYE (NULL)
  -- v_idx[1..32] = indici nei partecipanti (1-based) oppure 0 per bye
  v_idx := ARRAY[]::INT[];
  FOR v_i IN 1..v_num_players LOOP
    v_idx := array_append(v_idx, v_i);
  END LOOP;
  -- Aggiunge "bye" (0) per rendere il totale pari
  v_idx := array_append(v_idx, 0);

  v_num_rounds := 31;   -- N+1 - 1 = 31 giornate
  v_half       := 16;   -- (N+1)/2 = 16 match per giornata (1 bye)
  v_match_number := 1;

  FOR v_round IN 1..v_num_rounds LOOP
    FOR v_match IN 1..v_half LOOP
      -- home = elemento alla posizione v_match (1-based)
      -- away = elemento alla posizione (array_length - v_match + 1) ma tenendo fisso v_idx[1]
      v_home := v_idx[v_match];
      v_away := v_idx[array_length(v_idx, 1) - v_match + 1];

      -- Salta se uno dei due è il BYE (0)
      IF v_home <> 0 AND v_away <> 0 THEN
        v_home_id := v_ids[v_home];
        v_away_id := v_ids[v_away];

        -- player1 = away (posizione alta, bottom row = come mostra score7)
        -- player2 = home (posizione bassa, top row)
        INSERT INTO public.tournament_matches (
          tournament_id,
          phase,
          round_name,
          round_number,
          match_number,
          player1_id,
          player2_id,
          status,
          sets
        )
        VALUES (
          v_tournament_id,
          'gironi',
          'Giornata ' || v_round,
          v_round,
          v_match_number,
          v_away_id,   -- posizione alta (bottom row) = stesso ordine di score7
          v_home_id,   -- posizione bassa (top row)
          'programmata',
          '[]'::jsonb
        );

        v_match_number := v_match_number + 1;
      END IF;
    END LOOP;

    -- -------------------------------------------------------
    -- Ruota gli indici: tutti tranne il primo (che rimane fisso)
    -- Sposta l'ultimo elemento in posizione 2
    -- -------------------------------------------------------
    -- Prendi l'ultimo elemento
    v_temp := v_idx[array_length(v_idx, 1)];
    -- Rimuovi l'ultimo
    v_idx := v_idx[1:array_length(v_idx, 1) - 1];
    -- Costruisci nuovo array: primo + v_temp + resto
    v_idx := ARRAY[v_idx[1], v_temp] || v_idx[2:array_length(v_idx, 1)];
  END LOOP;

  RAISE NOTICE 'Match generati: %', v_match_number - 1;
  RAISE NOTICE '=== Importazione completata ===';
  RAISE NOTICE 'Torneo ID: %', v_tournament_id;
  RAISE NOTICE 'Vai su: Dashboard → Admin → Tornei';

END $$;
