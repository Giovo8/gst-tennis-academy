# Database Guide - GST Tennis Academy

## Panoramica

Il database utilizza **PostgreSQL** tramite **Supabase** con Row Level Security (RLS) abilitato per la sicurezza dei dati.

## Schema Principale

### 1. Tabella `profiles`

Profili utenti con sistema ruoli.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'atleta', -- 'atleta', 'maestro', 'gestore', 'admin'
  subscription_type TEXT,
  
  -- Campi aggiuntivi scheda anagrafica
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- Ottenere tutti gli admin e gestori
SELECT * FROM profiles WHERE role IN ('admin', 'gestore');

-- Aggiornare il ruolo di un utente
UPDATE profiles SET role = 'maestro' WHERE id = 'user-uuid';

-- Contare utenti per ruolo
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

---

### 2. Sistema Tornei

#### Tabella `tournaments`

Gestione tornei e campionati con 3 tipi di competizione.

```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ, -- Nota: ora opzionale (può essere NULL)
  end_date TIMESTAMPTZ,
  category TEXT,
  level TEXT,
  max_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aperto', -- 'Aperto', 'In Corso', 'Concluso', 'Annullato'
  
  -- Tipo competizione (sistema semplificato)
  tournament_type VARCHAR(50) DEFAULT 'eliminazione_diretta', -- 'eliminazione_diretta', 'girone_eliminazione', 'campionato'
  best_of INTEGER DEFAULT 3 CHECK (best_of IN (3, 5)), -- Best of 3 o 5 set
  
  -- Tennis specifico
  match_format TEXT DEFAULT 'best_of_3', -- 'best_of_1', 'best_of_3', 'best_of_5'
  surface_type TEXT DEFAULT 'terra', -- 'terra', 'erba', 'cemento', 'sintetico', 'indoor', 'carpet'
  
  -- Sistema gironi
  num_groups INT DEFAULT 0,
  teams_per_group INT DEFAULT 4,
  teams_advancing INT DEFAULT 2,
  current_phase VARCHAR(50) DEFAULT 'iscrizioni', -- 'iscrizioni', 'gironi', 'eliminazione', 'completato', 'annullato'
  bracket_config JSONB DEFAULT '{}'::jsonb,
  
  -- Dati strutturali (legacy)
  rounds_data JSONB DEFAULT '[]'::jsonb,
  groups_data JSONB DEFAULT '[]'::jsonb,
  standings JSONB DEFAULT '[]'::jsonb,
  
  -- Financial
  entry_fee DECIMAL(10,2),
  prize_money DECIMAL(10,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Tipi di Competizione:**

1. **Torneo Eliminazione Diretta** (`tournament_type='eliminazione_diretta'`)
   - Bracket ad eliminazione diretta
   - max_participants: 2, 4, 8, 16, 32, 64, 128
   - best_of: 3 o 5 (best of 3 o 5 set)

2. **Torneo Gironi + Eliminazione** (`tournament_type='girone_eliminazione'`)
   - Fase a gironi seguita da eliminazione diretta
   - I migliori di ogni girone avanzano al knockout
   - Configurabile: num_groups, teams_per_group, teams_advancing

3. **Campionato Round-Robin** (`tournament_type='campionato'`)
   - Tutti giocano contro tutti
   - Classifica finale basata su punti/set/game

**Esempi Query:**

```sql
-- Tornei attivi
SELECT * FROM tournaments WHERE status = 'Aperto' AND start_date > NOW() ORDER BY start_date;

-- Tornei di eliminazione diretta
SELECT * FROM tournaments WHERE tournament_type = 'eliminazione_diretta';

-- Tornei con gironi
SELECT * FROM tournaments WHERE tournament_type = 'girone_eliminazione' AND status = 'Aperto';

-- Tornei su terra battuta best of 5
SELECT * FROM tournaments WHERE surface_type = 'terra' AND best_of = 5;

