-- Script per applicare lo schema tournaments completo al database
-- Esegui questo script nell'editor SQL di Supabase

-- IMPORTANTE: Questo script applica le modifiche necessarie per risolvere
-- l'errore "Could not find the 'competition_type' column"

-- Step 1: Crea i tipi ENUM se non esistono già
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competition_type') THEN
        CREATE TYPE public.competition_type AS ENUM ('torneo', 'campionato');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competition_format') THEN
        CREATE TYPE public.competition_format AS ENUM (
            'eliminazione_diretta',
            'round_robin',
            'girone_eliminazione'
        );
    END IF;
END $$;

-- Step 2: La tabella tournaments esiste già, aggiungiamo solo le colonne mancanti
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments' AND table_schema = 'public') THEN
        -- Se la tabella esiste, aggiungi solo le colonne mancanti
        -- Aggiungi competition_type se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'competition_type'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN competition_type competition_type DEFAULT 'torneo' NOT NULL;
        END IF;

        -- Aggiungi format se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'format'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN format competition_format DEFAULT 'eliminazione_diretta' NOT NULL;
        END IF;

        -- Aggiungi match_format se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'match_format'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN match_format TEXT DEFAULT 'best_of_3';
        END IF;

        -- Aggiungi surface_type se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'surface_type'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN surface_type TEXT DEFAULT 'terra';
        END IF;

        -- Aggiungi rounds_data se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'rounds_data'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN rounds_data JSONB DEFAULT '[]'::jsonb;
        END IF;

        -- Aggiungi groups_data se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'groups_data'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN groups_data JSONB DEFAULT '[]'::jsonb;
        END IF;

        -- Aggiungi standings se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'standings'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN standings JSONB DEFAULT '[]'::jsonb;
        END IF;

        -- Aggiungi has_groups se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'has_groups'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN has_groups BOOLEAN DEFAULT false;
        END IF;

        -- Aggiungi current_stage se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'current_stage'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN current_stage TEXT DEFAULT 'registration';
        END IF;

        -- Aggiungi entry_fee se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'entry_fee'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN entry_fee DECIMAL(10,2);
        END IF;

        -- Aggiungi prize_money se non esiste
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            AND column_name = 'prize_money'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.tournaments 
            ADD COLUMN prize_money DECIMAL(10,2);
        END IF;
    END IF;
END $$;

-- Step 3: Abilita RLS se non già abilitato (evita errori se già abilitato)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'tournaments' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 4: Crea o ricrea le policy (usa DROP IF EXISTS per sicurezza)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view active tournaments" ON public.tournaments;
    CREATE POLICY "Anyone can view active tournaments"
        ON public.tournaments
        FOR SELECT
        USING (true);
    
    DROP POLICY IF EXISTS "Admin and gestore can manage tournaments" ON public.tournaments;
    CREATE POLICY "Admin and gestore can manage tournaments"
        ON public.tournaments
        FOR ALL
        USING (EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('gestore', 'admin')
        ));
END $$;

-- Step 5: Crea gli indici solo se le colonne esistono
DO $$ 
BEGIN
    -- Indice su competition_type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournaments' 
        AND column_name = 'competition_type'
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS tournaments_competition_type_idx ON public.tournaments (competition_type);
    END IF;
    
    -- Indice su format
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournaments' 
        AND column_name = 'format'
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS tournaments_format_idx ON public.tournaments (format);
    END IF;
END $$;

-- Step 6: Crea il trigger per updated_at se non esiste
DROP TRIGGER IF EXISTS update_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON public.tournaments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Crea la tabella tournament_participants se non esiste
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT,
    seed INT,
    group_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tournament_id, user_id)
);

-- Step 8: Abilita RLS per tournament_participants
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Step 9: Policy per tournament_participants
DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Anyone can view tournament participants"
    ON public.tournament_participants
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can register themselves" ON public.tournament_participants;
CREATE POLICY "Users can register themselves"
    ON public.tournament_participants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can manage participants" ON public.tournament_participants;
CREATE POLICY "Admin can manage participants"
    ON public.tournament_participants
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('gestore', 'admin')
    ));

-- Step 10: Indici per tournament_participants
CREATE INDEX IF NOT EXISTS tournament_participants_tournament_idx ON public.tournament_participants (tournament_id);
CREATE INDEX IF NOT EXISTS tournament_participants_user_idx ON public.tournament_participants (user_id);

-- COMPLETATO!
-- Esegui una query per verificare che tutto funzioni:
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
