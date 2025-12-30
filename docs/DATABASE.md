# Database Documentation - GST Tennis Academy

**Ultima revisione**: 30 Dicembre 2025  
**Database**: PostgreSQL via Supabase  
**Versione Schema**: 2.0

## Panoramica

Il database utilizza PostgreSQL tramite Supabase con Row Level Security (RLS) abilitato per la sicurezza. L'architettura supporta:

- Sistema multi-ruolo (atleta, maestro, gestore, admin)
- Gestione tornei con 3 modalità (eliminazione diretta, girone + eliminazione, campionato)
- Sistema di messaggistica in tempo reale
- Sistema email con template e tracking
- Prenotazioni campi e lezioni
- Gestione corsi e iscrizioni
- News e annunci
- Pagamenti e ordini

---

## Schema Tabelle Principali

### 1. Profiles (Utenti)

Gestione profili utenti con sistema ruoli gerarchico.

```sql
CREATE TYPE user_role AS ENUM ('atleta', 'maestro', 'gestore', 'admin');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'atleta',
  subscription_type TEXT,
  
  -- Campi anagrafica
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profiles_role_idx ON profiles(role);
CREATE INDEX profiles_email_idx ON profiles(email);
```

**RLS Policies**:
- Utenti vedono solo il proprio profilo
- Admin/Gestore vedono tutti i profili
- Admin/Gestore possono creare/modificare profili

**Ruoli**:
- `atleta`: Accesso base, dashboard atleta, prenotazioni
- `maestro`: Dashboard coach, visualizza tutte le prenotazioni, gestione lezioni
- `gestore`: Dashboard admin, gestione utenti (no admin), creazione account
- `admin`: Accesso completo, può creare altri admin

---

### 2. Sistema Prenotazioni

#### Bookings

```sql
CREATE TYPE booking_type AS ENUM ('campo', 'lezione_privata', 'lezione_gruppo');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users ON DELETE SET NULL,
  court TEXT NOT NULL,
  type booking_type NOT NULL DEFAULT 'campo',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT bookings_time_check CHECK (end_time > start_time),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    court WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

CREATE INDEX bookings_user_idx ON bookings(user_id);
CREATE INDEX bookings_court_idx ON bookings(court, start_time);
CREATE INDEX bookings_type_idx ON bookings(type);
```

**Features**:
- Prevenzione sovrapposizioni automatica con exclusion constraint
- Supporto campo, lezioni private, lezioni gruppo
- Assegnazione opzionale coach

**RLS Policies**:
- Utenti vedono solo le proprie prenotazioni
- Maestri vedono tutte le prenotazioni
- Admin/Gestore gestione completa

---

### 3. Sistema Tornei (Versione Semplificata v2.0)

#### Tournaments

```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,  -- Opzionale
  end_date TIMESTAMPTZ,     -- Opzionale
  category TEXT,
  level TEXT,
  max_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aperto',  -- 'Aperto', 'In Corso', 'Concluso', 'Annullato'
  
  -- Tipo competizione
  tournament_type VARCHAR(50) DEFAULT 'eliminazione_diretta',
    -- 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato'
  best_of INTEGER DEFAULT 3 CHECK (best_of IN (3, 5)),
  
  -- Tennis specifico
  match_format TEXT DEFAULT 'best_of_3',  -- 'best_of_1', 'best_of_3', 'best_of_5'
  surface_type TEXT DEFAULT 'terra',      -- 'terra', 'erba', 'cemento', 'sintetico', 'indoor'
  
  -- Sistema gironi (per girone_eliminazione)
  num_groups INT DEFAULT 0,
  teams_per_group INT DEFAULT 4,
  teams_advancing INT DEFAULT 2,  -- Quanti avanzano per girone
  current_phase VARCHAR(50) DEFAULT 'iscrizioni',
    -- 'iscrizioni' | 'gironi' | 'eliminazione' | 'completato' | 'annullato'
  bracket_config JSONB DEFAULT '{}'::jsonb,
  
  -- Dati strutturali (legacy/cache)
  rounds_data JSONB DEFAULT '[]'::jsonb,
  groups_data JSONB DEFAULT '[]'::jsonb,
  standings JSONB DEFAULT '[]'::jsonb,
  
  -- Financial
  entry_fee DECIMAL(10,2),
  prize_money DECIMAL(10,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT tournaments_type_check CHECK (
    tournament_type IN ('eliminazione_diretta', 'girone_eliminazione', 'campionato')
  ),
  CONSTRAINT tournaments_phase_check CHECK (
    current_phase IN ('iscrizioni', 'gironi', 'eliminazione', 'completato', 'annullato')
  )
);

CREATE INDEX tournaments_status_idx ON tournaments(status);
CREATE INDEX tournaments_type_idx ON tournaments(tournament_type);
CREATE INDEX tournaments_dates_idx ON tournaments(start_date, end_date);
```