-- Creare nuovo torneo
INSERT INTO tournaments (title, description, start_date, end_date, max_participants, tournament_type, best_of, surface_type, category)
VALUES (
  'Open Estate 2026',
  'Torneo su terra battuta per tutti i livelli',
  '2026-07-01 09:00:00+00',
  '2026-07-07 18:00:00+00',
  16,
  'eliminazione_diretta',
  3,
  'terra',
  'Open'
);
```

---

#### Tabella `tournament_participants`

Partecipanti ai tornei con statistiche.

```sql
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  
  -- Gruppo (per tornei con gironi)
  group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
  seeding INT,
  group_position INT,
  
  -- Statistiche
  matches_played INT DEFAULT 0,
  matches_won INT DEFAULT 0,
  matches_lost INT DEFAULT 0,
  sets_won INT DEFAULT 0,
  sets_lost INT DEFAULT 0,
  games_won INT DEFAULT 0,
  games_lost INT DEFAULT 0,
  points INT DEFAULT 0, -- Punti classifica
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);
```

**Esempi Query:**

```sql
-- Classifica torneo
SELECT 
  tp.*,
  p.full_name,
  (tp.sets_won - tp.sets_lost) AS set_diff,
  (tp.games_won - tp.games_lost) AS game_diff
FROM tournament_participants tp
JOIN profiles p ON tp.user_id = p.id
WHERE tp.tournament_id = 'tournament-uuid'
ORDER BY tp.points DESC, set_diff DESC, game_diff DESC;

-- Iscrivere un partecipante
INSERT INTO tournament_participants (tournament_id, user_id)
VALUES ('tournament-uuid', 'user-uuid');
```

---

#### Tabella `tournament_groups`

Gironi per fase a gruppi.

```sql
CREATE TABLE tournament_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL, -- "Gruppo A", "Gruppo B"
  group_order INT NOT NULL,
  max_participants INT DEFAULT 4,
  advancement_count INT DEFAULT 2, -- Quanti avanzano
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, group_name)
);
```

---

#### Tabella `tournament_matches`

Incontri con scoring tennis (set, game, tiebreak).

```sql
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_name VARCHAR(100), -- "Ottavi", "Quarti", "Gruppo A - Giornata 1"
  round_order INT,
  stage VARCHAR(50) NOT NULL, -- 'groups' o 'knockout'
  
  -- Giocatori
  player1_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE,
  
  -- Score tennis
  player1_sets INT DEFAULT 0,
  player2_sets INT DEFAULT 0,
  sets JSONB DEFAULT '[]'::jsonb, -- Array di set: [{"player1_score": 6, "player2_score": 3}, ...]
  score_detail JSONB DEFAULT '{"sets": []}'::jsonb, -- Dettaglio completo con tiebreak
  -- Es: {"sets": [{"set": 1, "p1_games": 6, "p2_games": 4, "tiebreak": null}, {"set": 2, "p1_games": 7, "p2_games": 6, "tiebreak": {"p1_points": 7, "p2_points": 3}}]}
  
  -- Risultato
  winner_id UUID REFERENCES tournament_participants(id),
  match_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'walkover', 'retired'
  
  -- Info match
  scheduled_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  court_number VARCHAR(20),
  surface_type VARCHAR(50),
  duration_minutes INT,
  
  -- Statistiche opzionali
  stats JSONB DEFAULT '{}'::jsonb, -- aces, double faults, winners, unforced errors
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- Incontri di un torneo
SELECT * FROM tournament_matches WHERE tournament_id = 'tournament-uuid' ORDER BY round_order, scheduled_time;

-- Creare un incontro
INSERT INTO tournament_matches (tournament_id, round_name, stage, player1_id, player2_id, scheduled_time, court_number)
VALUES ('tournament-uuid', 'Finale', 'knockout', 'participant-uuid-1', 'participant-uuid-2', '2026-07-07 15:00:00+00', 'Centrale');

-- Aggiornare punteggio
UPDATE tournament_matches
SET 
  player1_sets = 2,
  player2_sets = 1,
  score_detail = '{"sets": [{"set": 1, "p1_games": 6, "p2_games": 4}, {"set": 2, "p1_games": 4, "p2_games": 6}, {"set": 3, "p1_games": 6, "p2_games": 3}]}'::jsonb,
  winner_id = 'participant-uuid-1',
  match_status = 'completed',
  end_time = NOW()
WHERE id = 'match-uuid';
```

---

### 3. Sistema Annunci

#### Tabella `announcements`

Sistema bacheca per annunci, eventi, comunicazioni.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) NOT NULL DEFAULT 'announcement', -- 'announcement', 'partner', 'event', 'news', 'tournament', 'lesson', 'promotion'
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  expiry_date TIMESTAMPTZ,
  visibility VARCHAR(50) DEFAULT 'all', -- 'all', 'atleti', 'maestri', 'admin', 'gestore', 'public'
  is_published BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  image_url TEXT,
  link_url TEXT,
  link_text VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabella `announcement_views`

Tracciamento visualizzazioni annunci.

```sql
CREATE TABLE announcement_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(announcement_id, user_id)
);
```

**Esempi Query:**

```sql
-- Annunci attivi e pubblicati
SELECT * FROM announcements 
WHERE is_published = true 
  AND (expiry_date IS NULL OR expiry_date > NOW())
