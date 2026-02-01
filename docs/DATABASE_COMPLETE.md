# Database Documentation - GST Tennis Academy

**Ultima revisione**: 31 Gennaio 2026  
**Database**: PostgreSQL via Supabase  
**Versione Schema**: 2.1  
**Migrations**: 001-021b (tutte applicate)

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Tabelle Principali](#tabelle-principali)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [Functions e Triggers](#functions-e-triggers)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Panoramica

Il database utilizza **PostgreSQL 15+** tramite Supabase con:

- ✅ **Row Level Security (RLS)** abilitato su tutte le tabelle
- ✅ **Type Safety** con TypeScript types generati
- ✅ **Real-time subscriptions** per chat e notifiche
- ✅ **Foreign Key Constraints** per integrità referenziale
- ✅ **Exclusion Constraints** per prevenire doppie prenotazioni
- ✅ **Stored Procedures** per business logic complessa
- ✅ **Indexes** ottimizzati per query performance

### Statistiche Database

| Categoria | Count |
|-----------|-------|
| **Tabelle** | 28+ |
| **Policies RLS** | 150+ |
| **Functions** | 25+ |
| **Indexes** | 80+ |
| **Migrations** | 27 |

---

## Architettura

### System Roles

```typescript
type UserRole = "atleta" | "maestro" | "gestore" | "admin";
```

**Gerarchia Permessi**:
```
admin > gestore > maestro > atleta
```

| Ruolo | Dashboard | Permessi Principali |
|-------|-----------|---------------------|
| **atleta** | `/dashboard/atleta` | Prenotazioni proprie, iscrizione tornei, chat |
| **maestro** | `/dashboard/maestro` | + Gestione lezioni, view tutte prenotazioni |
| **gestore** | `/dashboard/admin` | + Gestione utenti (no admin), creazione account |
| **admin** | `/dashboard/admin` | + Controllo completo, creazione admin |

### Security Model

```sql
-- Example: booking read policy
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins/Gestori view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestore', 'maestro')
    )
  );
```

---

## Tabelle Principali

### 1. Profiles (Utenti)

**Schema**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'atleta',
  subscription_type TEXT,
  
  -- Anagrafica
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  
  -- Preferenze
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  
  -- Sistema
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profiles_role_idx ON profiles(role);
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_created_at_idx ON profiles(created_at);
```

**RLS Policies**:
- ✅ `view_own_profile` - Utenti vedono solo il proprio profilo
- ✅ `admins_view_all_profiles` - Admin/Gestore vedono tutti
- ✅ `admins_manage_profiles` - Admin/Gestore possono creare/modificare
- ✅ `search_profiles` - Authenticated users possono cercare (per chat)

---

### 2. Bookings (Prenotazioni)

**Schema**:
```sql
CREATE TYPE booking_type AS ENUM ('campo', 'lezione_privata', 'lezione_gruppo');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users ON DELETE SET NULL,
  court TEXT NOT NULL,
  type booking_type NOT NULL DEFAULT 'campo',
  status booking_status NOT NULL DEFAULT 'pending',
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Confirmation system (multi-livello)
  confirmed_by_user BOOLEAN DEFAULT false,
  confirmed_by_admin BOOLEAN DEFAULT false,
  confirmed_by_coach BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bookings_time_check CHECK (end_time > start_time),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    court WITH =,
    tstzrange(start_time, end_time) WITH &&
    WHERE (status != 'cancelled')
  )
);

CREATE INDEX bookings_user_idx ON bookings(user_id);
CREATE INDEX bookings_court_time_idx ON bookings(court, start_time);
CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX bookings_coach_idx ON bookings(coach_id);
```

**Features Speciali**:
- 🔒 **Exclusion Constraint** previene sovrapposizioni automaticamente
- ⏰ **Real-time validation** su slot availability
- ✅ **Sistema conferme multi-livello** (user, admin, coach)
- 📧 **Trigger email automatiche** su conferma/cancellazione

---

### 3. Court Blocks (Blocco Campi)

**Schema**:
```sql
CREATE TABLE court_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  
  -- Recurring blocks
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date DATE,
  
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT court_blocks_time_check CHECK (end_time > start_time),
  CONSTRAINT court_blocks_no_overlap EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

