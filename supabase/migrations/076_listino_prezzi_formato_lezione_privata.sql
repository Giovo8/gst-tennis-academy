-- Migration: Distinzione singola/gruppo per il prezzo della lezione privata
-- Description: Come il campo (singolo/doppio, introdotto in 072), anche 'lezione_privata'
--              puo' avere un prezzo diverso in base al numero di partecipanti: 1 partecipante
--              = 'singola', 2+ partecipanti = 'gruppo'. Riusa la colonna 'formato' gia'
--              esistente su listino_prezzi/bookings (introdotta per il campo), con valori
--              propri per non confondere le due semantiche (singolo/doppio = tipo di campo,
--              singola/gruppo = numero di partecipanti alla lezione).
-- Date: 2026-07-15

-- 1. Sostituisce i due CHECK del campo 'formato' su listino_prezzi con un unico vincolo
-- che impone i valori ammessi per ciascun tipo_prenotazione (e NULL per gli altri tipi).
ALTER TABLE listino_prezzi DROP CONSTRAINT IF EXISTS listino_prezzi_formato_check;
ALTER TABLE listino_prezzi DROP CONSTRAINT IF EXISTS listino_prezzi_formato_solo_campo;

-- Backfill: le righe 'lezione_privata' preesistenti (storiche incluse, sia giorno che notte)
-- diventano 'singola' e vengono clonate identiche come 'gruppo', cosi' il prezzo applicato
-- resta invariato finche' l'admin non imposta un prezzo di gruppo diverso. Il trigger
-- append-only va disabilitato temporaneamente (normalmente blocca ogni UPDATE sulle righe
-- storiche, valido_al gia' valorizzato).
ALTER TABLE listino_prezzi DISABLE TRIGGER trg_listino_prezzi_append_only;
UPDATE listino_prezzi SET formato = 'singola' WHERE tipo_prenotazione = 'lezione_privata';
ALTER TABLE listino_prezzi ENABLE TRIGGER trg_listino_prezzi_append_only;

INSERT INTO listino_prezzi (tipo_prenotazione, formato, fascia_oraria, durata_minuti, prezzo, valido_dal, valido_al, created_at, created_by)
SELECT tipo_prenotazione, 'gruppo', fascia_oraria, durata_minuti, prezzo, valido_dal, valido_al, created_at, created_by
FROM listino_prezzi
WHERE tipo_prenotazione = 'lezione_privata' AND formato = 'singola';

ALTER TABLE listino_prezzi
  ADD CONSTRAINT listino_prezzi_formato_valori_per_tipo
  CHECK (
    (tipo_prenotazione = 'campo' AND formato IN ('singolo','doppio'))
    OR (tipo_prenotazione = 'lezione_privata' AND formato IN ('singola','gruppo'))
    OR (tipo_prenotazione NOT IN ('campo','lezione_privata') AND formato IS NULL)
  );

-- 2. Bookings: la colonna 'formato' (snapshot al momento della creazione) ammette anche i
-- valori 'singola'/'gruppo' per le prenotazioni di tipo lezione_privata.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_formato_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_formato_check
  CHECK (formato IN ('singolo','doppio','singola','gruppo'));

COMMENT ON COLUMN bookings.formato IS
  'Formato calcolato dal numero di partecipanti al momento della creazione e mai ricalcolato: per il campo singolo (<=2 giocatori) / doppio (>2); per la lezione privata singola (1 partecipante) / gruppo (2+ partecipanti). NULL per gli altri tipi e per le prenotazioni create prima della 072.';

-- Nessuna modifica necessaria a prevent_listino_prezzi_mutation() ne' a
-- set_booking_prezzo_applicato() (introdotte in 069, aggiornate in 072/074): il confronto e
-- il match sul prezzo sono gia' generici su 'formato' e valgono per qualunque tipo_prenotazione.
