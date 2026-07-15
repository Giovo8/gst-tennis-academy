-- Migration: Rinomina il valore 'gruppo' in 'doppia' per il formato lezione_privata
-- Description: La 076 ha introdotto 'formato' (singola/gruppo) per 'lezione_privata'. Cambio
--              di nomenclatura richiesto dopo il rilascio: 'gruppo' -> 'doppia', per coerenza
--              con la coppia singola/doppia usata nel resto della UI. Rinomina sia le righe
--              gia' presenti in listino_prezzi/bookings sia i vincoli CHECK che validano i
--              valori ammessi.
-- Date: 2026-07-15

-- 1. listino_prezzi: rinomina le righe esistenti prima di stringere il CHECK (altrimenti
-- le righe con formato='gruppo' violerebbero subito il nuovo vincolo). Il trigger append-only
-- va disabilitato temporaneamente per poter aggiornare anche le righe storiche gia' chiuse.
ALTER TABLE listino_prezzi DISABLE TRIGGER trg_listino_prezzi_append_only;
UPDATE listino_prezzi SET formato = 'doppia' WHERE tipo_prenotazione = 'lezione_privata' AND formato = 'gruppo';
ALTER TABLE listino_prezzi ENABLE TRIGGER trg_listino_prezzi_append_only;

ALTER TABLE listino_prezzi DROP CONSTRAINT IF EXISTS listino_prezzi_formato_valori_per_tipo;
ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_formato_valori_per_tipo
  CHECK (
    (tipo_prenotazione = 'campo' AND formato IN ('singolo','doppio'))
    OR (tipo_prenotazione = 'lezione_privata' AND formato IN ('singola','doppia'))
    OR (tipo_prenotazione NOT IN ('campo','lezione_privata') AND formato IS NULL)
  );

-- 2. bookings: idem per lo snapshot congelato sulle prenotazioni gia' create.
UPDATE bookings SET formato = 'doppia' WHERE type = 'lezione_privata' AND formato = 'gruppo';

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_formato_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_formato_check
  CHECK (formato IN ('singolo','doppio','singola','doppia'));

COMMENT ON COLUMN bookings.formato IS
  'Formato calcolato dal numero di partecipanti al momento della creazione e mai ricalcolato: per il campo singolo (<=2 giocatori) / doppio (>2); per la lezione privata singola (1 partecipante) / doppia (2+ partecipanti). NULL per gli altri tipi e per le prenotazioni create prima della 072.';
