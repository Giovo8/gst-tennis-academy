-- Migration: 001_create_tournaments_and_participants.sql
-- Crea le tabelle per i tornei e le partecipazioni

-- estensione per gen_random_uuid (Supabase solitamente la abilita)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabella tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  category text,
  level text,
  max_participants integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Aperto', -- es: 'Aperto', 'Concluso'
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON public.tournaments (starts_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments (status);

-- Tabella pivot per le partecipazioni
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tp_tournament_id ON public.tournament_participants (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_user_id ON public.tournament_participants (user_id);

-- Trigger per aggiornare updated_at su tournaments
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trg_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- NOTE:
-- 1) La foreign key su `user_id` non è imposta rigidamente: se nel tuo schema esiste
--    una tabella `profiles(id uuid)` puoi aggiungere una constraint qui oppure
--    usare `auth.users(id)` a seconda di come gestisci gli utenti.
-- 2) Le policy RLS sono fornite in una migration separata per chiarezza.

-- Add foreign key for user_id in tournament_participants
ALTER TABLE public.tournament_participants
ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Add foreign key for created_by in tournaments
ALTER TABLE public.tournaments
ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL;
