-- Migration: Distinzione giorno/notte per il prezzo di campo e lezione privata
-- Description: Campo e lezione_privata possono avere un prezzo diverso in base alla fascia
--              oraria (giorno/notte). La soglia (es. ~18:00 in inverno, ~20:00 in estate) e'
--              stagionale e va aggiornata periodicamente dall'admin: nuova tabella versionata
--              soglie_orario_notturno. A differenza del prezzo (che usa il listino in vigore
--              al momento della CREAZIONE), la fascia oraria di una prenotazione dipende dalla
--              soglia in vigore alla DATA/ORA della prenotazione (start_time): una prenotazione
--              fatta oggi per un giorno d'estate deve usare la soglia estiva, non quella odierna.
-- Date: 2026-07-15

-- 1. Soglia oraria notturna, versionata nel tempo (un solo valore attivo alla volta).
CREATE TABLE soglie_orario_notturno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ora_notte time NOT NULL,
  valido_dal timestamptz NOT NULL DEFAULT now(),
  valido_al timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  CHECK (valido_al IS NULL OR valido_al > valido_dal)
);

COMMENT ON TABLE soglie_orario_notturno IS
  'Orario locale (Europe/Rome) da cui una prenotazione di campo o lezione privata e'' considerata "notte" ai fini del prezzo. Versionato per riflettere la soglia stagionale: il valore applicato a una prenotazione e'' quello in vigore per la data/ora della prenotazione (start_time), non per la data di creazione.';

ALTER TABLE soglie_orario_notturno
  ADD CONSTRAINT soglie_orario_notturno_no_overlap
  EXCLUDE USING gist (
    tstzrange(valido_dal, valido_al) WITH &&
  );

CREATE INDEX idx_soglie_orario_notturno_lookup
  ON soglie_orario_notturno (valido_dal, valido_al);

-- Storico non alterabile (stesso principio di listino_prezzi dopo la 073): la modifica di
-- ora_notte/valido_dal o di una riga gia' chiusa e' bloccata, ma le righe sono eliminabili
-- (nessun'altra tabella referenzia questa: bookings.fascia_oraria e' uno snapshot congelato).
CREATE OR REPLACE FUNCTION prevent_soglie_orario_notturno_mutation()
RETURNS trigger AS $$
BEGIN
  IF NEW.ora_notte <> OLD.ora_notte
     OR NEW.valido_dal <> OLD.valido_dal
     OR OLD.valido_al IS NOT NULL THEN
    RAISE EXCEPTION 'soglie_orario_notturno è append-only: è consentita solo la chiusura di valido_al una sola volta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_soglie_orario_notturno_append_only
BEFORE UPDATE ON soglie_orario_notturno
FOR EACH ROW EXECUTE FUNCTION prevent_soglie_orario_notturno_mutation();

-- RLS abilitata senza policy: solo supabaseServer (service role) via API admin/gestore.
ALTER TABLE soglie_orario_notturno ENABLE ROW LEVEL SECURITY;

-- 2. Listino prezzi: fascia_oraria ammessa solo per 'campo'/'lezione_privata', obbligatoria in quel caso.
ALTER TABLE listino_prezzi ADD COLUMN fascia_oraria text CHECK (fascia_oraria IN ('giorno','notte'));

-- Backfill: le righe 'campo'/'lezione_privata' preesistenti (storiche incluse) diventano
-- 'giorno' e vengono clonate identiche come 'notte', cosi' il prezzo applicato resta invariato
-- finche' l'admin non imposta un prezzo notturno diverso.
ALTER TABLE listino_prezzi DISABLE TRIGGER trg_listino_prezzi_append_only;
UPDATE listino_prezzi SET fascia_oraria = 'giorno' WHERE tipo_prenotazione IN ('campo','lezione_privata');
ALTER TABLE listino_prezzi ENABLE TRIGGER trg_listino_prezzi_append_only;

-- Va tolto prima di clonare le righe 'notte' (altrimenti coinciderebbero con le 'giorno'
-- sotto il vecchio vincolo, che non conosce ancora la fascia oraria).
ALTER TABLE listino_prezzi DROP CONSTRAINT listino_prezzi_no_overlap;

