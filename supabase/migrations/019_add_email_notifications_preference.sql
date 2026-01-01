-- Migration: Add email notifications preferences to profiles
-- This migration adds the ability for users to control email notification preferences

-- Add email_notifications_enabled column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS profiles_email_notifications_idx 
ON public.profiles (email_notifications_enabled);

-- Update existing users to have email notifications enabled by default
UPDATE public.profiles 
SET email_notifications_enabled = TRUE 
WHERE email_notifications_enabled IS NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.email_notifications_enabled IS 
'Whether user wants to receive email notifications for important events';