CREATE INDEX court_blocks_court_time_idx ON court_blocks(court_id, start_time);
```

**Helper Function**:
```sql
CREATE FUNCTION is_court_blocked(
  p_court_id text,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM court_blocks
    WHERE court_id = p_court_id
    AND start_time < p_end_time
    AND end_time > p_start_time
  );
$$ LANGUAGE sql STABLE;
```

---

### 4. Tournaments (Tornei)

**Schema**:
```sql
CREATE TYPE competition_type AS ENUM (
  'eliminazione_diretta',
  'girone_eliminazione',
  'campionato'
);

CREATE TYPE competition_format AS ENUM ('singolo', 'doppio');
CREATE TYPE tournament_status AS ENUM ('upcoming', 'registration_open', 'registration_closed', 'in_progress', 'completed');

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  competition_type competition_type NOT NULL,
  competition_format competition_format NOT NULL DEFAULT 'singolo',
  max_participants INTEGER NOT NULL,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  registration_deadline DATE,
  
  -- Status
  status tournament_status DEFAULT 'upcoming',
  
  -- Metadata
  entry_fee DECIMAL(10,2),
  prize TEXT,
  rules TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tournaments_status_idx ON tournaments(status);
CREATE INDEX tournaments_start_date_idx ON tournaments(start_date);
CREATE INDEX tournaments_type_idx ON tournaments(competition_type);
```

**Valid Bracket Sizes**: 2, 4, 8, 16, 32, 64, 128

---

### 5. Tournament Participants (Iscrizioni)

**Schema**:
```sql
CREATE TYPE participant_status AS ENUM ('registered', 'confirmed', 'withdrawn', 'eliminated');

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Doppio support
  partner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  
  -- Status
  status participant_status DEFAULT 'registered',
  seed INTEGER,
  
  -- Timestamps
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX tournament_participants_tournament_idx ON tournament_participants(tournament_id);
CREATE INDEX tournament_participants_user_idx ON tournament_participants(user_id);
CREATE INDEX tournament_participants_status_idx ON tournament_participants(status);
```

---

### 6. Tournament Matches (Partite)

**Schema**:
```sql
CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  
  -- Participants
  player1_id UUID REFERENCES tournament_participants,
  player2_id UUID REFERENCES tournament_participants,
  
  -- Bracket structure
  round INTEGER NOT NULL,
  match_number INTEGER,
  next_match_id UUID REFERENCES tournament_matches,
  
  -- Tennis scoring
  winner_id UUID REFERENCES tournament_participants,
  sets JSONB, -- [{"player1": 6, "player2": 4}, ...]
  status match_status DEFAULT 'scheduled',
  
  -- Metadata
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  court TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tournament_matches_tournament_idx ON tournament_matches(tournament_id);
CREATE INDEX tournament_matches_round_idx ON tournament_matches(round);
CREATE INDEX tournament_matches_status_idx ON tournament_matches(status);
```

**Tennis Scoring Format**:
```json
{
  "sets": [
    {"player1": 6, "player2": 4},
    {"player1": 3, "player2": 6},
    {"player1": 7, "player2": 5}
  ],
  "winner_id": "uuid-player1"
}
```

---

### 7. Messages (Chat)

**Schema**:
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users ON DELETE CASCADE,
  group_id UUID REFERENCES chat_groups ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  
  -- Attachments
  attachment_url TEXT,
  attachment_type TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT message_has_destination CHECK (
    (recipient_id IS NOT NULL AND group_id IS NULL) OR
    (recipient_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX messages_sender_idx ON messages(sender_id);
CREATE INDEX messages_recipient_idx ON messages(recipient_id);
CREATE INDEX messages_group_idx ON messages(group_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);
CREATE INDEX messages_unread_idx ON messages(recipient_id, read) WHERE read = false;
```

