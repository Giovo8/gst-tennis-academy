-- Migration: Fix bug nel trigger set_booking_prezzo_applicato (introdotto in 069)
-- Description: ROUND() veniva chiamato sul risultato di EXTRACT(EPOCH FROM interval),
--              che e' double precision. In PostgreSQL round() a un argomento esiste solo
--              per numeric, non per double precision: la funzione falliva con
--              "function round(double precision) does not exist" su OGNI insert in
--              bookings (la riga viene eseguita incondizionatamente all'inizio del trigger),
--              rompendo la creazione di prenotazioni. Fix: cast esplicito a numeric.
-- Date: 2026-07-15

CREATE OR REPLACE FUNCTION set_booking_prezzo_applicato()
RETURNS trigger AS $$
DECLARE
  v_durata_minuti integer;
  v_prezzo numeric(10,2);
BEGIN
  IF NEW.prezzo_applicato IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_durata_minuti := ROUND((EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60)::numeric);

  -- 1. Match esatto (tipo, durata) in vigore al momento della creazione.
  SELECT prezzo INTO v_prezzo
  FROM listino_prezzi
  WHERE tipo_prenotazione = NEW.type
    AND durata_minuti = v_durata_minuti
    AND valido_dal <= now()
    AND (valido_al IS NULL OR valido_al > now())
  LIMIT 1;

  -- 2. Fallback: durata configurata piu' vicina per lo stesso tipo, scalata proporzionalmente.
  IF v_prezzo IS NULL THEN
    SELECT (prezzo / durata_minuti) * v_durata_minuti INTO v_prezzo
    FROM listino_prezzi
    WHERE tipo_prenotazione = NEW.type
      AND valido_dal <= now()
      AND (valido_al IS NULL OR valido_al > now())
    ORDER BY ABS(durata_minuti - v_durata_minuti) ASC, durata_minuti ASC
    LIMIT 1;
  END IF;

  NEW.prezzo_applicato := ROUND(COALESCE(v_prezzo, 0), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
