-- Migration: Backfill una tantum di formato/fascia_oraria/prezzo_applicato
-- Description: Il listino prezzi (069, poi esteso in 072/074/076/077/078) e' stato attivato
--              oggi su un database che aveva gia' un mese di prenotazioni: quelle create prima
--              dell'attivazione hanno prezzo_applicato NULL (mai calcolato) e non contribuiscono
--              ai ricavi in /api/stats/contabilita. Su richiesta esplicita, questo backfill
--              calcola una tantum formato/fascia_oraria/prezzo_applicato per le prenotazioni
--              esistenti non cancellate che ne sono ancora prive, replicando esattamente
--              l'algoritmo del trigger set_booking_prezzo_applicato() (durata dalla
--              start_time/end_time, formato dal numero di partecipanti reali in
--              booking_participants, fascia oraria dalla soglia in vigore alla start_time).
--              A differenza del trigger, il prezzo usato e' quello IN VIGORE ORA (non poteva
--              esisterne uno "in vigore alla creazione", perche' il listino non esisteva
--              ancora): e' quindi una stima retroattiva, non uno storico reale. Prenotazioni
--              che hanno gia' un prezzo_applicato non vengono toccate (restano congelate).
--              Limitato alle prenotazioni con start_time <= now(): quelle future non sono
--              ancora "ricavo maturato" e restano prive di prezzo finche' non arrivano alla
--              loro data (o vengono create/modificate dopo l'attivazione del listino).
-- Date: 2026-07-15

DO $$
DECLARE
  r RECORD;
  v_count integer;
  v_formato text;
  v_fascia_oraria text;
  v_durata_minuti integer;
  v_ora_notte time;
  v_prezzo numeric(10,2);
BEGIN
  FOR r IN
    SELECT id, type, formato, fascia_oraria, start_time, end_time
    FROM bookings
    WHERE prezzo_applicato IS NULL
      AND status <> 'cancelled'
      AND start_time <= now()
  LOOP
    -- 1. Formato: se assente, calcolato dal numero di partecipanti reali della prenotazione
    -- (stesso principio applicativo di /api/bookings: campo -> singolo (<=2) / doppio (>2);
    -- lezione_privata -> singola (1) / doppia (2+)).
    IF r.formato IS NULL THEN
      SELECT COUNT(*) INTO v_count FROM booking_participants WHERE booking_id = r.id;
      v_formato := CASE
        WHEN r.type = 'campo' THEN (CASE WHEN v_count > 2 THEN 'doppio' ELSE 'singolo' END)
        WHEN r.type = 'lezione_privata' THEN (CASE WHEN v_count > 1 THEN 'doppia' ELSE 'singola' END)
        ELSE NULL
      END;
    ELSE
      v_formato := r.formato;
    END IF;

    -- 2. Fascia oraria: se assente, dalla soglia in vigore alla data/ora della prenotazione
    -- (start_time), non da quella odierna (stessa logica di set_booking_prezzo_applicato).
    IF r.fascia_oraria IS NULL AND r.type IN ('campo', 'lezione_privata') THEN
      SELECT ora_notte INTO v_ora_notte
      FROM soglie_orario_notturno
      WHERE valido_dal <= r.start_time
        AND (valido_al IS NULL OR valido_al > r.start_time)
      LIMIT 1;

      v_fascia_oraria := CASE
        WHEN v_ora_notte IS NOT NULL AND (r.start_time AT TIME ZONE 'Europe/Rome')::time >= v_ora_notte
          THEN 'notte'
        ELSE 'giorno'
      END;
    ELSE
      v_fascia_oraria := r.fascia_oraria;
    END IF;

    v_durata_minuti := ROUND(EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 60);

    -- 3. Prezzo: stesso match a due fasi del trigger (esatto, poi durata piu' vicina scalata
    -- proporzionalmente), con priorita' alla fascia specifica su 'unica' quando entrambe
    -- esistono. Usa il listino in vigore ORA.
    v_prezzo := NULL;

    SELECT prezzo INTO v_prezzo
    FROM listino_prezzi
    WHERE tipo_prenotazione = r.type::text
      AND durata_minuti = v_durata_minuti
      AND formato IS NOT DISTINCT FROM v_formato
      AND (fascia_oraria IS NOT DISTINCT FROM v_fascia_oraria OR fascia_oraria = 'unica')
      AND valido_dal <= now()
      AND (valido_al IS NULL OR valido_al > now())
    ORDER BY (fascia_oraria IS NOT DISTINCT FROM v_fascia_oraria) DESC
    LIMIT 1;

    IF v_prezzo IS NULL THEN
      SELECT (prezzo / durata_minuti) * v_durata_minuti INTO v_prezzo
      FROM listino_prezzi
      WHERE tipo_prenotazione = r.type::text
        AND formato IS NOT DISTINCT FROM v_formato
        AND (fascia_oraria IS NOT DISTINCT FROM v_fascia_oraria OR fascia_oraria = 'unica')
        AND valido_dal <= now()
        AND (valido_al IS NULL OR valido_al > now())
      ORDER BY (fascia_oraria IS NOT DISTINCT FROM v_fascia_oraria) DESC, ABS(durata_minuti - v_durata_minuti) ASC, durata_minuti ASC
      LIMIT 1;
    END IF;

    UPDATE bookings
    SET formato = v_formato,
        fascia_oraria = v_fascia_oraria,
        prezzo_applicato = ROUND(COALESCE(v_prezzo, 0), 2)
    WHERE id = r.id;
  END LOOP;
END $$;