**Real-time Subscription**:
```typescript
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `recipient_id=eq.${userId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe();
```

---

### 8. Invite Codes (Codici Invito)

**Schema**:
```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  
  -- Usage limits
  max_uses INTEGER,
  uses_remaining INTEGER,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Tracking
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX invite_codes_code_idx ON invite_codes(code);
CREATE INDEX invite_codes_role_idx ON invite_codes(role);
```

**Validation Function**:
```sql
CREATE FUNCTION validate_invite_code(p_code text)
RETURNS TABLE (valid boolean, role text, error_message text)
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite FROM invite_codes WHERE code = upper(p_code);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::text, 'Codice non valido';
    RETURN;
  END IF;
  
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT false, null::text, 'Codice scaduto';
    RETURN;
  END IF;
  
  IF v_invite.uses_remaining IS NOT NULL AND v_invite.uses_remaining <= 0 THEN
    RETURN QUERY SELECT false, null::text, 'Codice esaurito';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_invite.role, null::text;
END;
$$ LANGUAGE plpgsql;
```

---

### 9. Activity Log (Audit Trail)

**Schema**:
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_log_user_idx ON activity_log(user_id);
CREATE INDEX activity_log_action_idx ON activity_log(action);
CREATE INDEX activity_log_entity_idx ON activity_log(entity_type, entity_id);
CREATE INDEX activity_log_created_idx ON activity_log(created_at);
```

**Common Actions**:
- `login`, `logout`, `signup`
- `booking_created`, `booking_confirmed`, `booking_cancelled`
- `tournament_created`, `tournament_joined`
- `message_sent`, `profile_updated`
- `invite_code_created`, `invite_code_used`

---

### 10. Email System

**Schema**:
```sql
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');

CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status email_status DEFAULT 'pending',
  
  -- Resend integration
  resend_id TEXT UNIQUE,
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX emails_recipient_idx ON emails(recipient);
CREATE INDEX emails_status_idx ON emails(status);
CREATE INDEX emails_resend_id_idx ON emails(resend_id);
CREATE INDEX emails_created_at_idx ON emails(created_at);
```

**Available Templates**:
1. `booking_confirmation` - Conferma prenotazione
2. `booking_reminder` - Promemoria prenotazione
3. `booking_cancelled` - Cancellazione prenotazione
4. `tournament_registration` - Iscrizione torneo
5. `tournament_start_reminder` - Promemoria inizio torneo
6. `match_scheduled` - Partita programmata
7. `welcome` - Benvenuto nuovo utente
8. `password_reset` - Reset password
9. `invoice` - Fattura pagamento
10. `course_enrollment` - Iscrizione corso
11. `admin_notification` - Notifica admin

---

## Row Level Security (RLS)

### Policy Patterns

#### Pattern 1: Own Resources
```sql
-- User can only access their own data
CREATE POLICY "Users access own data"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Pattern 2: Admin Override
```sql
-- Admins/Gestori can access all data
CREATE POLICY "Admins access all data"
  ON table_name
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestore')
    )
  );
```

#### Pattern 3: Public Read, Authenticated Write
```sql
-- Anyone can read, only authenticated can write
CREATE POLICY "Public read"
  ON table_name
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated write"
  ON table_name
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

#### Pattern 4: Time-based Access
```sql
-- Only future bookings can be modified
CREATE POLICY "Modify future bookings only"
  ON bookings
  FOR UPDATE
  USING (
    start_time > now()
    AND (auth.uid() = user_id OR is_admin(auth.uid()))
  );
```

### Common RLS Functions

```sql
-- Check if user is admin or gestore
CREATE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('admin', 'gestore')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is coach (maestro or above)
CREATE FUNCTION is_coach(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('maestro', 'gestore', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Functions e Triggers

### Auto-update Timestamps

```sql
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Send Email on Booking Confirmation

