-- Migration: Fix - il trigger append-only di listino_prezzi blocca ancora i DELETE
-- Description: La 073 doveva ricreare trg_listino_prezzi_append_only come "BEFORE UPDATE"
--              soltanto (per consentire il DELETE), ma il trigger risulta ancora agganciato
--              anche a DELETE: eliminare una riga storica (valido_al gia' valorizzato) fa
--              scattare "è consentita solo la chiusura di valido_al una sola volta" perché
--              in un DELETE trigger NEW è nullo e l'unica condizione che sopravvive è
--              "OLD.valido_al IS NOT NULL". Ricrea il trigger in modo esplicito e idempotente.
-- Date: 2026-07-15

DROP TRIGGER IF EXISTS trg_listino_prezzi_append_only ON listino_prezzi;

CREATE TRIGGER trg_listino_prezzi_append_only
BEFORE UPDATE ON listino_prezzi
FOR EACH ROW EXECUTE FUNCTION prevent_listino_prezzi_mutation();