INSERT INTO listino_prezzi (tipo_prenotazione, formato, fascia_oraria, durata_minuti, prezzo, valido_dal, valido_al, created_at, created_by)
SELECT tipo_prenotazione, formato, 'notte', durata_minuti, prezzo, valido_dal, valido_al, created_at, created_by
FROM listino_prezzi
WHERE tipo_prenotazione IN ('campo','lezione_privata') AND fascia_oraria = 'giorno';

ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_no_overlap
  EXCLUDE USING gist (
    tipo_prenotazione WITH =,
    durata_minuti WITH =,
    COALESCE(formato, '') WITH =,
    COALESCE(fascia_oraria, '') WITH =,
    tstzrange(valido_dal, valido_al) WITH &&
  );

-- Solo ora, con tutte le righe valorizzate, si puo' imporre il vincolo composito.
ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_fascia_oraria_campo_o_lezione
  CHECK (
    (tipo_prenotazione IN ('campo','lezione_privata') AND fascia_oraria IS NOT NULL)
    OR (tipo_prenotazione NOT IN ('campo','lezione_privata') AND fascia_oraria IS NULL)
  );

-- 3. Bookings: snapshot della fascia oraria al momento della creazione.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fascia_oraria text CHECK (fascia_oraria IN ('giorno','notte'));

COMMENT ON COLUMN bookings.fascia_oraria IS
  'Fascia oraria (giorno/notte) per prenotazioni di tipo campo/lezione_privata, calcolata dalla soglia in vigore per la data della prenotazione (start_time) e mai ricalcolata. NULL per gli altri tipi e per le prenotazioni create prima di questa migration.';

-- 4. Aggiorna il trigger append-only del listino: anche la fascia oraria non e' mai modificabile.
CREATE OR REPLACE FUNCTION prevent_listino_prezzi_mutation()
RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_prenotazione <> OLD.tipo_prenotazione
     OR NEW.durata_minuti <> OLD.durata_minuti
     OR NEW.formato IS DISTINCT FROM OLD.formato
     OR NEW.fascia_oraria IS DISTINCT FROM OLD.fascia_oraria
     OR NEW.prezzo <> OLD.prezzo
     OR NEW.valido_dal <> OLD.valido_dal
     OR OLD.valido_al IS NOT NULL THEN
    RAISE EXCEPTION 'listino_prezzi è append-only: è consentita solo la chiusura di valido_al una sola volta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Calcola la fascia oraria (in base a soglie_orario_notturno e a NEW.start_time) e la
-- include nel match del prezzo, insieme a formato.
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

  -- 1. Match esatto (tipo, durata, formato, fascia_oraria) in vigore al momento della creazione.
  SELECT prezzo INTO v_prezzo
  FROM listino_prezzi
  WHERE tipo_prenotazione = NEW.type
    AND durata_minuti = v_durata_minuti
    AND formato IS NOT DISTINCT FROM NEW.formato
    AND fascia_oraria IS NOT DISTINCT FROM NEW.fascia_oraria
    AND valido_dal <= now()
    AND (valido_al IS NULL OR valido_al > now())
  LIMIT 1;

  -- 2. Fallback: durata configurata piu' vicina per lo stesso tipo+formato+fascia, scalata proporzionalmente.
  IF v_prezzo IS NULL THEN
    SELECT (prezzo / durata_minuti) * v_durata_minuti INTO v_prezzo
    FROM listino_prezzi
    WHERE tipo_prenotazione = NEW.type
      AND formato IS NOT DISTINCT FROM NEW.formato
      AND fascia_oraria IS NOT DISTINCT FROM NEW.fascia_oraria
      AND valido_dal <= now()
      AND (valido_al IS NULL OR valido_al > now())
    ORDER BY ABS(durata_minuti - v_durata_minuti) ASC, durata_minuti ASC
    LIMIT 1;
  END IF;

  NEW.prezzo_applicato := ROUND(COALESCE(v_prezzo, 0), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
