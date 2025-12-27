-- ============================================
-- MIGRATION COMPLETA GST TENNIS ACADEMY
-- Questo script può essere eseguito più volte senza problemi
-- ============================================

-- ============================================
-- 1. TABELLA STAFF
-- ============================================
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL,
  bio text,
  image_url text,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti se ci sono
DROP POLICY IF EXISTS "Anyone can view active staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can view all staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can delete staff" ON public.staff;

-- Ricrea policy
CREATE POLICY "Anyone can view active staff"
  ON public.staff FOR SELECT USING (active = true);

CREATE POLICY "Admin can view all staff"
  ON public.staff FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can insert staff"
  ON public.staff FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can update staff"
  ON public.staff FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can delete staff"
  ON public.staff FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE INDEX IF NOT EXISTS staff_active_order_idx ON public.staff(active, order_index);

-- ============================================
-- 2. TABELLA HERO IMAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.hero_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  alt_text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti
DROP POLICY IF EXISTS "Anyone can view active hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Admin can view all hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Admin can insert hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Admin can update hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Admin can delete hero images" ON public.hero_images;

-- Ricrea policy
CREATE POLICY "Anyone can view active hero images"
  ON public.hero_images FOR SELECT USING (active = true);

CREATE POLICY "Admin can view all hero images"
  ON public.hero_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can insert hero images"
  ON public.hero_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can update hero images"
  ON public.hero_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can delete hero images"
  ON public.hero_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE INDEX IF NOT EXISTS hero_images_active_order_idx ON public.hero_images(active, order_index);

-- ============================================
-- 3. TABELLA SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  billing text NOT NULL,
  benefits text[] NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti
DROP POLICY IF EXISTS "Anyone can view active subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can delete subscriptions" ON public.subscriptions;

-- Ricrea policy
CREATE POLICY "Anyone can view active subscriptions"
  ON public.subscriptions FOR SELECT USING (active = true);

CREATE POLICY "Admin can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE INDEX IF NOT EXISTS subscriptions_active_order_idx ON public.subscriptions(active, order_index);

-- ============================================
-- 4. TABELLA PROGRAMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  focus text NOT NULL,
  points text[] NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti
DROP POLICY IF EXISTS "Anyone can view active programs" ON public.programs;
DROP POLICY IF EXISTS "Admin can view all programs" ON public.programs;
DROP POLICY IF EXISTS "Admin can insert programs" ON public.programs;
DROP POLICY IF EXISTS "Admin can update programs" ON public.programs;
DROP POLICY IF EXISTS "Admin can delete programs" ON public.programs;

-- Ricrea policy
CREATE POLICY "Anyone can view active programs"
  ON public.programs FOR SELECT USING (active = true);

CREATE POLICY "Admin can view all programs"
  ON public.programs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can insert programs"
  ON public.programs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can update programs"
  ON public.programs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE POLICY "Admin can delete programs"
  ON public.programs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE INDEX IF NOT EXISTS programs_active_order_idx ON public.programs(active, order_index);

-- ============================================
-- 5. TABELLA HOMEPAGE SECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  section_name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inserisci dati di default
INSERT INTO public.homepage_sections (section_key, section_name, order_index, active) VALUES
  ('hero', 'Hero', 0, true),
  ('subscriptions', 'Abbonamenti', 1, true),
  ('programs', 'Programmi', 2, true),
  ('staff', 'Staff', 3, true),
  ('news', 'News', 4, true),
  ('social', 'Social Feed', 5, true),
  ('cta', 'Call to Action', 6, true)
ON CONFLICT (section_key) DO NOTHING;

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti
DROP POLICY IF EXISTS "Anyone can view homepage sections" ON public.homepage_sections;
DROP POLICY IF EXISTS "Admin can update homepage sections" ON public.homepage_sections;

-- Ricrea policy
CREATE POLICY "Anyone can view homepage sections"
  ON public.homepage_sections FOR SELECT USING (true);

CREATE POLICY "Admin can update homepage sections"
  ON public.homepage_sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

CREATE INDEX IF NOT EXISTS homepage_sections_active_order_idx ON public.homepage_sections(active, order_index);

-- ============================================
-- MIGRATION COMPLETATA!
-- ============================================
