-- Migration: Controllo lato DB delle prenotazioni "torneo"
-- Description: Atleti e maestri possono creare/modificare prenotazioni anche direttamente
--              via client Supabase (RLS "Users can insert/update their bookings"), quindi i
--              controlli dell'API non bastano. Questo trigger impone, per chi NON è
--              admin/gestore, che bookings.tournament_match_id punti a una partita:
--                - in cui l'utente è uno dei due giocatori;
--                - di un torneo "In Corso";
--                - non conclusa/annullata e con entrambi i giocatori.
--              Esenti: service role (auth.uid() nullo: l'API valida già), admin/gestore,
--              e gli UPDATE che non cambiano la partita (es. spostare data/campo/orario).
-- Date: 2026-10-17

CREATE OR REPLACE FUNCTION public.check_booking_tournament_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tournament_match_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.tournament_match_id IS NOT DISTINCT FROM OLD.tournament_match_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR public.get_my_role() IN ('admin', 'gestore') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tournament_matches m
    JOIN public.tournaments t ON t.id = m.tournament_id
    JOIN public.tournament_participants p
      ON p.id IN (m.player1_id, m.player2_id)
    WHERE m.id = NEW.tournament_match_id
      AND p.user_id = auth.uid()
      AND m.player1_id IS NOT NULL
      AND m.player2_id IS NOT NULL
      AND lower(trim(t.status)) = 'in corso'
      AND COALESCE(m.status, '') NOT IN ('completata', 'annullata', 'walkover')
      AND COALESCE(m.match_status, '') NOT IN ('completed', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Puoi prenotare solo le tue partite di un torneo in corso'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_booking_tournament_match_trigger ON public.bookings;
CREATE TRIGGER check_booking_tournament_match_trigger
  BEFORE INSERT OR UPDATE OF tournament_match_id ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_tournament_match();
