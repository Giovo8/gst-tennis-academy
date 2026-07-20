-- Note personali in Area Maestro: blocco appunti giornaliero + lista "da fare".
-- Tabelle per-utente generiche (utilizzabili da qualsiasi ruolo), accesso diretto
-- dal client Supabase sotto RLS owner-only (stesso pattern di user_presence).

-- 1. Appunti del giorno: una riga per utente per giorno, testo libero con autosave.
CREATE TABLE IF NOT EXISTS daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_date)
);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_notes_owner" ON daily_notes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. Lista personale "da fare", non legata a una data.
CREATE TABLE IF NOT EXISTS personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_todos_user ON personal_todos(user_id, created_at DESC);

ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_todos_owner" ON personal_todos
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
