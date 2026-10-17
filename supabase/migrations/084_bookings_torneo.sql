-- Migration: Prenotazioni di tipo "torneo"
-- Description: Aggiunge il tipo di prenotazione 'torneo' (enum booking_type) e il
--              collegamento opzionale alla partita del torneo giocata sul campo.
--              - bookings.tournament_match_id -> tournament_matches(id)
--              - al massimo UNA prenotazione attiva per partita (indice unico parziale)
--              Il trigger set_booking_prezzo_applicato() non ha listino per 'torneo':
--              prezzo_applicato risulta 0 finché non viene aggiunto un prezzo dedicato.
-- Date: 2026-10-12

ALTER TYPE public.booking_type ADD VALUE IF NOT EXISTS 'torneo';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tournament_match_id UUID
  REFERENCES public.tournament_matches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_tournament_match_idx
  ON public.bookings (tournament_match_id)
  WHERE tournament_match_id IS NOT NULL;

-- Una sola prenotazione attiva per partita (le annullate/rifiutate liberano la partita).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_tournament_match_active_unique
  ON public.bookings (tournament_match_id)
  WHERE tournament_match_id IS NOT NULL
    AND status NOT IN ('cancelled', 'rejected');

COMMENT ON COLUMN public.bookings.tournament_match_id IS
  'Partita di torneo associata (solo per prenotazioni di tipo torneo)';
