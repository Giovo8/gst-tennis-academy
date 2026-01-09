-- Migration: Email System for GST Tennis Academy
-- Date: 2025-12-28

-- Step 1: Create email_logs table for tracking all sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  subject VARCHAR(500) NOT NULL,
  template_name VARCHAR(100) NOT NULL, -- booking_confirmation, booking_reminder, etc.
  template_data JSONB DEFAULT '{}'::jsonb,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  provider VARCHAR(50) DEFAULT 'resend', -- resend, sendgrid, etc.
  provider_message_id VARCHAR(255),
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  metadata JSONB DEFAULT '{}'::jsonb, -- additional tracking data
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT email_logs_status_check CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'))
);

-- Step 2: Create email_templates table for managing templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL, -- booking_confirmation, tournament_registration, etc.
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  subject_template VARCHAR(500) NOT NULL, -- with placeholders: "Conferma Prenotazione - {{court_name}}"
  html_template TEXT NOT NULL, -- HTML email body
  text_template TEXT, -- Plain text fallback
  
  category VARCHAR(50), -- transactional, marketing, notification
  is_active BOOLEAN DEFAULT true,
  
  variables JSONB DEFAULT '[]'::jsonb, -- ["court_name", "booking_date", "user_name"]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT email_templates_category_check CHECK (category IN ('transactional', 'marketing', 'notification', 'system'))
);

-- Step 3: Create email_settings table for configuration
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create email_unsubscribes table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  
  unsubscribe_from VARCHAR(50) DEFAULT 'all', -- all, marketing, notifications
  reason TEXT,
  
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, unsubscribe_from),
  UNIQUE(email, unsubscribe_from)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_name);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_id ON email_unsubscribes(user_id);

-- Step 6: Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for email_logs
-- Admin/gestore can view all logs
CREATE POLICY "email_logs_select_admin" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Users can view their own email logs
CREATE POLICY "email_logs_select_own" ON email_logs
  FOR SELECT USING (
    recipient_user_id = auth.uid()
  );

-- Only admin/gestore can insert logs (via API)
CREATE POLICY "email_logs_insert_admin" ON email_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Only admin/gestore can update logs
CREATE POLICY "email_logs_update_admin" ON email_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 8: RLS Policies for email_templates
-- Admin/gestore can view all templates
CREATE POLICY "email_templates_select_admin" ON email_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Admin/gestore can manage templates
CREATE POLICY "email_templates_insert_admin" ON email_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "email_templates_update_admin" ON email_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "email_templates_delete_admin" ON email_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 9: RLS Policies for email_settings
-- Only admin can view/manage settings
CREATE POLICY "email_settings_select_admin" ON email_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

CREATE POLICY "email_settings_all_admin" ON email_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Step 10: RLS Policies for email_unsubscribes
-- Users can view their own unsubscribes
CREATE POLICY "email_unsubscribes_select_own" ON email_unsubscribes
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Users can manage their own unsubscribes
CREATE POLICY "email_unsubscribes_insert_own" ON email_unsubscribes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "email_unsubscribes_delete_own" ON email_unsubscribes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Admin can view all unsubscribes
CREATE POLICY "email_unsubscribes_select_admin" ON email_unsubscribes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 11: Create function to check if user is unsubscribed
CREATE OR REPLACE FUNCTION is_user_unsubscribed(
  check_email VARCHAR(255),
  email_category VARCHAR(50) DEFAULT 'all'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has unsubscribed from 'all' or specific category
  RETURN EXISTS (
    SELECT 1 FROM email_unsubscribes
    WHERE email = check_email
    AND (unsubscribe_from = 'all' OR unsubscribe_from = email_category)
  );
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create function to get email stats
CREATE OR REPLACE FUNCTION get_email_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) AS total_sent,
    COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) AS total_delivered,
    COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
    COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) AS total_opened,
    COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
    ROUND(
      (COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked'))::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked', 'failed')), 0)) * 100, 
      2
    ) AS delivery_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE status IN ('opened', 'clicked'))::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')), 0)) * 100, 
      2
    ) AS open_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'clicked')::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')), 0)) * 100, 
      2
    ) AS click_rate
  FROM email_logs
  WHERE created_at >= start_date AND created_at <= end_date;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER trigger_email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

-- Step 14: Insert default email settings
INSERT INTO email_settings (setting_key, setting_value, description) VALUES
  ('sender_name', '"GST Tennis Academy"', 'Nome mittente predefinito'),
  ('sender_email', '"info@gst-tennis.it"', 'Email mittente predefinita'),
  ('reply_to_email', '"info@gst-tennis.it"', 'Email per risposte'),
  ('enable_tracking', 'true', 'Abilita tracking aperture/click'),
  ('retry_failed_emails', 'true', 'Riprova invio email fallite'),
  ('max_retry_count', '3', 'Numero massimo tentativi'),
  ('daily_email_limit', '1000', 'Limite email giornaliero')
ON CONFLICT (setting_key) DO NOTHING;

-- Step 15: Add comments for documentation
COMMENT ON TABLE email_logs IS 'Log di tutte le email inviate dal sistema GST Tennis Academy';
COMMENT ON TABLE email_templates IS 'Template HTML email riutilizzabili con variabili dinamiche';
COMMENT ON TABLE email_settings IS 'Configurazioni globali sistema email';
COMMENT ON TABLE email_unsubscribes IS 'Gestione disiscrizioni utenti da email marketing/notifiche';

COMMENT ON COLUMN email_logs.template_data IS 'Dati JSON utilizzati per popolare il template: {"user_name": "Mario Rossi", "booking_date": "2025-12-30"}';
COMMENT ON COLUMN email_templates.variables IS 'Array variabili disponibili nel template: ["user_name", "court_name", "booking_time"]';
COMMENT ON FUNCTION get_email_stats IS 'Calcola statistiche invio email (delivery rate, open rate, click rate) per periodo specificato';

-- Migration completed successfully!
-- Next: Install Resend package and create email service utilities
