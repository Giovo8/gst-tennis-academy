-- Migration 067: Backfill profiles for auth users that are missing them
-- This fixes users who registered but whose profile was never created
-- (e.g. due to the handle_new_user trigger failing silently)

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    au.email
  ),
  COALESCE(
    (au.raw_user_meta_data->>'role')::user_role,
    'atleta'
  )
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
