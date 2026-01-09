-- Add RLS policy to allow users to view maestro profiles
-- This is needed for booking system where athletes need to see available coaches

-- Policy: Allow all authenticated users to view profiles with role 'maestro'
CREATE POLICY "Users can view coach profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND role = 'maestro'
  );

-- Policy: Allow maestros to view athlete profiles (needed for lesson management)
CREATE POLICY "Coaches can view athlete profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('maestro', 'admin', 'gestore')
    )
    AND role = 'atleta'
  );

SELECT 'RLS policies for coach and athlete profile visibility added successfully' AS result;
