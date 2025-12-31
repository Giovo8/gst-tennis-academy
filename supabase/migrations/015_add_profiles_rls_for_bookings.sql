-- Migration 015: Add RLS policies for booking system profile visibility
-- This allows athletes to see coach profiles and coaches to see athlete profiles

-- Allow all authenticated users to view maestro profiles
CREATE POLICY "Users can view coach profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND role = 'maestro'
  );

-- Allow maestros to view athlete profiles (needed for lesson management)
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

SELECT 'Migration 015: RLS policies for booking profile visibility added' AS status;
