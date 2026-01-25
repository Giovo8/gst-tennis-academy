-- Migration: Fix profiles INSERT RLS policy
-- Issue: Users cannot register because there's no INSERT policy allowing users to create their own profile
-- The only INSERT policy requires admin/gestore role, but new users don't have a profile yet

-- Add policy to allow users to INSERT their own profile (where auth.uid() = id)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
