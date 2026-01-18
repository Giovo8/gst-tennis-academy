-- CREATE RECRUITMENT APPLICATIONS TABLE
-- Execute this in Supabase SQL Editor
-- This script will create the recruitment_applications table from scratch

-- Step 1: Create recruitment_role enum
DO $$ BEGIN
  CREATE TYPE recruitment_role AS ENUM ('maestro', 'preparatore');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create recruitment_status enum
DO $$ BEGIN
  CREATE TYPE recruitment_status AS ENUM ('pending', 'reviewed', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Create the recruitment_applications table
CREATE TABLE IF NOT EXISTS public.recruitment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  role recruitment_role NOT NULL,
  message text,
  cv_url text,
  status recruitment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Enable Row Level Security
ALTER TABLE public.recruitment_applications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS recruitment_applications_email_idx
ON public.recruitment_applications (email);

CREATE INDEX IF NOT EXISTS recruitment_applications_status_idx
ON public.recruitment_applications (status);

CREATE INDEX IF NOT EXISTS recruitment_applications_role_idx
ON public.recruitment_applications (role);

CREATE INDEX IF NOT EXISTS recruitment_applications_created_at_idx
ON public.recruitment_applications (created_at DESC);

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

-- Step 8: Create RLS Policies

-- Policy 1: Anyone can insert (submit application)
DROP POLICY IF EXISTS "Anyone can submit application" ON public.recruitment_applications;
CREATE POLICY "Anyone can submit application"
  ON public.recruitment_applications
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Admin/Gestore can view all applications
DROP POLICY IF EXISTS "Admin/Gestore can view applications" ON public.recruitment_applications;
CREATE POLICY "Admin/Gestore can view applications"
  ON public.recruitment_applications
  FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- Policy 3: Admin/Gestore can update applications (change status)
DROP POLICY IF EXISTS "Admin/Gestore can update applications" ON public.recruitment_applications;
CREATE POLICY "Admin/Gestore can update applications"
  ON public.recruitment_applications
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'))
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

-- Policy 4: Admin/Gestore can delete applications
DROP POLICY IF EXISTS "Admin/Gestore can delete applications" ON public.recruitment_applications;
CREATE POLICY "Admin/Gestore can delete applications"
  ON public.recruitment_applications
  FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- Step 9: Verification - Show current table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recruitment_applications'
ORDER BY ordinal_position;

-- Step 10: Show all policies on the table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'recruitment_applications';
