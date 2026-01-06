-- Add missing columns to video_lessons table to match API expectations
-- This ensures compatibility with existing API endpoints

ALTER TABLE public.video_lessons 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duration_minutes INT,
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'tutti',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS watched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS watch_count INT NOT NULL DEFAULT 0;

-- Note: If you have a coach_id column and want to copy it to created_by, uncomment below:
-- UPDATE public.video_lessons 
-- SET created_by = coach_id 
-- WHERE created_by IS NULL AND coach_id IS NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS video_lessons_created_by_idx ON public.video_lessons(created_by);
CREATE INDEX IF NOT EXISTS video_lessons_assigned_to_idx ON public.video_lessons(assigned_to);
CREATE INDEX IF NOT EXISTS video_lessons_is_active_idx ON public.video_lessons(is_active);

COMMENT ON COLUMN public.video_lessons.created_by IS 'User (coach) who created the video lesson';
COMMENT ON COLUMN public.video_lessons.assigned_to IS 'User (athlete) to whom the video is assigned';
COMMENT ON COLUMN public.video_lessons.level IS 'Skill level: principiante, intermedio, avanzato, tutti';
COMMENT ON COLUMN public.video_lessons.is_active IS 'Whether the video is currently active/visible';
