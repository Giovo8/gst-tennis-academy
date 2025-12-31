-- FIX: Remove problematic RLS policies causing infinite recursion and add safe ones

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view athlete profiles" ON public.profiles;

-- Step 2: Create a function to get current user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 3: Recreate policies using the safe function
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'gestore')
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
  );

CREATE POLICY "Admins can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('admin', 'gestore')
  );

CREATE POLICY "Coaches can view athlete profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND public.get_my_role() IN ('maestro', 'admin', 'gestore')
    AND role = 'atleta'
  );

SELECT 'Fixed infinite recursion in profiles RLS policies' AS result;
