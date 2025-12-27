-- Aggiunge campi per personalizzare i contenuti della hero section
-- Esegui questo script DOPO aver eseguito complete_migration.sql

-- Crea tabella per contenuti hero (testi, badge, pulsanti, stats)
CREATE TABLE IF NOT EXISTS public.hero_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text text NOT NULL DEFAULT 'Cresci nel tuo tennis',
  title text NOT NULL DEFAULT 'Allenamento di alto livello, metodo scientifico e una community che spinge al massimo.',
  title_highlight text NOT NULL DEFAULT 'metodo scientifico',
  subtitle text NOT NULL DEFAULT 'Programmi personalizzati per junior, agonisti e adulti. Video analysis, preparazione atletica, match play e coaching mentale curati da maestri certificati FITP.',
  primary_button_text text NOT NULL DEFAULT 'Prenota una prova',
  primary_button_link text NOT NULL DEFAULT '/bookings',
  secondary_button_text text NOT NULL DEFAULT 'Scopri i programmi',
  secondary_button_link text NOT NULL DEFAULT '#programmi',
  stat1_value text NOT NULL DEFAULT '250+',
  stat1_label text NOT NULL DEFAULT 'Atleti attivi',
  stat2_value text NOT NULL DEFAULT '180',
  stat2_label text NOT NULL DEFAULT 'Tornei vinti',
  stat3_value text NOT NULL DEFAULT '8',
  stat3_label text NOT NULL DEFAULT 'Campi disponibili',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inserisci contenuto di default
INSERT INTO public.hero_content (
  badge_text, title, title_highlight, subtitle,
  primary_button_text, primary_button_link,
  secondary_button_text, secondary_button_link,
  stat1_value, stat1_label,
  stat2_value, stat2_label,
  stat3_value, stat3_label,
  active
) VALUES (
  'Cresci nel tuo tennis',
  'Allenamento di alto livello, metodo scientifico e una community che spinge al massimo.',
  'metodo scientifico',
  'Programmi personalizzati per junior, agonisti e adulti. Video analysis, preparazione atletica, match play e coaching mentale curati da maestri certificati FITP.',
  'Prenota una prova',
  '/bookings',
  'Scopri i programmi',
  '#programmi',
  '250+',
  'Atleti attivi',
  '180',
  'Tornei vinti',
  '8',
  'Campi disponibili',
  true
)
ON CONFLICT DO NOTHING;

-- Abilita RLS
ALTER TABLE public.hero_content ENABLE ROW LEVEL SECURITY;

-- Policy: Tutti possono leggere il contenuto attivo
CREATE POLICY "Anyone can view active hero content"
  ON public.hero_content FOR SELECT USING (active = true);

-- Policy: Admin può vedere tutto
CREATE POLICY "Admin can view all hero content"
  ON public.hero_content FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Policy: Solo admin può inserire
CREATE POLICY "Admin can insert hero content"
  ON public.hero_content FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Policy: Solo admin può aggiornare
CREATE POLICY "Admin can update hero content"
  ON public.hero_content FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Policy: Solo admin può eliminare
CREATE POLICY "Admin can delete hero content"
  ON public.hero_content FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Indici
CREATE INDEX IF NOT EXISTS hero_content_active_idx ON public.hero_content(active);