ORDER BY is_pinned DESC, created_at DESC;

-- Annunci urgenti
SELECT * FROM announcements WHERE priority = 'urgent' AND is_published = true;

-- Creare annuncio
INSERT INTO announcements (title, content, announcement_type, priority, visibility)
VALUES (
  'Manutenzione Campo 1',
  'Il campo 1 sarà chiuso per manutenzione dal 15 al 20 gennaio',
  'announcement',
  'high',
  'all'
);
```

---

### 4. Sistema Chat/Messaggistica

#### Tabella `conversations`

Conversazioni tra utenti.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### Tabella `conversation_participants`

Partecipanti alle conversazioni.

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
```

#### Tabella `messages`

Messaggi all'interno delle conversazioni.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', 'system', 'booking', 'lesson'
  attachment_url TEXT,
  attachment_metadata JSONB,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- Conversazioni di un utente con messaggi non letti
SELECT c.*, cp.unread_count
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE cp.user_id = 'user-uuid' AND cp.unread_count > 0
ORDER BY c.last_message_at DESC;

-- Messaggi di una conversazione
SELECT m.*, p.full_name AS sender_name
FROM messages m
JOIN profiles p ON m.sender_id = p.id
WHERE m.conversation_id = 'conversation-uuid'
ORDER BY m.created_at;
```

---

### 5. Sistema Email

#### Tabella `email_logs`

Log di tutte le email inviate.

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject VARCHAR(500) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'
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
```

#### Tabella `email_templates`

Template per le email.

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  subject_template VARCHAR(500) NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  category VARCHAR(50), -- 'transactional', 'marketing', 'notification', 'system'
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabella `email_unsubscribes`

Disiscrizioni da email.

```sql
CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  unsubscribe_from VARCHAR(50) DEFAULT 'all', -- 'all', 'marketing', 'notifications'
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, unsubscribe_from)
);
```

**Esempi Query:**

```sql
-- Email inviate oggi
SELECT * FROM email_logs 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Tasso di apertura per template
SELECT 
  template_name,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened_at IS NOT NULL) / COUNT(*), 2) AS open_rate
FROM email_logs
WHERE status = 'sent'
GROUP BY template_name;
```

---

### 6. Gestione Homepage

#### Tabella `hero_content`

Contenuti della sezione hero (testi, badge, statistiche).

```sql
CREATE TABLE hero_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text TEXT NOT NULL DEFAULT 'Cresci nel tuo tennis',
  title TEXT NOT NULL,
  title_highlight TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  primary_button_text TEXT NOT NULL DEFAULT 'Prenota una prova',
  primary_button_link TEXT NOT NULL DEFAULT '/bookings',
  secondary_button_text TEXT NOT NULL DEFAULT 'Scopri i programmi',
  secondary_button_link TEXT NOT NULL DEFAULT '#programmi',
  stat1_value TEXT NOT NULL DEFAULT '250+',
  stat1_label TEXT NOT NULL DEFAULT 'Atleti attivi',
  stat2_value TEXT NOT NULL DEFAULT '180',
  stat2_label TEXT NOT NULL DEFAULT 'Tornei vinti',
  stat3_value TEXT NOT NULL DEFAULT '8',
  stat3_label TEXT NOT NULL DEFAULT 'Campi disponibili',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabella `hero_images`

Immagini carousel della hero section.

```sql
CREATE TABLE hero_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabella `homepage_sections`

Sezioni attive/disattivabili della homepage.

```sql
CREATE TABLE homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL, -- 'hero', 'subscriptions', 'programs', 'staff', 'news', 'tornei', 'social', 'cta'
  section_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- Sezioni homepage attive in ordine
SELECT * FROM homepage_sections 
WHERE active = true 
ORDER BY order_index;

-- Immagini hero attive
SELECT * FROM hero_images 
WHERE active = true 
ORDER BY order_index;

-- Contenuto hero attivo
SELECT * FROM hero_content WHERE active = true LIMIT 1;
```

