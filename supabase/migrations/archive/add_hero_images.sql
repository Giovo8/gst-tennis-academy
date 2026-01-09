-- Crea tabella per le immagini della hero section (carousel)
CREATE TABLE IF NOT EXISTS public.hero_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  alt_text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inserisci alcune immagini di default
INSERT INTO public.hero_images (image_url, alt_text, order_index, active) VALUES
  ('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2000', 'Campo da tennis professionale', 0, true),
  ('https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?q=80&w=2000', 'Giocatore di tennis in azione', 1, true),
  ('https://images.unsplash.com/photo-1595435742656-5272d0f0c9d8?q=80&w=2000', 'Lezione di tennis', 2, true)
ON CONFLICT DO NOTHING;

-- Abilita RLS
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- Policy: Tutti possono leggere le immagini attive
CREATE POLICY "Anyone can view active hero images"
  ON public.hero_images FOR SELECT USING (active = true);

-- Policy: Admin può vedere tutte le immagini
CREATE POLICY "Admin can view all hero images"
  ON public.hero_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Policy: Solo admin può inserire
CREATE POLICY "Admin can insert hero images"
  ON public.hero_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Policy: Solo admin può aggiornare
CREATE POLICY "Admin can update hero images"
  ON public.hero_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Policy: Solo admin può eliminare
CREATE POLICY "Admin can delete hero images"
  ON public.hero_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestore')
  ));

-- Indici
CREATE INDEX IF NOT EXISTS hero_images_active_idx ON public.hero_images(active);
CREATE INDEX IF NOT EXISTS hero_images_order_idx ON public.hero_images(order_index);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_hero_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hero_images_updated_at
  BEFORE UPDATE ON public.hero_images
  FOR EACH ROW
  EXECUTE FUNCTION update_hero_images_updated_at();
