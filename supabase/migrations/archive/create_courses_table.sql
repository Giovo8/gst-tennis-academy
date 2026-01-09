-- Drop existing courses table if it exists
DROP TABLE IF EXISTS courses CASCADE;

-- Create courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_type TEXT NOT NULL CHECK (layout_type IN ('single_box', 'frequency_grid', 'list_with_price', 'list_no_price', 'info_card')),
  section_title TEXT NOT NULL,
  section_description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default courses data
INSERT INTO courses (layout_type, section_title, section_description, items, order_index, active) VALUES
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
    {"label": "5% Porta un amico", "description": "Se presenti un nuovo iscritto"},
    {"label": "5% Pagamento anticipato", "description": "Saldo quota iscrizione e prima rata entro il 15 settembre (solo annuale)"},
    {"label": "10% Pagamento unica soluzione", "description": null}
  ]', 5, true),
  ('info_card', 'Note Importanti', NULL, '[
    {"text": "Tesseramento obbligatorio. Per il tesseramento agonistico è necessario il certificato medico."},
    {"text": "Quando le condizioni meteo saranno avverse il corso agonistico farà 1 ora di palestra 1/2 incontri al mese con la psicologa dello sport in base alla programmazione della scuola tennis."},
    {"text": "Gli sconti non sono cumulabili tra loro e con altre convenzioni."}
  ]', 6, true);

-- Update homepage_sections to use courses instead of programs/subscriptions
UPDATE homepage_sections SET active = false WHERE section_key IN ('programs', 'subscriptions');

INSERT INTO homepage_sections (section_key, section_name, order_index, active) 
VALUES ('courses', 'Corsi e Abbonamenti', 1, true)
ON CONFLICT (section_key) DO UPDATE SET active = true, order_index = 1, section_name = 'Corsi e Abbonamenti';

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
