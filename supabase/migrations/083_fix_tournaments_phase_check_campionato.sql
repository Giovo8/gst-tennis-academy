-- Fix: il vincolo tournaments_phase_check (creato in 010_simplified_tournament_system.sql)
-- non includeva 'campionato' tra i valori ammessi per current_phase, pur essendo
-- un valore impostato da /api/tournaments/[id]/start per i tornei di tipo "campionato"
-- e gestito come fase valida nel frontend (TournamentManager.tsx).
-- Questo causava un errore 500 (violazione CHECK) all'avvio di tornei "campionato".

ALTER TABLE tournaments
DROP CONSTRAINT IF EXISTS tournaments_phase_check;

ALTER TABLE tournaments
ADD CONSTRAINT tournaments_phase_check
CHECK (current_phase IN ('iscrizioni', 'gironi', 'eliminazione', 'campionato', 'completato', 'annullato'));
