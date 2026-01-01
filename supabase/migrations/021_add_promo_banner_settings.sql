-- Migration: Promo Banner Settings
-- Description: Tabella per gestire le impostazioni del banner promozionale
-- Date: 2026-01-01

-- Step 1: Create promo_banner_settings table
CREATE TABLE IF NOT EXISTS promo_banner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_enabled BOOLEAN DEFAULT true,
  message TEXT NOT NULL DEFAULT 'Registrati oggi e ricevi 2 crediti gratuiti per prenotare i campi!',
  cta_text VARCHAR(50) DEFAULT 'Iscriviti',
  cta_url VARCHAR(255) DEFAULT '/register',
  background_color VARCHAR(50) DEFAULT 'blue', -- blue, green, purple, red
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default settings
INSERT INTO promo_banner_settings (message, cta_text, cta_url, background_color, is_enabled)
VALUES (
  '🎾 Novità! Registrati oggi e ricevi 2 crediti gratuiti per prenotare i campi!',
  'Iscriviti',
  '/register',
  'blue',
  true
)
ON CONFLICT DO NOTHING;

-- Step 3: Enable RLS
ALTER TABLE promo_banner_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Everyone can view promo banner settings
CREATE POLICY "promo_banner_settings_select_all" ON promo_banner_settings
  FOR SELECT USING (true);

-- Only admin/gestore can update
CREATE POLICY "promo_banner_settings_update_admin" ON promo_banner_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Step 5: Function to update timestamp
CREATE OR REPLACE FUNCTION update_promo_banner_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promo_banner_timestamp
  BEFORE UPDATE ON promo_banner_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_banner_timestamp();

COMMENT ON TABLE promo_banner_settings IS 'Settings for promotional banner displayed on homepage';
COMMENT ON COLUMN promo_banner_settings.background_color IS 'Color theme: blue, green, purple, red';
