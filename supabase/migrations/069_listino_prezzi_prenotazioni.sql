-- Migration: Listino prezzi prenotazioni (versionato, per tipo+durata)
-- Description: Sostituisce la tariffa oraria per campo (courts_settings.hourly_rate,
--              introdotta in 068) con un listino prezzi per (tipo_prenotazione, durata_minuti),
--              versionato nel tempo (append-only). Il prezzo applicato a ogni prenotazione
--              viene calcolato automaticamente alla creazione e salvato come snapshot
--              immutabile su bookings.prezzo_applicato, cosi' i cambi di listino non
--              modificano mai retroattivamente i ricavi gia' maturati.
-- Date: 2026-07-15

-- 1. Rimuove la tariffa per campo: i prezzi non dipendono piu' dal campo.
ALTER TABLE courts_settings DROP COLUMN IF EXISTS hourly_rate;

-- 2. Listino prezzi versionato
CREATE TABLE listino_prezzi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_prenotazione text NOT NULL CHECK (tipo_prenotazione IN ('campo','lezione','lezione_privata','lezione_gruppo')),
  durata_minuti integer NOT NULL CHECK (durata_minuti > 0),
  prezzo numeric(10,2) NOT NULL CHECK (prezzo >= 0),
  valido_dal timestamptz NOT NULL DEFAULT now(),
  valido_al timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  CHECK (valido_al IS NULL OR valido_al > valido_dal)
);

COMMENT ON TABLE listino_prezzi IS
  'Listino prezzi prenotazioni per tipo+durata, versionato nel tempo. Append-only: una nuova tariffa chiude la precedente (valido_al) e inserisce una nuova riga, mai un UPDATE del prezzo esistente.';

-- Richiede btree_gist (gia' abilitata nel progetto per il vincolo anti-overlap di bookings)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Per una stessa combinazione (tipo, durata) non possono esistere due prezzi validi nello stesso periodo.
ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_no_overlap
  EXCLUDE USING gist (
    tipo_prenotazione WITH =,
    durata_minuti WITH =,
    tstzrange(valido_dal, valido_al) WITH &&
  );

CREATE INDEX idx_listino_prezzi_lookup
  ON listino_prezzi (tipo_prenotazione, durata_minuti, valido_dal, valido_al);

-- Applica il vincolo append-only anche al service role: nessuno puo' eliminare o
-- modificare una riga storica, l'unica mutazione ammessa e' chiudere valido_al una volta sola.
CREATE OR REPLACE FUNCTION prevent_listino_prezzi_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'listino_prezzi è append-only: eliminazione non consentita';
  END IF;
  IF NEW.tipo_prenotazione <> OLD.tipo_prenotazione
     OR NEW.durata_minuti <> OLD.durata_minuti
     OR NEW.prezzo <> OLD.prezzo
     OR NEW.valido_dal <> OLD.valido_dal
     OR OLD.valido_al IS NOT NULL THEN
    RAISE EXCEPTION 'listino_prezzi è append-only: è consentita solo la chiusura di valido_al una sola volta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listino_prezzi_append_only
BEFORE UPDATE OR DELETE ON listino_prezzi
FOR EACH ROW EXECUTE FUNCTION prevent_listino_prezzi_mutation();

-- RLS abilitata senza policy: le uniche letture/scritture avvengono via API route
-- (supabaseServer + verifyAuth admin/gestore), stesso schema di stats/contabilita.
ALTER TABLE listino_prezzi ENABLE ROW LEVEL SECURITY;

-- 3. Snapshot immutabile del prezzo sulla prenotazione.
-- Nullable: le prenotazioni esistenti non hanno un prezzo storico noto (il vecchio
-- sistema calcolava i ricavi virtualmente per campo, non salvava nulla sulla riga) e
-- restano NULL. Si applica solo alle prenotazioni create dopo questa migration.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS prezzo_applicato numeric(10,2);

COMMENT ON COLUMN bookings.prezzo_applicato IS
  'Prezzo applicato alla prenotazione, calcolato e congelato al momento della creazione dal listino_prezzi in vigore. NULL per le prenotazioni create prima dell''introduzione del listino.';

-- 4. Calcolo automatico alla creazione: vale per qualunque path di insert
-- (/api/bookings, /api/bookings/batch, futuri) senza duplicare la logica in JS.
-- Non viene mai ricalcolato in UPDATE: modificare tipo/durata di una prenotazione
-- esistente non tocca il prezzo gia' congelato.
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

CREATE TRIGGER trg_set_booking_prezzo_applicato
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION set_booking_prezzo_applicato();
