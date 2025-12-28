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
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  category TEXT,
  level TEXT,
  max_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aperto', -- 'Aperto', 'Concluso'
  
  -- Tipo competizione
  competition_type competition_type DEFAULT 'torneo' NOT NULL, -- 'torneo', 'campionato'
  format competition_format DEFAULT 'eliminazione_diretta' NOT NULL, -- 'eliminazione_diretta', 'round_robin', 'girone_eliminazione'
  
  -- Tennis specifico
  match_format VARCHAR(50) DEFAULT 'best_of_3', -- 'best_of_1', 'best_of_3', 'best_of_5'
  surface_type VARCHAR(50) DEFAULT 'terra', -- 'terra', 'erba', 'cemento', 'sintetico', 'indoor', 'carpet'
  
  -- Dati strutturali
  rounds_data JSONB DEFAULT '[]'::jsonb,
  groups_data JSONB DEFAULT '[]'::jsonb,
  standings JSONB DEFAULT '[]'::jsonb,
  
  -- Stage management
  has_groups BOOLEAN DEFAULT false,
  current_stage VARCHAR(50) DEFAULT 'registration', -- 'registration', 'groups', 'knockout', 'completed', 'cancelled'
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Tipi di Competizione:**

1. **Torneo Eliminazione Diretta** (`competition_type='torneo'`, `format='eliminazione_diretta'`)
   - Bracket ad eliminazione diretta
   - max_participants: 2, 4, 8, 16, 32, 64, 128

2. **Torneo Gironi + Eliminazione** (`competition_type='torneo'`, `format='girone_eliminazione'`)
   - Fase a gironi seguita da eliminazione diretta
   - I migliori di ogni girone avanzano al knockout

3. **Campionato Round-Robin** (`competition_type='campionato'`, `format='round_robin'`)
   - Tutti giocano contro tutti
   - Classifica finale basata su punti/set/game

**Esempi Query:**

```sql
-- Tornei attivi
SELECT * FROM tournaments WHERE status = 'Aperto' AND starts_at > NOW() ORDER BY starts_at;

-- Tornei di eliminazione diretta
SELECT * FROM tournaments WHERE format = 'eliminazione_diretta';

-- Campionati in corso
SELECT * FROM tournaments WHERE competition_type = 'campionato' AND status = 'Aperto';

-- Tornei su terra battuta
SELECT * FROM tournaments WHERE surface_type = 'terra';

-- Creare nuovo torneo
INSERT INTO tournaments (title, description, starts_at, ends_at, max_participants, competition_type, format, match_format, surface_type, category)
VALUES (
  'Open Estate 2026',
  'Torneo su terra battuta per tutti i livelli',
  '2026-07-01 09:00:00+00',
  '2026-07-07 18:00:00+00',
  16,
  'torneo',
  'eliminazione_diretta',
  'best_of_3',
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
  score_detail JSONB DEFAULT '{"sets": []}'::jsonb,
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

### 3. Tabella `news`

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

- **Public read**: Tornei, news, staff, programs sono visibili a tutti
- **Authenticated write**: Solo utenti autenticati possono prenotare
- **Admin/Gestore write**: Solo admin e gestori possono creare/modificare tornei
- **Own data**: Gli utenti possono modificare solo i propri dati

---

## Migration Flow

1. `001_create_tournaments_and_participants.sql` - Tabelle base tornei
2. `002_rls_policies_tournaments.sql` - Policy RLS
3. `003_add_competition_types.sql` - Tipi competizione e formati
4. `004_tennis_tournament_system.sql` - Sistema completo tennis con gruppi e match
5. `005_chat_messaging_system.sql` - Sistema messaggistica
6. `006_announcements_system.sql` - Sistema annunci
7. `007_email_system.sql` - Sistema email
8. `008_profile_enhancements.sql` - Miglioramenti profili
9. `add_placeholder_data.sql` - Dati di esempio

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
WHERE t.starts_at >= NOW() - INTERVAL '6 months'
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
