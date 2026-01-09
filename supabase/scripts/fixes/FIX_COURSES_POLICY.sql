-- Fix: Rename courses table conflict
-- The existing 'courses' table is for real courses with dates/coaches
-- We need a separate table 'course_sections' for homepage layout sections

-- Create course_sections table for homepage layout
CREATE TABLE IF NOT EXISTS course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_type TEXT NOT NULL CHECK (layout_type IN ('single_box', 'frequency_grid', 'list_with_price', 'list_no_price', 'info_card')),
  section_title TEXT NOT NULL,
  section_description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON course_sections;
DROP POLICY IF EXISTS "Allow admin/gestore full access" ON course_sections;

-- Allow public read access to active sections
CREATE POLICY "Allow public read access" ON course_sections
  FOR SELECT USING (is_active = true);

-- Allow admin/gestore full access
CREATE POLICY "Allow admin/gestore full access" ON course_sections
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'gestore')
    )
  );

-- Grant necessary permissions
GRANT ALL ON course_sections TO authenticated;
GRANT SELECT ON course_sections TO anon;

-- Insert default data
INSERT INTO course_sections (layout_type, section_title, section_description, items, order_index, is_active) VALUES
  ('single_box', 'Quota Iscrizione', 'Comprende lo starter kit Adidas', '[{"price": 150}]', 0, true),
  ('frequency_grid', 'Corso Base', '1 ora di tennis - 30 min di prep. fisica', '[
    {"frequency": "Monosettimanale", "price_monthly": 100, "price_yearly": 650},
    {"frequency": "Bisettimanale", "price_monthly": 150, "price_yearly": 1000},
    {"frequency": "Trisettimanale", "price_monthly": 180, "price_yearly": 1300}
  ]', 1, true),
  ('frequency_grid', 'Corso Avanzato', '1 ora e 30 min di tennis - 30 min di prep. fisica', '[
    {"frequency": "Monosettimanale", "price_monthly": 135, "price_yearly": 900},
    {"frequency": "Bisettimanale", "price_monthly": 180, "price_yearly": 1350},
    {"frequency": "Trisettimanale", "price_monthly": 220, "price_yearly": 1500}
  ]', 2, true),
  ('single_box', 'Corso Agonistico', NULL, '[{
    "details": ["1 ora e 30 min di tennis", "30 min di prep. fisica o palestra presso il Time Out Sporting Village", "5 giorni a settimana"],
    "price": 2700
  }]', 3, true),
  ('list_with_price', 'Extra', NULL, '[
    {"label": "Tesseramento Agonistico", "price": 30},
    {"label": "Tesseramento Non Agonistico", "price": 20}
  ]', 4, true),
  ('list_no_price', 'Sconti', NULL, '[
    {"label": "5% Stesso nucleo familiare", "description": null},
    {"label": "5% Porta un amico", "description": "Se presenti un nuovo iscritto"}
  ]', 5, true),
  ('info_card', 'Note Importanti', NULL, '[
    {"text": "La quota comprende tutto il materiale didattico"},
    {"text": "Possibilità di recupero lezioni perse"},
    {"text": "Accesso gratuito alla palestra del club"}
  ]', 6, true)
ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS course_sections_active_order_idx ON course_sections(is_active, order_index);
