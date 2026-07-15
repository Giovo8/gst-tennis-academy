-- Migration: Distinzione singolo/doppio per il prezzo del campo
-- Description: Il tipo 'campo' puo' avere un prezzo diverso per Singolo (<=2 giocatori)
--              e Doppio (>2 giocatori). Aggiunge 'formato' a listino_prezzi (obbligatorio
--              solo per tipo_prenotazione='campo') e a bookings (calcolato una sola volta
--              alla creazione dal numero di partecipanti, mai ricalcolato, stesso principio
--              di immutabilita' di prezzo_applicato introdotto in 069).
-- Date: 2026-07-15

-- 1. Listino prezzi: formato ammesso solo per 'campo', obbligatorio in quel caso.
ALTER TABLE listino_prezzi ADD COLUMN formato text CHECK (formato IN ('singolo','doppio'));

-- Backfill: le righe 'campo' preesistenti (storiche incluse) diventano 'singolo' e vengono
-- clonate identiche come 'doppio', cosi' il prezzo applicato resta invariato finche' l'admin
-- non imposta un prezzo doppio diverso. Il trigger append-only va disabilitato temporaneamente
-- perche' normalmente blocca ogni UPDATE sulle righe storiche (valido_al gia' valorizzato).
ALTER TABLE listino_prezzi DISABLE TRIGGER trg_listino_prezzi_append_only;
UPDATE listino_prezzi SET formato = 'singolo' WHERE tipo_prenotazione = 'campo';
ALTER TABLE listino_prezzi ENABLE TRIGGER trg_listino_prezzi_append_only;

-- Rifà il vincolo di non sovrapposizione includendo il formato (COALESCE per gestire
-- in modo uniforme i tipi senza formato, dove NULL <> NULL nei vincoli EXCLUDE).
-- Va tolto prima di clonare le righe 'doppio' (altrimenti coinciderebbero con le 'singolo'
-- sotto il vecchio vincolo, che non conosce ancora il formato).
ALTER TABLE listino_prezzi DROP CONSTRAINT listino_prezzi_no_overlap;

INSERT INTO listino_prezzi (tipo_prenotazione, formato, durata_minuti, prezzo, valido_dal, valido_al, created_at, created_by)
SELECT tipo_prenotazione, 'doppio', durata_minuti, prezzo, valido_dal, valido_al, created_at, created_by
FROM listino_prezzi
WHERE tipo_prenotazione = 'campo' AND formato = 'singolo';

ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_no_overlap
  EXCLUDE USING gist (
    tipo_prenotazione WITH =,
    durata_minuti WITH =,
    COALESCE(formato, '') WITH =,
    tstzrange(valido_dal, valido_al) WITH &&
  );

-- Solo ora, con tutte le righe 'campo' valorizzate, si puo' imporre il vincolo composito.
ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_formato_solo_campo
  CHECK (
    (tipo_prenotazione = 'campo' AND formato IS NOT NULL)
    OR (tipo_prenotazione <> 'campo' AND formato IS NULL)
  );

-- 2. Bookings: snapshot del formato al momento della creazione (nullable, solo per 'campo').
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS formato text CHECK (formato IN ('singolo','doppio'));

COMMENT ON COLUMN bookings.formato IS
  'Formato (singolo/doppio) per prenotazioni di tipo campo, calcolato dal numero di partecipanti al momento della creazione (<=2 = singolo, >2 = doppio) e mai ricalcolato. NULL per gli altri tipi e per le prenotazioni create prima di questa migration.';

-- 3. Aggiorna il trigger append-only: anche il formato non e' mai modificabile una volta impostato.
CREATE OR REPLACE FUNCTION prevent_listino_prezzi_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'listino_prezzi è append-only: eliminazione non consentita';
  END IF;
  IF NEW.tipo_prenotazione <> OLD.tipo_prenotazione
     OR NEW.durata_minuti <> OLD.durata_minuti
     OR NEW.formato IS DISTINCT FROM OLD.formato
     OR NEW.prezzo <> OLD.prezzo
     OR NEW.valido_dal <> OLD.valido_dal
     OR OLD.valido_al IS NOT NULL THEN
    RAISE EXCEPTION 'listino_prezzi è append-only: è consentita solo la chiusura di valido_al una sola volta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Aggiorna il calcolo automatico del prezzo per matchare anche sul formato
-- (IS NOT DISTINCT FROM: NEW.formato e' NULL per i tipi diversi da 'campo', cosi'
-- come le relative righe di listino, quindi il confronto resta corretto in entrambi i casi).
CREATE OR REPLACE FUNCTION set_booking_prezzo_applicato()
RETURNS trigger AS $$
DECLARE
  v_durata_minuti integer;
  v_prezzo numeric(10,2);
BEGIN
  IF NEW.prezzo_applicato IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_durata_minuti := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60);

  -- 1. Match esatto (tipo, durata, formato) in vigore al momento della creazione.
  SELECT prezzo INTO v_prezzo
  FROM listino_prezzi
  WHERE tipo_prenotazione = NEW.type
    AND durata_minuti = v_durata_minuti
    AND formato IS NOT DISTINCT FROM NEW.formato
    AND valido_dal <= now()
    AND (valido_al IS NULL OR valido_al > now())
  LIMIT 1;

  -- 2. Fallback: durata configurata piu' vicina per lo stesso tipo+formato, scalata proporzionalmente.
  IF v_prezzo IS NULL THEN
    SELECT (prezzo / durata_minuti) * v_durata_minuti INTO v_prezzo
    FROM listino_prezzi
    WHERE tipo_prenotazione = NEW.type
      AND formato IS NOT DISTINCT FROM NEW.formato
      AND valido_dal <= now()
      AND (valido_al IS NULL OR valido_al > now())
    ORDER BY ABS(durata_minuti - v_durata_minuti) ASC, durata_minuti ASC
    LIMIT 1;
  END IF;

  NEW.prezzo_applicato := ROUND(COALESCE(v_prezzo, 0), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
