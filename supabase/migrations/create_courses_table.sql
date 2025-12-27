-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('iscrizione', 'base', 'avanzato', 'agonistico', 'extra', 'sconto')),
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  details TEXT[],
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default courses data
INSERT INTO courses (type, title, description, frequency, price_monthly, price_yearly, order_index, active) VALUES
  ('iscrizione', 'Quota Iscrizione', 'Comprende lo starter kit Adidas', NULL, NULL, 150, 0, true),
  ('base', 'Corso Base - Monosettimanale', '1 ora di tennis - 30 min di prep. fisica', 'mono', 100, 650, 1, true),
  ('base', 'Corso Base - Bisettimanale', '1 ora di tennis - 30 min di prep. fisica', 'bi', 150, 1000, 2, true),
  ('base', 'Corso Base - Trisettimanale', '1 ora di tennis - 30 min di prep. fisica', 'tri', 180, 1300, 3, true),
  ('avanzato', 'Corso Avanzato - Monosettimanale', '1 ora e 30 min di tennis - 30 min di prep. fisica', 'mono', 135, 900, 4, true),
  ('avanzato', 'Corso Avanzato - Bisettimanale', '1 ora e 30 min di tennis - 30 min di prep. fisica', 'bi', 180, 1350, 5, true),
  ('avanzato', 'Corso Avanzato - Trisettimanale', '1 ora e 30 min di tennis - 30 min di prep. fisica', 'tri', 220, 1500, 6, true),
  ('agonistico', 'Corso Agonistico', '1 ora e 30 min di tennis - 30 min di prep. fisica o palestra presso il Time Out Sporting Village - 5 giorni a settimana', NULL, NULL, 2700, 7, true),
  ('extra', 'Tesseramento Agonistico', NULL, NULL, NULL, 30, 8, true),
  ('extra', 'Tesseramento Non Agonistico', NULL, NULL, NULL, 20, 9, true),
  ('sconto', '5% Stesso nucleo familiare', NULL, NULL, NULL, NULL, 10, true),
  ('sconto', '5% Porta un amico', 'Se presenti un nuovo iscritto', NULL, NULL, NULL, 11, true),
  ('sconto', '5% Pagamento anticipato', 'Saldo quota iscrizione e prima rata entro il 15 settembre (solo annuale)', NULL, NULL, NULL, 12, true),
  ('sconto', '10% Pagamento unica soluzione', NULL, NULL, NULL, NULL, 13, true)
ON CONFLICT DO NOTHING;

-- Update homepage_sections to use courses instead of programs/subscriptions
UPDATE homepage_sections SET active = false WHERE section_key IN ('programs', 'subscriptions');

INSERT INTO homepage_sections (section_key, order_index, active) VALUES ('courses', 1, true)
ON CONFLICT (section_key) DO UPDATE SET active = true, order_index = 1;

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON courses
  FOR SELECT USING (active = true);

-- Allow admin/gestore full access
CREATE POLICY "Allow admin/gestore full access" ON courses
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'gestore')
    )
  );
