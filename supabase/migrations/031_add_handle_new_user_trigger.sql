-- Migration: Add handle_new_user trigger for automatic profile creation
-- Issue: When users register via invite code, the profile is not being created automatically
-- This causes "Cannot coerce the result to a single JSON object" error on login

-- Step 1: Create the function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'atleta')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role);

  RETURN NEW;
END;
$$;

-- Step 2: Drop the trigger if it exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Fix any existing users in auth.users that don't have profiles
-- This will create profiles for users who registered before this trigger existed
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'atleta')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
