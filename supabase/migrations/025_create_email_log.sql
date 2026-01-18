-- Migration: Email Log Table
-- Date: 2026-01-10
-- Purpose: Create email_log table for tracking all emails sent from the platform

-- Create email_log table
CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'resend',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin/gestore can view all email logs
DROP POLICY IF EXISTS "email_log_select_admin" ON public.email_log;
CREATE POLICY "email_log_select_admin" ON public.email_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- System can insert email logs
DROP POLICY IF EXISTS "email_log_insert_all" ON public.email_log;
CREATE POLICY "email_log_insert_all" ON public.email_log
  FOR INSERT WITH CHECK (true);

-- System can update email logs (for status updates)
DROP POLICY IF EXISTS "email_log_update_all" ON public.email_log;
CREATE POLICY "email_log_update_all" ON public.email_log
  FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_log_recipient_email ON public.email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_template_name ON public.email_log(template_name);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON public.email_log(created_at DESC);

-- Add comment
COMMENT ON TABLE public.email_log IS 'Log di tutte le email inviate dalla piattaforma GST Tennis Academy';
