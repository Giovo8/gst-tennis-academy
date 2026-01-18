-- COMPLETE FIX FOR RECRUITMENT APPLICATIONS
-- Execute this in Supabase SQL Editor
-- This script will:
-- 1. Add status column with proper enum
-- 2. Fix the role enum to use 'preparatore' instead of 'personale'
-- 3. Add updated_at column with auto-update trigger
-- 4. Add proper RLS policies for admin/gestore

-- Step 1: Create recruitment_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE recruitment_status AS ENUM ('pending', 'reviewed', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'recruitment_applications'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.recruitment_applications
    ADD COLUMN status recruitment_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Step 3: Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'recruitment_applications'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.recruitment_applications
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Step 4: Fix the recruitment_role enum
-- This is a complex operation because we need to change the enum values
DO $$
BEGIN
  -- Convert role column to text temporarily
  ALTER TABLE public.recruitment_applications
  ALTER COLUMN role TYPE text;

  -- Update any 'personale' values to 'preparatore'
  UPDATE public.recruitment_applications
  SET role = 'preparatore'
  WHERE role = 'personale';

  -- Drop the old enum type
  DROP TYPE IF EXISTS recruitment_role CASCADE;

  -- Create new enum type with correct values
  CREATE TYPE recruitment_role AS ENUM ('maestro', 'preparatore');

  -- Convert the role column back to the enum type
  ALTER TABLE public.recruitment_applications
  ALTER COLUMN role TYPE recruitment_role USING role::recruitment_role;
END $$;

-- Step 5: Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS recruitment_applications_status_idx
ON public.recruitment_applications (status);

CREATE INDEX IF NOT EXISTS recruitment_applications_role_idx
ON public.recruitment_applications (role);

-- Step 6: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_recruitment_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_recruitment_applications_updated_at_trigger
ON public.recruitment_applications;

CREATE TRIGGER update_recruitment_applications_updated_at_trigger
BEFORE UPDATE ON public.recruitment_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_recruitment_applications_updated_at();

-- Step 8: Drop old policies if they exist
DROP POLICY IF EXISTS "Admin/Gestore can update application status" ON public.recruitment_applications;
DROP POLICY IF EXISTS "Admin/Gestore can delete applications" ON public.recruitment_applications;

-- Step 9: Create UPDATE policy for admin/gestore
CREATE POLICY "Admin/Gestore can update application status"
  ON public.recruitment_applications
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'))
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

-- Step 10: Create DELETE policy for admin/gestore
CREATE POLICY "Admin/Gestore can delete applications"
  ON public.recruitment_applications
  FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- Verification: Show current table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recruitment_applications'
ORDER BY ordinal_position;
