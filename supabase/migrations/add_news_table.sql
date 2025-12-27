-- Tabella per le news dell'academy
CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  image_url text,
  date timestamptz NOT NULL DEFAULT now(),
  published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Policy: Tutti possono leggere le news pubblicate
CREATE POLICY "Anyone can view published news"
  ON public.news
  FOR SELECT
  USING (published = true);

-- Policy: Admin e gestore possono vedere tutte le news
CREATE POLICY "Admin can view all news"
  ON public.news
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policy: Solo admin e gestore possono inserire news
CREATE POLICY "Admin can insert news"
  ON public.news
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policy: Solo admin e gestore possono aggiornare news
CREATE POLICY "Admin can update news"
  ON public.news
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policy: Solo admin e gestore possono eliminare news
CREATE POLICY "Admin can delete news"
  ON public.news
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Indici per performance
CREATE INDEX IF NOT EXISTS news_published_date_idx ON public.news(published, date DESC);
CREATE INDEX IF NOT EXISTS news_created_by_idx ON public.news(created_by);
