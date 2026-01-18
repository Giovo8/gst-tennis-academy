-- Migration: Create video_assignments table for multiple user assignments
-- Description: Allows assigning a video to multiple users with a many-to-many relationship

-- Drop table if exists to recreate it correctly
DROP TABLE IF EXISTS public.video_assignments CASCADE;

-- Create video_assignments table
CREATE TABLE public.video_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_assignments_video_id ON public.video_assignments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_assignments_user_id ON public.video_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_assignments_assigned_by ON public.video_assignments(assigned_by);

-- Enable RLS
ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins and gestori can manage all assignments
CREATE POLICY "Admins and gestori can view all video assignments"
  ON public.video_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "Admins and gestori can insert video assignments"
  ON public.video_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "Admins and gestori can delete video assignments"
  ON public.video_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Users can view their own assignments
CREATE POLICY "Users can view their own video assignments"
  ON public.video_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- Comment on table
COMMENT ON TABLE public.video_assignments IS 'Stores the many-to-many relationship between video lessons and users';
