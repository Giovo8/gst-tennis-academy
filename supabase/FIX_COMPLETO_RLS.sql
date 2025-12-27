-- ============================================================
-- FIX COMPLETO RLS - PROFILES + BOOKINGS
-- Esegui questo script UNICO per risolvere tutti i problemi RLS
-- ============================================================

-- PARTE 1: FIX PROFILES RLS
-- ============================================================

-- Crea/Ricrea funzione SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

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

-- Nuove policy per profiles usando get_my_role()
CREATE POLICY "view_profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR auth.uid() = id
  );

CREATE POLICY "update_profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR auth.uid() = id
  );

CREATE POLICY "insert_profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('admin', 'gestore')
  );

CREATE POLICY "delete_profiles"
  ON public.profiles
  FOR DELETE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
  );

-- PARTE 2: FIX BOOKINGS RLS
-- ============================================================

-- Drop tutte le policy esistenti su bookings
DROP POLICY IF EXISTS "Users can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can insert any booking" ON public.bookings;
DROP POLICY IF EXISTS "Maestro can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "view_bookings" ON public.bookings;
DROP POLICY IF EXISTS "insert_bookings" ON public.bookings;
DROP POLICY IF EXISTS "update_bookings" ON public.bookings;
DROP POLICY IF EXISTS "delete_bookings" ON public.bookings;

-- Nuove policy per bookings usando get_my_role()
CREATE POLICY "view_bookings"
  ON public.bookings
  FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'gestore', 'maestro')
    OR auth.uid() = user_id
    OR auth.uid() = coach_id
  );

CREATE POLICY "insert_bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('admin', 'gestore')
    OR auth.uid() = user_id
  );

CREATE POLICY "update_bookings"
  ON public.bookings
  FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR auth.uid() = user_id
    OR auth.uid() = coach_id
  );

CREATE POLICY "delete_bookings"
  ON public.bookings
  FOR DELETE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR auth.uid() = user_id
  );

-- Verifica che RLS sia abilitato su entrambe le tabelle
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- PARTE 3: FIX OVERLAP CONSTRAINT
-- ============================================================

-- Rimuovi vecchia constraint
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Crea nuova constraint che permette sovrapposizioni di pending
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  court WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (manager_confirmed = true);

-- ============================================================
-- FINE SCRIPT - ORA RICARICA LA PAGINA CON CTRL+F5
-- ============================================================
