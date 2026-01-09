-- Create email_campaigns table to track sent emails
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  template TEXT,
  recipient_type TEXT NOT NULL, -- 'all', 'role', 'custom'
  recipient_role TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  recipient_emails TEXT[], -- Array of email addresses
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin and gestore can view all campaigns
CREATE POLICY "Admin and gestore can view email campaigns"
  ON email_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Admin and gestore can insert campaigns
CREATE POLICY "Admin and gestore can insert email campaigns"
  ON email_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON email_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_by ON email_campaigns(sent_by);
