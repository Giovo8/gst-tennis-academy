-- ============================================
-- VIDEO LESSONS MODULE
-- ============================================
-- Tabella per gestire video lezioni assegnate agli utenti

-- Tabella video_lessons
CREATE TABLE IF NOT EXISTS public.video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_minutes INT,
  
  -- Chi ha creato e chi è assegnato
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users ON DELETE CASCADE,
  
  -- Categorizzazione
  category TEXT DEFAULT 'generale', -- 'tecnica', 'tattica', 'fitness', 'mentale', 'generale'
  level TEXT DEFAULT 'tutti', -- 'principiante', 'intermedio', 'avanzato', 'tutti'
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Tracking visualizzazione
  watched_at TIMESTAMPTZ,
  watch_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS video_lessons_assigned_to_idx ON public.video_lessons (assigned_to);
CREATE INDEX IF NOT EXISTS video_lessons_created_by_idx ON public.video_lessons (created_by);
CREATE INDEX IF NOT EXISTS video_lessons_category_idx ON public.video_lessons (category);
CREATE INDEX IF NOT EXISTS video_lessons_active_idx ON public.video_lessons (is_active);

-- RLS
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono vedere solo i video assegnati a loro
CREATE POLICY "Users can view their assigned videos"
  ON public.video_lessons
  FOR SELECT
  USING (
    auth.uid() = assigned_to 
    OR auth.uid() = created_by
    OR public.get_my_role() IN ('admin', 'gestore', 'maestro')
  );

-- Solo admin, gestore e maestro possono creare video
CREATE POLICY "Staff can create videos"
  ON public.video_lessons
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

-- Solo admin, gestore e il creatore possono modificare
CREATE POLICY "Staff can update videos"
  ON public.video_lessons
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR public.get_my_role() IN ('admin', 'gestore')
  );

-- Gli utenti possono aggiornare il watch_count dei propri video
CREATE POLICY "Users can update watch status"
  ON public.video_lessons
  FOR UPDATE
  USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

-- Solo admin e gestore possono eliminare
CREATE POLICY "Admin can delete videos"
  ON public.video_lessons
  FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- Trigger per updated_at
CREATE TRIGGER update_video_lessons_updated_at
  BEFORE UPDATE ON public.video_lessons
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();
