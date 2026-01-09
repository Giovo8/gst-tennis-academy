-- ============================================
-- FIX STAFF TABLE RLS POLICIES
-- ============================================

-- Abilita RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti
DROP POLICY IF EXISTS "Anyone can view active staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can view all staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can delete staff" ON public.staff;

-- Policy per visualizzare staff attivo (pubblico)
CREATE POLICY "Anyone can view active staff"
  ON public.staff FOR SELECT 
  USING (active = true);

-- Policy per admin/gestore - visualizzare tutto
CREATE POLICY "Admin can view all staff"
  ON public.staff FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policy per admin/gestore - inserire
CREATE POLICY "Admin can insert staff"
  ON public.staff FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policy per admin/gestore - aggiornare
CREATE POLICY "Admin can update staff"
  ON public.staff FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Policy per admin/gestore - eliminare
CREATE POLICY "Admin can delete staff"
  ON public.staff FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );
