-- ============================================================
-- FIX LOGIN - Risolve il problema "Profilo non configurato"
-- ============================================================
-- Il problema è causato da una dipendenza circolare nelle policy RLS:
-- - Il login richiede di leggere il profilo per ottenere il ruolo
-- - Ma get_my_role() cerca di leggere il profilo (che non può essere letto senza ruolo)
-- 
-- SOLUZIONE: Permettere a tutti gli utenti autenticati di leggere 
-- il proprio profilo usando direttamente auth.uid()
-- ============================================================

-- Drop tutte le policy esistenti su profiles
DROP POLICY IF EXISTS "Users can view their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "delete_profiles" ON public.profiles;

-- POLICY 1: Ogni utente autenticato può vedere il proprio profilo
-- Questa policy usa direttamente auth.uid() senza dipendere da get_my_role()
CREATE POLICY "authenticated_users_view_own_profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- POLICY 2: Admin e gestori possono vedere tutti i profili
-- Questa policy può usare get_my_role() perché viene valutata DOPO la policy 1
CREATE POLICY "admins_view_all_profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'gestore')
    )
  );

-- POLICY 3: Ogni utente può aggiornare il proprio profilo
CREATE POLICY "users_update_own_profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- POLICY 4: Admin e gestori possono aggiornare tutti i profili
CREATE POLICY "admins_update_all_profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'gestore')
    )
  );

-- POLICY 5: Admin e gestori possono inserire nuovi profili
CREATE POLICY "admins_insert_profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'gestore')
    )
  );

-- POLICY 6: Admin e gestori possono eliminare profili
CREATE POLICY "admins_delete_profiles"
  ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'gestore')
    )
  );

-- Verifica che la tabella profiles abbia RLS abilitato
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICA: Controlla se l'utente admin@gst.it esiste
-- ============================================================
-- Esegui questa query separatamente per verificare:
-- SELECT id, email, full_name, role FROM public.profiles WHERE email = 'admin@gst.it';
-- 
-- Se non esiste, devi prima crearlo in Supabase Auth e poi nella tabella profiles
-- ============================================================
