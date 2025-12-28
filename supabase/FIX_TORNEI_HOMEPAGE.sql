-- ============================================================
-- FIX: Ripristina la sezione Tornei/Competizioni nella homepage
-- ============================================================
-- Questo script verifica e ripristina la sezione tornei nella homepage

-- 1. Verifica se esiste la tabella homepage_sections
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'homepage_sections') THEN
        -- Crea la tabella se non esiste
        CREATE TABLE public.homepage_sections (
            id SERIAL PRIMARY KEY,
            section_key TEXT NOT NULL UNIQUE,
            section_name TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Abilita RLS
        ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
        
        -- Policy per la lettura pubblica
        CREATE POLICY "Anyone can view homepage sections"
          ON public.homepage_sections FOR SELECT USING (true);
        
        -- Policy per admin
        CREATE POLICY "Admin can update homepage sections"
          ON public.homepage_sections FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role IN ('admin', 'gestore')
            )
          );
    END IF;
END $$;

-- 2. Inserisci o aggiorna la sezione tornei
INSERT INTO public.homepage_sections (section_key, section_name, order_index, active)
VALUES ('tornei', 'Tornei e Competizioni', 2, true)
ON CONFLICT (section_key) 
DO UPDATE SET 
    active = true,
    section_name = 'Tornei e Competizioni',
    updated_at = NOW();

-- 3. Verifica che tutte le sezioni principali esistano
INSERT INTO public.homepage_sections (section_key, section_name, order_index, active) VALUES
    ('hero', 'Hero Section', 0, true),
    ('courses', 'Corsi e Abbonamenti', 1, true),
    ('tornei', 'Tornei e Competizioni', 2, true),
    ('staff', 'Il Nostro Staff', 3, true),
    ('news', 'News e Aggiornamenti', 4, true),
    ('social', 'Social Feed', 5, true),
    ('cta', 'Call to Action', 6, true)
ON CONFLICT (section_key) DO NOTHING;

-- 4. Mostra tutte le sezioni attive
SELECT 
    section_key,
    section_name,
    order_index,
    active,
    created_at
FROM public.homepage_sections
ORDER BY order_index;

-- ============================================================
-- VERIFICA
-- ============================================================
-- Dopo aver eseguito questo script:
-- 1. Ricarica la homepage
-- 2. Dovresti vedere la sezione "Tornei e Competizioni"
-- 3. Se non appare, controlla che ci siano tornei attivi nel database
-- ============================================================
