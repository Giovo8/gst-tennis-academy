-- Migration: Fix handle_new_user trigger
-- Make the trigger completely safe: catch ALL exceptions so it never blocks auth.createUser

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'atleta';
  v_full_name text;
BEGIN
  -- Safely resolve role
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'atleta')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'atleta';
  END;

  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  -- Remove any orphan profile that has this email but a different id
  DELETE FROM public.profiles WHERE email = NEW.email AND id != NEW.id;

  -- Insert or update profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    role       = COALESCE(EXCLUDED.role, profiles.role);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Never block user creation due to profile errors
  RETURN NEW;
END;
$$;