**Tipi di Torneo**:

1. **Eliminazione Diretta** (`eliminazione_diretta`)
   - Bracket classico ad eliminazione
   - max_participants: 2, 4, 8, 16, 32, 64, 128
   - Fase unica: `current_phase = 'eliminazione'`

2. **Girone + Eliminazione** (`girone_eliminazione`)
   - Fase a gironi seguita da eliminazione diretta
   - `num_groups`: numero gironi (2-8)
   - `teams_per_group`: partecipanti per girone (3-8)
   - `teams_advancing`: quanti qualificati per girone (1-4)
   - Fasi: `iscrizioni` → `gironi` → `eliminazione` → `completato`

3. **Campionato** (`campionato`)
   - Round-robin, tutti contro tutti
   - Calcolo punti: 2 vittoria, 0 sconfitta
   - Classifica unica
   - Fasi: `iscrizioni` → `gironi` → `completato`

#### Tournament Groups

```sql
CREATE TABLE tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL,  -- "Girone A", "Girone B", ...
  group_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tournament_id, group_name)
);

CREATE INDEX idx_tournament_groups_tournament_id ON tournament_groups(tournament_id);
```

#### Tournament Participants

```sql
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
  seed INT,               -- Posizione seeding
  group_position INT,     -- Posizione finale nel girone
  stats JSONB DEFAULT '{
    "matches_played": 0,
    "matches_won": 0,
    "matches_lost": 0,
    "sets_won": 0,
    "sets_lost": 0,
    "games_won": 0,
    "games_lost": 0,
    "points": 0
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX tournament_participants_tournament_idx ON tournament_participants(tournament_id);
CREATE INDEX tournament_participants_user_idx ON tournament_participants(user_id);
CREATE INDEX tournament_participants_group_idx ON tournament_participants(group_id);
```

#### Tournament Matches

```sql
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- Fase e round
  phase VARCHAR(50) NOT NULL,  -- 'gironi' | 'eliminazione'
  round_name VARCHAR(100),     -- "Girone A - Giornata 1", "Quarti", "Finale"
  round_number INT,
  match_number INT,
  
  -- Partecipanti
  player1_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  
  -- Risultato
  player1_score INT DEFAULT 0,  -- Set vinti
  player2_score INT DEFAULT 0,  -- Set vinti
  score_details JSONB DEFAULT '{"sets": []}'::jsonb,
    -- Esempio: {"sets": [{"p1": 6, "p2": 4}, {"p1": 7, "p2": 5}]}
  winner_id UUID REFERENCES tournament_participants(id),
  
  -- Stato
  status VARCHAR(50) DEFAULT 'programmata',
    -- 'programmata' | 'in_corso' | 'completata' | 'annullata' | 'walkover'
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadati
  court VARCHAR(50),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tournament_matches_phase_check CHECK (phase IN ('gironi', 'eliminazione')),
  CONSTRAINT tournament_matches_status_check CHECK (
    status IN ('programmata', 'in_corso', 'completata', 'annullata', 'walkover')
  )
);

CREATE INDEX idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_phase ON tournament_matches(phase);
CREATE INDEX idx_tournament_matches_players ON tournament_matches(player1_id, player2_id);
```

