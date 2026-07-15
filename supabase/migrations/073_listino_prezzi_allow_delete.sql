-- Migration: Consente l'eliminazione di righe dal listino prezzi
-- Description: listino_prezzi era append-only anche per i DELETE (introdotto in 069):
--              impediva di correggere un prezzo inserito per errore. bookings.prezzo_applicato
--              e' uno snapshot numerico congelato alla creazione (non una FK verso
--              listino_prezzi), quindi eliminare una riga di listino non altera in alcun modo
--              i prezzi gia' applicati alle prenotazioni esistenti: resta append-only solo
--              per gli UPDATE (lo storico dei prezzi tenuti in vigore non e' mai alterabile).
-- Date: 2026-07-15

DROP TRIGGER trg_listino_prezzi_append_only ON listino_prezzi;

CREATE OR REPLACE FUNCTION prevent_listino_prezzi_mutation()
RETURNS trigger AS $$
BEGIN
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

CREATE TRIGGER trg_listino_prezzi_append_only
BEFORE UPDATE ON listino_prezzi
FOR EACH ROW EXECUTE FUNCTION prevent_listino_prezzi_mutation();

COMMENT ON TABLE listino_prezzi IS
  'Listino prezzi prenotazioni per tipo+durata(+formato per il campo), versionato nel tempo. Append-only solo per gli UPDATE: una nuova tariffa chiude la precedente (valido_al) e inserisce una nuova riga, mai un UPDATE del prezzo esistente. Le righe possono essere eliminate (solo admin/gestore, via /api/contabilita/listino-prezzi) per correggere errori di inserimento: non impatta prezzo_applicato, gia'' congelato sulle prenotazioni al momento della creazione.';
