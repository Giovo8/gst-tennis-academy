-- Migration: Email Campaigns Table
-- Date: 2026-01-10

-- Create email_campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  template VARCHAR(100),

  recipient_type VARCHAR(50) NOT NULL, -- 'all', 'role', 'custom'
  recipient_role VARCHAR(50),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',

  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent', -- 'pending', 'sent', 'failed'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT email_campaigns_status_check CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT email_campaigns_recipient_type_check CHECK (recipient_type IN ('all', 'role', 'custom'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_by ON email_campaigns(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON email_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin/gestore can view all campaigns
CREATE POLICY "email_campaigns_select_admin" ON email_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Admin/gestore can insert campaigns
CREATE POLICY "email_campaigns_insert_admin" ON email_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Admin/gestore can update campaigns
CREATE POLICY "email_campaigns_update_admin" ON email_campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Admin/gestore can delete campaigns
CREATE POLICY "email_campaigns_delete_admin" ON email_campaigns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_email_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER trigger_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_email_campaigns_updated_at();

-- Add comment
COMMENT ON TABLE email_campaigns IS 'Campagne email marketing inviate agli utenti GST Tennis Academy';
