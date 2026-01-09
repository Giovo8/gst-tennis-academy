-- Add status column to recruitment_applications table
-- This allows admins to track application status (pending, reviewed, accepted, rejected)

-- Create status enum type
DO $$ BEGIN
  CREATE TYPE recruitment_status AS ENUM ('pending', 'reviewed', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add status column with default value 'pending'
ALTER TABLE public.recruitment_applications
ADD COLUMN IF NOT EXISTS status recruitment_status NOT NULL DEFAULT 'pending';

-- Create index for efficient filtering by status
CREATE INDEX IF NOT EXISTS recruitment_applications_status_idx
ON public.recruitment_applications (status);

-- Update existing records to have 'pending' status (if any exist without status)
UPDATE public.recruitment_applications
SET status = 'pending'
WHERE status IS NULL;

-- Add updated_at column for tracking status changes
ALTER TABLE public.recruitment_applications
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_recruitment_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on status changes
DROP TRIGGER IF EXISTS update_recruitment_applications_updated_at_trigger
ON public.recruitment_applications;

CREATE TRIGGER update_recruitment_applications_updated_at_trigger
BEFORE UPDATE ON public.recruitment_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_recruitment_applications_updated_at();

-- Grant update permissions to admin/gestore for status updates
CREATE POLICY IF NOT EXISTS "Admin/Gestore can update application status"
  ON public.recruitment_applications
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'))
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

-- Grant delete permissions to admin/gestore
CREATE POLICY IF NOT EXISTS "Admin/Gestore can delete applications"
  ON public.recruitment_applications
  FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));
