-- ============================================================
-- FIX LOGIN SEMPLICE - Permetti a tutti di leggere il proprio profilo
-- ============================================================
-- Questo script rimuove TUTTE le policy e ne crea di nuove molto semplici
-- per permettere il login senza problemi
-- ============================================================

-- 1. DROP di TUTTE le policy esistenti su profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- 2. Abilita RLS sulla tabella profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Crea policy SEMPLICISSIME senza dipendenze circolari

-- Policy 1: TUTTI gli utenti autenticati possono leggere il proprio profilo
CREATE POLICY "allow_read_own_profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: TUTTI gli utenti autenticati possono aggiornare il proprio profilo
CREATE POLICY "allow_update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Admin possono vedere TUTTI i profili
CREATE POLICY "allow_admin_read_all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'gestore')
  );

-- Policy 4: Admin possono modificare TUTTI i profili
CREATE POLICY "allow_admin_update_all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'gestore')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'gestore')
  );

-- Policy 5: Admin possono inserire nuovi profili
CREATE POLICY "allow_admin_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'gestore')
  );

-- Policy 6: Admin possono eliminare profili
CREATE POLICY "allow_admin_delete"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'gestore')
  );

-- ============================================================
-- VERIFICA
-- ============================================================
-- Dopo aver eseguito questo script, verifica:
-- 1. SELECT * FROM pg_policies WHERE tablename = 'profiles';
-- 2. Prova a fare login con admin@gst.it
-- ============================================================
