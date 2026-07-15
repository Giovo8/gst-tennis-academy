-- Migration: Terza opzione 'unica' per la fascia oraria del listino prezzi
-- Description: Oltre a 'giorno'/'notte' (introdotti in 074), il listino prezzi di
--              campo/lezione_privata puo' avere una riga con fascia_oraria='unica': un
--              prezzo unico valido per tutta la giornata, che l'admin puo' impostare invece
--              di definire due prezzi separati (giorno e notte) quando non vuole differenziarli.
--              'unica' e' un valore solo di LISTINO: la fascia oraria effettiva di una
--              prenotazione (bookings.fascia_oraria) resta sempre calcolata da
--              soglie_orario_notturno e vale 'giorno' o 'notte', mai 'unica'.
-- Date: 2026-07-15

-- 1. Amplia i valori ammessi per listino_prezzi.fascia_oraria.
ALTER TABLE listino_prezzi DROP CONSTRAINT IF EXISTS listino_prezzi_fascia_oraria_check;
ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_fascia_oraria_check
  CHECK (fascia_oraria IN ('giorno','notte','unica'));

-- 2. Il match del prezzo considera un'eventuale riga 'unica' come fallback quando non esiste
-- un prezzo specifico per la fascia (giorno/notte) della prenotazione: se entrambe le righe
-- sono in vigore, vince quella specifica (ORDER BY la fa preferire alla 'unica').
CREATE OR REPLACE FUNCTION set_booking_prezzo_applicato()
RETURNS trigger AS $$
DECLARE
  v_durata_minuti integer;
  v_prezzo numeric(10,2);
  v_ora_notte time;
BEGIN
  IF NEW.fascia_oraria IS NULL AND NEW.type IN ('campo', 'lezione_privata') THEN
    SELECT ora_notte INTO v_ora_notte
    FROM soglie_orario_notturno
    WHERE valido_dal <= NEW.start_time
      AND (valido_al IS NULL OR valido_al > NEW.start_time)
    LIMIT 1;

    NEW.fascia_oraria := CASE
      WHEN v_ora_notte IS NOT NULL AND (NEW.start_time AT TIME ZONE 'Europe/Rome')::time >= v_ora_notte
        THEN 'notte'
      ELSE 'giorno'
    END;
  END IF;

  IF NEW.prezzo_applicato IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_durata_minuti := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60);

  -- 1. Match esatto (tipo, durata, formato) in vigore al momento della creazione: preferisce
  -- la fascia specifica (giorno/notte) e ripiega su 'unica' se non c'e' un prezzo dedicato.
  SELECT prezzo INTO v_prezzo
  FROM listino_prezzi
  WHERE tipo_prenotazione = NEW.type
    AND durata_minuti = v_durata_minuti
    AND formato IS NOT DISTINCT FROM NEW.formato
    AND (fascia_oraria IS NOT DISTINCT FROM NEW.fascia_oraria OR fascia_oraria = 'unica')
    AND valido_dal <= now()
    AND (valido_al IS NULL OR valido_al > now())
  ORDER BY (fascia_oraria IS NOT DISTINCT FROM NEW.fascia_oraria) DESC
  LIMIT 1;

  -- 2. Fallback: durata configurata piu' vicina per lo stesso tipo+formato, stessa priorita'
  -- fascia specifica > 'unica', scalata proporzionalmente.
  IF v_prezzo IS NULL THEN
    SELECT (prezzo / durata_minuti) * v_durata_minuti INTO v_prezzo
    FROM listino_prezzi
    WHERE tipo_prenotazione = NEW.type
      AND formato IS NOT DISTINCT FROM NEW.formato
      AND (fascia_oraria IS NOT DISTINCT FROM NEW.fascia_oraria OR fascia_oraria = 'unica')
      AND valido_dal <= now()
      AND (valido_al IS NULL OR valido_al > now())
    ORDER BY (fascia_oraria IS NOT DISTINCT FROM NEW.fascia_oraria) DESC, ABS(durata_minuti - v_durata_minuti) ASC, durata_minuti ASC
    LIMIT 1;
  END IF;

  NEW.prezzo_applicato := ROUND(COALESCE(v_prezzo, 0), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
