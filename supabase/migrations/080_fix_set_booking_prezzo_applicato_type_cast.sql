-- Migration: Fix - cast mancante su NEW.type reintrodotto da 072/074/078
-- Description: La 071 aveva gia' corretto "operator does not exist: text = booking_type"
--              nel trigger set_booking_prezzo_applicato() aggiungendo NEW.type::text nel
--              confronto con listino_prezzi.tipo_prenotazione (bookings.type e' l'enum
--              custom booking_type, non text). Ogni CREATE OR REPLACE FUNCTION successivo
--              (072 per il formato campo, 074 per la fascia oraria, 078 per 'unica') ha
--              pero' riscritto il corpo della funzione senza il cast, reintroducendo il bug:
--              PL/pgSQL non valida le query interne alla creazione della funzione, solo
--              all'esecuzione, quindi l'errore emerge solo al primo INSERT che la esegue
--              (esattamente come successo con il backfill della 079). Senza questo fix,
--              qualunque nuova prenotazione di tipo 'campo'/'lezione_privata' fallirebbe.
-- Date: 2026-07-15

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
  WHERE tipo_prenotazione = NEW.type::text
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
    WHERE tipo_prenotazione = NEW.type::text
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
