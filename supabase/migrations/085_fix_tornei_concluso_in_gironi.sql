-- Migration: Ripristino tornei chiusi per errore durante la fase a gironi
-- Description: L'API del punteggio (PUT /api/tournaments/[id]/matches/[matchId]) faceva
--              avanzare anche il vincitore delle partite di girone (round 0) verso il
--              turno 1, che in fase gironi non esiste ancora: il torneo veniva quindi
--              marcato 'Concluso' al primo risultato inserito.
--              Un torneo ancora in fase 'gironi' non può essere concluso: torna 'In Corso'
--              (lo stato impostato da generate-groups all'avvio dei gironi).
-- Solo correzione dati: nessuna modifica a schema, RLS o funzioni.

UPDATE tournaments
SET status = 'In Corso'
WHERE status = 'Concluso'
  AND current_phase = 'gironi';
