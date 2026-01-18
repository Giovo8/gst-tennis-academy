-- Migration: Courts Settings
-- Description: Tabella per gestire la configurazione dei campi da tennis
-- Date: 2026-01-11

-- Step 1: Create courts_settings table
CREATE TABLE IF NOT EXISTS courts_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  court_name VARCHAR(50) NOT NULL UNIQUE,
  display_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default courts (4 courts as requested)
INSERT INTO courts_settings (court_name, display_order, is_active)
VALUES
  ('Campo 1', 1, true),
  ('Campo 2', 2, true),
  ('Campo 3', 3, true),
  ('Campo 4', 4, true)
ON CONFLICT (court_name) DO NOTHING;

-- Step 3: Enable RLS
ALTER TABLE courts_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Everyone authenticated can view courts
CREATE POLICY "courts_settings_select_authenticated" ON courts_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin/gestore can insert/update/delete
CREATE POLICY "courts_settings_insert_admin" ON courts_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "courts_settings_update_admin" ON courts_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "courts_settings_delete_admin" ON courts_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Step 5: Function to update timestamp
CREATE OR REPLACE FUNCTION update_courts_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_courts_settings_timestamp
  BEFORE UPDATE ON courts_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_courts_settings_timestamp();

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_courts_settings_active_order
  ON courts_settings (is_active, display_order)
  WHERE is_active = true;

COMMENT ON TABLE courts_settings IS 'Configuration table for tennis courts - allows dynamic management of court names and availability';
COMMENT ON COLUMN courts_settings.court_name IS 'Name of the court (e.g., Campo 1, Campo 2)';
COMMENT ON COLUMN courts_settings.display_order IS 'Order in which courts are displayed';
COMMENT ON COLUMN courts_settings.is_active IS 'Whether the court is currently active and bookable';