---

### 7. Tabella `news`

Notizie e comunicazioni del circolo.

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT, -- 'Tornei', 'Eventi', 'Struttura', 'Comunicazioni'
  summary TEXT,
  content TEXT,
  published BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- News pubblicate recenti
SELECT * FROM news WHERE published = true ORDER BY date DESC LIMIT 10;

-- News per categoria
SELECT * FROM news WHERE category = 'Tornei' AND published = true;

-- Creare news
INSERT INTO news (title, date, category, summary, content, published)
VALUES (
  'Nuovo Campo Inaugurato',
  '2026-01-15',
  'Struttura',
  'Inaugurato il nuovo campo coperto',
  'Contenuto completo della news...',
  true
);
```

---

### 4. Tabella `staff`

Membri dello staff con ruoli.

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'Head Coach', 'Preparatore Atletico', 'Mental Coach'
  bio TEXT,
  active BOOLEAN DEFAULT true,
  order_index INT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- Staff attivo ordinato
SELECT * FROM staff WHERE active = true ORDER BY order_index;

-- Aggiungere membro staff
INSERT INTO staff (full_name, role, bio, order_index)
VALUES ('Mario Rossi', 'Maestro FITP 3° grado', 'Specialista in tecnica e tattica', 1);
```

---

### 5. Tabella `programs`

Programmi di allenamento.

```sql
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  focus TEXT,
  points JSONB, -- Array di stringhe con i punti chiave
  active BOOLEAN DEFAULT true,
  order_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Esempi Query:**

```sql
-- Programmi attivi
SELECT * FROM programs WHERE active = true ORDER BY order_index;

-- Creare programma
INSERT INTO programs (title, focus, points, order_index)
VALUES (
  'Junior Academy',
  'U10 - U16 | Tecnica & coordinazione',
  '["Gruppi per età", "Match play", "Video analysis"]'::jsonb,
  1
);
```

---

### 6. Tabella `bookings`

Prenotazioni campi e lezioni.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users ON DELETE SET NULL,
  court TEXT NOT NULL,
  type booking_type NOT NULL DEFAULT 'campo', -- 'campo', 'lezione_privata', 'lezione_gruppo'
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (court WITH =, tstzrange(start_time, end_time) WITH &&)
);
```

**Esempi Query:**

```sql
-- Prenotazioni future
SELECT * FROM bookings WHERE start_time > NOW() ORDER BY start_time;

-- Prenotazioni di un utente
SELECT * FROM bookings WHERE user_id = 'user-uuid' ORDER BY start_time DESC;

-- Disponibilità campo
SELECT * FROM bookings 
WHERE court = 'Campo 1' 
AND start_time::date = '2026-01-15'
ORDER BY start_time;
```

---

## Funzioni Utili

### Calcolare classifica gironi

```sql
SELECT * FROM calculate_group_standings('group-uuid');
```

### Aggiornare statistiche dopo match

Le statistiche vengono aggiornate automaticamente tramite trigger quando un match viene completato.

---

## RLS (Row Level Security)

Tutte le tabelle hanno RLS abilitato con policy specifiche:

- **Public read**: Tornei, news, staff, programs, announcements pubblici sono visibili a tutti
- **Authenticated write**: Solo utenti autenticati possono prenotare, iscriversi, inviare messaggi
- **Admin/Gestore write**: Solo admin e gestori possono creare/modificare tornei, annunci, news
- **Own data**: Gli utenti possono modificare solo i propri dati (profilo, prenotazioni)

### Service Role per Operazioni Admin

Per operazioni amministrative che bypassano RLS (es: creazione tornei, invio email, gestione partite), le API utilizzano il **service role** di Supabase:

```typescript
// API route con service role per operazioni admin
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypassa RLS
  { auth: { persistSession: false } }
);

// Esempio: avviare torneo (solo admin via API)
export async function POST(request: Request) {
  // Verifica che l'utente sia admin
  const session = await getSession();
  if (!session || !['admin', 'gestore'].includes(session.user.role)) {
    return new Response('Unauthorized', { status: 403 });
  }
  
  // Usa service role per operazioni che richiedono privilegi elevati
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .update({ status: 'In Corso', current_phase: 'gironi' })
    .eq('id', tournamentId);
}
```