```sql
CREATE FUNCTION send_booking_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO emails (recipient, subject, template_name, metadata)
    VALUES (
      (SELECT email FROM profiles WHERE id = NEW.user_id),
      'Prenotazione Confermata',
      'booking_confirmation',
      jsonb_build_object(
        'booking_id', NEW.id,
        'court', NEW.court,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_confirmation_email
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_booking_confirmation();
```

---

## Migration Guide

### Ordine di Esecuzione

Eseguire le migration in ordine numerico:

```bash
# 1. Schema base
psql < migrations/001_create_tournaments_and_participants.sql
psql < migrations/002_rls_policies_tournaments.sql

# 2. Feature addizionali
psql < migrations/003_add_competition_types.sql
...
psql < migrations/021b_video_lessons.sql

# 3. Verificare integrità
psql < scripts/utilities/VERIFY_SCHEMA_INTEGRITY.sql
```

### Rollback Strategy

⚠️ **IMPORTANTE**: Fare sempre backup prima di migration:

```bash
# Backup
pg_dump database_name > backup_$(date +%Y%m%d).sql

# Rollback (se necessario)
psql database_name < backup_20260131.sql
```

---

## Best Practices

### 1. Query Optimization

✅ **DO**:
```typescript
// Use indexes
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('court', 'Campo 1')
  .gte('start_time', startDate)
  .order('start_time');
```

❌ **DON'T**:
```typescript
// Avoid fetching all then filtering in JS
const { data } = await supabase
  .from('bookings')
  .select('*');
const filtered = data.filter(b => b.court === 'Campo 1');
```

### 2. RLS Best Practices

✅ **DO**:
```sql
-- Use indexes on RLS filter columns
CREATE INDEX profiles_role_idx ON profiles(role);

-- Use SECURITY DEFINER carefully
CREATE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER STABLE;
```

❌ **DON'T**:
```sql
-- Avoid recursive RLS checks
CREATE POLICY "Bad policy"
  ON table1
  USING (
    EXISTS (
      SELECT 1 FROM table2
      WHERE EXISTS (SELECT 1 FROM table1 ...) -- Recursion!
    )
  );
```

### 3. Data Integrity

✅ **DO**:
```sql
-- Use constraints
CONSTRAINT bookings_time_check CHECK (end_time > start_time)
CONSTRAINT bookings_no_overlap EXCLUDE USING gist (...)
```

✅ **DO**:
```sql
-- Use foreign keys
coach_id UUID REFERENCES auth.users ON DELETE SET NULL
tournament_id UUID REFERENCES tournaments ON DELETE CASCADE
```

### 4. Performance

- **Batch Operations**: Usa `.upsert()` per multiple insert
- **Select Specific Fields**: `select('id, name')` non `select('*')`
- **Use Limit**: Sempre limitare risultati con `.limit(100)`
- **Pagination**: Usa `.range(start, end)` per grandi dataset

---

## Troubleshooting

### Issue: RLS Infinite Recursion

**Symptoms**: Query timeout, high CPU usage

**Solution**:
```sql
-- Run fix script
\i scripts/fixes/FIX_ALL_RLS_RECURSION.sql
```

### Issue: Foreign Key Violation

**Symptoms**: `violates foreign key constraint`

**Solution**:
```sql
-- Check orphaned records
SELECT * FROM bookings
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up
DELETE FROM bookings WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### Issue: Performance Degradation

**Solution**:
```sql
-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE court = 'Campo 1'
AND start_time > now();

-- Add missing index
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- Vacuum database
VACUUM ANALYZE;
```

### Issue: Migration Failed

**Solution**:
```sql
-- Check migration status
SELECT * FROM _migrations ORDER BY applied_at DESC;

-- Rollback from backup
psql database < backup.sql

-- Reapply migration
\i migrations/XXX_migration_name.sql
```

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Project README](../README.md)
- [API Documentation](./API.md)

---

**Maintained by**: GST Tennis Academy Dev Team  
**Last Updated**: 31 January 2026  
**Questions?**: Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) o contatta il team