**RLS Policies Tornei**:
- Tutti possono visualizzare tornei e partecipanti
- Solo Admin/Gestore possono creare/modificare tornei
- Utenti possono iscriversi autonomamente
- Admin/Gestore/Maestro possono inserire risultati

---

### 4. Sistema Chat/Messaggistica

#### Conversations

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),           -- Opzionale per conversazioni gruppo
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

#### Conversation Participants

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_unread ON conversation_participants(user_id, unread_count)
  WHERE unread_count > 0;
```

#### Messages

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
    -- 'text' | 'image' | 'file' | 'system' | 'booking' | 'lesson'
  attachment_url TEXT,
  attachment_metadata JSONB,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT messages_type_check CHECK (
    message_type IN ('text', 'image', 'file', 'system', 'booking', 'lesson')
  )
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

#### Message Reads

```sql
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);
```

**RLS Policies Chat**:
- Utenti vedono solo conversazioni a cui partecipano
- Admin/Gestore vedono tutte le conversazioni
- Participants possono inviare messaggi nelle loro conversazioni

---

### 5. Sistema Email

#### Email Logs

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  subject VARCHAR(500) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  
  status VARCHAR(50) DEFAULT 'pending',
    -- 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'
  provider VARCHAR(50) DEFAULT 'resend',
  provider_message_id VARCHAR(255),
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  error_message TEXT,
  retry_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template_name);
```

#### Email Templates

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  subject_template VARCHAR(500) NOT NULL,  -- Con placeholder: "Conferma - {{court_name}}"
  html_template TEXT NOT NULL,
  text_template TEXT,
  
  category VARCHAR(50),  -- 'transactional' | 'marketing' | 'notification' | 'system'
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_name ON email_templates(name);
```

#### Email Unsubscribes

```sql
CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  unsubscribe_from VARCHAR(50) DEFAULT 'all',  -- 'all' | 'marketing' | 'notifications'
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, unsubscribe_from),
  UNIQUE(email, unsubscribe_from)
);
```

**RLS Policies Email**:
- Solo Admin/Gestore vedono email logs e template
- Sistema può creare email logs
- Utenti possono gestire le proprie unsubscribe

---

### 6. Corsi e Iscrizioni

#### Courses

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  coach_id UUID REFERENCES auth.users ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule TEXT,  -- JSON o testo descrittivo orari
  max_participants INT NOT NULL DEFAULT 10,
  current_participants INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  level TEXT,      -- 'principiante', 'intermedio', 'avanzato'
  age_group TEXT,  -- 'bambini', 'junior', 'adulti', 'senior'
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX courses_coach_idx ON courses(coach_id);
CREATE INDEX courses_dates_idx ON courses(start_date, end_date);
CREATE INDEX courses_active_idx ON courses(is_active);
```

#### Enrollments

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'refunded'
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, course_id)
);

CREATE INDEX enrollments_user_idx ON enrollments(user_id);
CREATE INDEX enrollments_course_idx ON enrollments(course_id);
CREATE INDEX enrollments_status_idx ON enrollments(status);
```

**RLS Policies**:
- Tutti vedono corsi attivi
- Admin/Gestore/Maestro gestiscono corsi
- Utenti vedono le proprie iscrizioni
- Utenti possono iscriversi autonomamente

---

### 7. News e Annunci

#### News

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  image_url TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX news_published_date_idx ON news(published, date DESC);
CREATE INDEX news_created_by_idx ON news(created_by);
```

**RLS Policies News**:
- Tutti vedono news pubblicate
- Admin/Gestore vedono tutte le news
- Solo Admin/Gestore possono creare/modificare/eliminare

---

### 8. Payments e Orders

#### Payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_type TEXT NOT NULL,  -- 'subscription' | 'booking' | 'course' | 'event' | 'product'
  reference_id UUID,           -- ID booking/course/event/product correlato
  payment_method TEXT,         -- 'stripe' | 'cash' | 'bank_transfer'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed' | 'refunded'
  stripe_payment_id TEXT,
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_user_idx ON payments(user_id);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_type_idx ON payments(payment_type);
```

#### Orders

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_email TEXT,
  amount_total BIGINT,
  currency TEXT,
  payment_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 9. Subscription Credits

Sistema crediti settimanali per abbonamenti.

```sql
CREATE TABLE subscription_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'Monosettimanale',
  weekly_credits INT NOT NULL DEFAULT 1,
  credits_available INT NOT NULL DEFAULT 1,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscription_credits_user_idx ON subscription_credits(user_id);
```

**Funzioni Helper**:

```sql
-- Reset crediti settimanali (eseguire ogni lunedì)
CREATE OR REPLACE FUNCTION reset_weekly_credits()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE subscription_credits
  SET credits_available = weekly_credits,
      last_reset = NOW(),
      updated_at = NOW()
  WHERE date_part('isodow', NOW()) = 1; -- Lunedì
END;
$$;

-- Consuma un credito gruppo
CREATE OR REPLACE FUNCTION consume_group_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  UPDATE subscription_credits
  SET credits_available = credits_available - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND credits_available > 0
  RETURNING true INTO ok;
  
  RETURN ok;
END;
$$;
```

---

## Funzioni Helper Tornei

### Creazione Gironi

```sql
CREATE OR REPLACE FUNCTION create_tournament_groups(
  p_tournament_id UUID,
  p_num_groups INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_name VARCHAR(50);
  v_i INT;
BEGIN
  FOR v_i IN 1..p_num_groups LOOP
    v_group_name := 'Girone ' || CHR(64 + v_i);
    
    INSERT INTO tournament_groups (tournament_id, group_name, group_order)
    VALUES (p_tournament_id, v_group_name, v_i)
    ON CONFLICT (tournament_id, group_name) DO NOTHING;
  END LOOP;
END;
$$;
```

### Assegnazione Partecipanti ai Gironi

```sql
CREATE OR REPLACE FUNCTION assign_participants_to_groups(
  p_tournament_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant RECORD;
  v_groups UUID[];
  v_group_index INT := 0;
  v_seed INT := 1;
BEGIN
  SELECT ARRAY_AGG(id ORDER BY group_order) INTO v_groups
  FROM tournament_groups
  WHERE tournament_id = p_tournament_id;
  
  IF v_groups IS NULL OR array_length(v_groups, 1) = 0 THEN
    RAISE EXCEPTION 'Nessun girone trovato per il torneo %', p_tournament_id;
  END IF;
  
  FOR v_participant IN 
    SELECT id FROM tournament_participants 
    WHERE tournament_id = p_tournament_id AND group_id IS NULL
    ORDER BY created_at
  LOOP
    UPDATE tournament_participants
    SET 
      group_id = v_groups[(v_group_index % array_length(v_groups, 1)) + 1],
      seed = v_seed
    WHERE id = v_participant.id;
    
    v_group_index := v_group_index + 1;
    v_seed := v_seed + 1;
  END LOOP;
END;
$$;
```

### Calcolo Classifica Girone

```sql
CREATE OR REPLACE FUNCTION calculate_group_standings(
  p_group_id UUID
)
RETURNS TABLE (
  participant_id UUID,
  points INT,
  matches_played INT,
  matches_won INT,
  matches_lost INT,
  sets_won INT,
  sets_lost INT,
  games_won INT,
  games_lost INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    (tp.stats->>'points')::INT,
    (tp.stats->>'matches_played')::INT,
    (tp.stats->>'matches_won')::INT,
    (tp.stats->>'matches_lost')::INT,
    (tp.stats->>'sets_won')::INT,
    (tp.stats->>'sets_lost')::INT,
    (tp.stats->>'games_won')::INT,
    (tp.stats->>'games_lost')::INT
  FROM tournament_participants tp
  WHERE tp.group_id = p_group_id
  ORDER BY 
    (tp.stats->>'points')::INT DESC,
    (tp.stats->>'sets_won')::INT - (tp.stats->>'sets_lost')::INT DESC,
    (tp.stats->>'games_won')::INT - (tp.stats->>'games_lost')::INT DESC;
END;
$$;
```

---

## Migrazioni

### Lista Migrazioni Applicate

| # | File | Descrizione |
|---|------|-------------|
| 001 | `001_create_tournaments_and_participants.sql` | Tabelle base tornei |
| 002 | `002_rls_policies_tournaments.sql` | RLS policies tornei |
| 003 | `003_add_competition_types.sql` | Tipi competizione |
| 004 | `004_tennis_tournament_system.sql` | Sistema tennis completo |
| 005 | `005_chat_messaging_system.sql` | Sistema messaggistica |
| 006 | `006_announcements_system.sql` | Sistema annunci |
| 007 | `007_email_system.sql` | Sistema email |
| 008 | `008_profile_enhancements.sql` | Miglioramenti profili |
| 010 | `010_simplified_tournament_system.sql` | **Sistema tornei v2 semplificato** |
| 011 | `011_make_dates_optional.sql` | Date tornei opzionali |
| 012 | `012_tournament_matches_bracket_columns.sql` | Colonne bracket matches |
| 013 | `013_tennis_scoring_system.sql` | Sistema punteggio tennis |
| - | `improve_roles_system.sql` | Miglioramenti sistema ruoli |
| - | `create_courses_table.sql` | Tabella corsi |
| - | `add_news_table.sql` | Tabella news |
| - | `complete_migration.sql` | Staff, hero images, subscriptions |

### File SQL Utility

| File | Scopo |
|------|-------|
| `RESET_DATABASE.sql` | Reset completo database |
| `FIX_TOURNAMENTS_SCHEMA.sql` | Fix schema tornei |
| `APPLY_ALL_BRACKET_FIXES.sql` | Fix bracket system |
| `FIX_STAFF_RLS.sql` | Fix RLS policies staff |
| `FIX_COURSES_POLICY.sql` | Fix RLS policies corsi |

---

## Query Utili

### Gestione Ruoli

```sql
-- Ottenere tutti gli admin
SELECT * FROM profiles WHERE role IN ('admin', 'gestore');

-- Promuovere utente ad admin
UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid';

-- Contare utenti per ruolo
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

### Tornei

```sql
-- Tornei aperti con posti disponibili
SELECT t.*, 
  COUNT(tp.id) as iscritti,
  t.max_participants - COUNT(tp.id) as posti_disponibili
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
WHERE t.status = 'Aperto'
GROUP BY t.id
HAVING COUNT(tp.id) < t.max_participants;

-- Classifica girone
SELECT 
  tp.id,
  p.full_name,
  tp.stats->>'points' as punti,
  tp.stats->>'matches_won' as vittorie,
  tp.stats->>'sets_won' - tp.stats->>'sets_lost' as diff_set
FROM tournament_participants tp
JOIN profiles p ON tp.user_id = p.id
WHERE tp.group_id = 'group-uuid'
ORDER BY 
  (tp.stats->>'points')::INT DESC,
  ((tp.stats->>'sets_won')::INT - (tp.stats->>'sets_lost')::INT) DESC;
```

### Prenotazioni

```sql
-- Prenotazioni di oggi
SELECT b.*, p.full_name
FROM bookings b
JOIN profiles p ON b.user_id = p.id
WHERE DATE(b.start_time) = CURRENT_DATE
ORDER BY b.start_time;

-- Campi liberi in un orario
SELECT DISTINCT court
FROM unnest(ARRAY['Campo 1', 'Campo 2', 'Campo 3']) AS court
WHERE court NOT IN (
  SELECT court FROM bookings
  WHERE start_time < '2025-12-30 15:00:00'
  AND end_time > '2025-12-30 14:00:00'
);
```

---

## Backup e Manutenzione

### Backup Database

```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Restore
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres -f backup.sql
```

### Pulizia Dati Vecchi

```sql
-- Elimina prenotazioni passate oltre 6 mesi
DELETE FROM bookings WHERE end_time < NOW() - INTERVAL '6 months';

-- Elimina email logs oltre 3 mesi
DELETE FROM email_logs WHERE created_at < NOW() - INTERVAL '3 months';
```

---

**Fine Documentazione Database**