**Vantaggi:**
- Le policy RLS proteggono l'accesso diretto al database
- Le API routes verificano i permessi dell'utente
- Il service role permette operazioni complesse senza limitazioni RLS
- Audit trail attraverso i log delle API

---

## Migration Flow

1. **Base schema** - `schema.sql` - Schema base con profiles, bookings, services, products, courses, enrollments, tournaments
2. `001_create_tournaments_and_participants.sql` - Tabelle base tornei
3. `002_rls_policies_tournaments.sql` - Policy RLS
4. `003_add_competition_types.sql` - Tipi competizione e formati
5. `004_tennis_tournament_system.sql` - Sistema completo tennis con gruppi e match
6. `005_chat_messaging_system.sql` - Sistema messaggistica (conversations, messages, participants)
7. `006_announcements_system.sql` - Sistema annunci (announcements, announcement_views)
8. `007_email_system.sql` - Sistema email (email_logs, email_templates, email_unsubscribes)
9. `008_profile_enhancements.sql` - Miglioramenti profili
10. `010_simplified_tournament_system.sql` - Sistema tornei semplificato (tournament_type, start_date/end_date)
11. `011_make_dates_optional.sql` - Date tornei opzionali
12. `012_tournament_matches_bracket_columns.sql` - Colonne bracket per match
13. `013_tennis_scoring_system.sql` - Sistema scoring con sets array e best_of
14. `add_profile_fields.sql` - Campi aggiuntivi profiles (phone, date_of_birth, address, city, postal_code, notes)
15. `add_hero_content.sql` - Contenuti hero section
16. `add_hero_images.sql` - Immagini carousel hero
17. `add_news_table.sql` - Tabella news
18. `add_tornei_to_homepage_sections.sql` - Sezione tornei in homepage
19. `create_courses_table.sql` - Tabella corsi
20. `complete_migration.sql` - Migration completa finale

---

## Backup e Restore

```sql
-- Backup completo
pg_dump -U postgres -d tennis_academy > backup.sql

-- Restore
psql -U postgres -d tennis_academy < backup.sql
```

---

## Performance Tips

1. Usa indici su colonne frequentemente interrogate (`starts_at`, `status`, `competition_type`)
2. Per query complesse sui tornei, considera materialized views
3. Usa `EXPLAIN ANALYZE` per ottimizzare query lente
4. Limita le query con `LIMIT` quando possibile

---

## Esempi Query Avanzate

### Dashboard Admin - Statistiche Tornei

```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'Aperto') AS tornei_attivi,
  COUNT(*) FILTER (WHERE status = 'Concluso') AS tornei_conclusi,
  COUNT(DISTINCT tp.user_id) AS partecipanti_totali,
  SUM(tp.matches_played) AS match_totali
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
WHERE t.created_at >= NOW() - INTERVAL '1 year';
```

### Ranking Giocatori (ultimi 6 mesi)

```sql
SELECT 
  p.full_name,
  COUNT(DISTINCT tp.tournament_id) AS tornei_giocati,
  SUM(tp.matches_won) AS vittorie,
  SUM(tp.matches_played) AS partite,
  ROUND(100.0 * SUM(tp.matches_won) / NULLIF(SUM(tp.matches_played), 0), 1) AS win_rate
FROM tournament_participants tp
JOIN profiles p ON tp.user_id = p.id
JOIN tournaments t ON tp.tournament_id = t.id
WHERE t.start_date >= NOW() - INTERVAL '6 months'
GROUP BY p.id, p.full_name
ORDER BY win_rate DESC, tornei_giocati DESC
LIMIT 20;
```

### Prossimi Match di un Torneo

```sql
SELECT 
  tm.round_name,
  tm.scheduled_time,
  tm.court_number,
  p1.full_name AS player1,
  p2.full_name AS player2,
  tm.match_status
FROM tournament_matches tm
JOIN tournament_participants tp1 ON tm.player1_id = tp1.id
JOIN tournament_participants tp2 ON tm.player2_id = tp2.id
JOIN profiles p1 ON tp1.user_id = p1.id
JOIN profiles p2 ON tp2.user_id = p2.id
WHERE tm.tournament_id = 'tournament-uuid'
AND tm.match_status IN ('scheduled', 'in_progress')
ORDER BY tm.scheduled_time;
```

---

## Contatti e Supporto

Per domande sul database, contatta l'amministratore di sistema o consulta la documentazione Supabase: https://supabase.com/docs
