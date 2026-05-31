# Database

Schema completo del database **Supabase / PostgreSQL** di GST Tennis Academy.
Comprende ~50 tabelle, funzioni e trigger, policy RLS, storage bucket e 62 migrazioni.

---

## Estensioni

| Estensione | Uso |
|------------|-----|
| `pgcrypto` | Generazione UUID, cifratura |
| `btree_gist` | Vincolo anti-sovrapposizione prenotazioni (GIST) |

---

## Tabelle

### Utenti e profili

#### `profiles`
Profilo utente e gestione ruolo. PK `id` (→ `auth.users`).
Campi chiave: `email` (unique), `full_name`, `role` (`atleta`/`maestro`/`gestore`/`admin`),
`subscription_type`, `bio`, `birth_date`, `skill_level`, `tennis_stats` (JSONB),
`emergency_contact` (JSONB), `preferred_times` (array), `profile_completion_percentage`,
`social_media` (JSONB). **RLS**: utente vede il proprio profilo, lo staff vede tutto,
i maestri vedono gli atleti, tutti gli autenticati possono cercare profili per la messaggistica.

#### `athlete_stats`
Statistiche tennistiche dettagliate dell'atleta (1:1 con `profiles`).
Match (giocati/vinti/persi, win rate), set e game, statistiche di servizio (ace, doppi falli,
% prima), risposta, qualità dei punti (winner, errori non forzati), streak, attività.

#### `recruitment_applications`
Candidature per posizioni `maestro` / `personale` (chiunque può inserire, staff legge).

### Prenotazioni e campi

#### `bookings`
Prenotazioni campi e lezioni. Campi: `user_id`, `coach_id`, `court`,
`type` (`campo`/`lezione_privata`/`lezione_gruppo`), `start_time`, `end_time`, `status`,
`coach_confirmed`, `manager_confirmed`, `notes`, `created_by`.
**Vincoli**: `end_time > start_time`; **`bookings_no_overlap`** (GIST) impedisce sovrapposizioni
sullo stesso campo. **RLS**: utente vede le proprie, il coach quelle assegnate, lo staff tutte.

#### `booking_participants`
Più atleti per una stessa prenotazione (max 4). Campi: `booking_id`, `user_id`, `full_name`,
`email`, `phone`, `is_registered`, `participant_type` (`atleta`/`ospite`), `order_index` (0–3).
Trigger di limite a 4 partecipanti; unique `(booking_id, order_index)`.

#### `courts_settings`
Configurazione campi (`court_name` unique, `display_order`, `is_active`). Default: 4 campi.

#### `court_blocks`
Blocco di fasce orarie su un campo (range, motivo, ricorrenza, `is_disabled`).

### Corsi e lezioni

| Tabella | Scopo |
|---------|-------|
| `courses` | Corsi di gruppo: coach, date, `schedule_periods` (JSONB), capienza, prezzo, livello, fascia d'età, `court_name`, `created_by` |
| `course_enrollments` | Iscrizioni (con `fee` e supporto ospiti); unique `(course_id, user_id)` |
| `lesson_attendance` | Presenze per lezione (`lesson_date`, `present`); supporto ospiti |
| `courses_cancelled_dates` | Date di lezione annullate |
| `courses_extra_dates` | Date di lezione extra |
| `lesson_time_overrides` | Override orario per una data specifica |

### Tornei

#### `tournaments`
Tornei e campionati. Campi: `title`, date, `max_participants`, `status`
(`Aperto`/`In Corso`/`Concluso`/`Annullato`), `competition_type` (`torneo`/`campionato`),
`format` (`eliminazione_diretta`/`round_robin`/`girone_eliminazione`),
`match_format` (`best_of_1/3/5`), `surface_type`, `current_stage`, `rounds_data`/`groups_data`/`standings` (JSONB),
`entry_fee`, `prize_money`, `created_by`.

#### `tournament_participants`
Iscrizioni ai tornei. Campi: `tournament_id`, `user_id`, `seed`, `group_id`, `group_name`,
`stats` (JSONB: match, set, game, punti); unique `(tournament_id, user_id)`.

#### `tournament_groups`
Gironi per i tornei a fase a gruppi (`group_name`, `group_order`, `max_participants`,
`advancement_count`).

#### `tournament_matches`
Partite con punteggio tennis. Campi: `round_name`, `stage` (`groups`/`knockout`),
`player1_id`/`player2_id`, `player1_sets`/`player2_sets`, `score_detail` (JSONB set-per-set),
`winner_id`, `match_status`, orari, `court_number`, `surface_type`, `stats` (JSONB).

### Arena

#### `arena_challenges`
Sfide 1v1 tra giocatori. Campi: `challenger_id`, `opponent_id`,
`status` (`pending`/`accepted`/`declined`/`completed`/`cancelled`/`counter_proposal`/`awaiting_score`),
`scheduled_date`, `court`, `booking_id`, `message`, `winner_id`, `score`.
**Vincoli**: sfidante ≠ avversario; se `completed` richiede `winner_id`.
Trigger di aggiornamento statistiche al completamento.

#### `arena_stats`
Ranking e statistiche Arena (PK `user_id`). Campi: `ranking`, `points`, `total_matches`,
`wins`, `losses`, `win_rate`, `sets_won`, `current_streak`, `longest_win_streak`,
`level` (`Bronzo`/`Argento`/`Oro`/`Platino`/`Diamante`). **RLS**: lettura pubblica (classifica),
modifica admin/gestore. Vedi [ARENA.md](ARENA.md) per il sistema punti.

### Eventi

| Tabella | Scopo |
|---------|-------|
| `events` | Eventi/attività sociali (`event_type`: `torneo`/`evento_sociale`/`workshop`/`camp`) |
| `event_registrations` | Iscrizioni agli eventi con `status` e `payment_status` |

### Comunicazione

| Tabella | Scopo |
|---------|-------|
| `conversations` | Conversazioni dirette e di gruppo (`is_group`, `last_message_at`, anteprima) |
| `conversation_participants` | Membri conversazione (`unread_count`, `last_read_at`, `is_admin`, `is_muted`) |
| `messages` | Messaggi chat (`message_type`, allegati, reply, edit/delete soft) |
| `message_reads` | Stato lettura per messaggio |
| `chat_groups` / `chat_group_members` | Chat di gruppo con ruoli (`admin`/`member`) |
| `internal_messages` | Messaggi diretti 1:1 con oggetto e thread (sistema legacy) |
| `user_presence` | Stato online/offline/away/busy con `last_seen` |
| `typing_indicators` | Indicatori "sta scrivendo" in tempo reale |

### News e annunci

| Tabella | Scopo |
|---------|-------|
| `news` | Articoli/news con categoria, immagine, stato pubblicazione |
| `announcements` | Annunci/bacheca con priorità, visibilità per ruolo, scadenza, pinning, `view_count` |
| `announcement_views` | Tracciamento visualizzazioni annunci (trigger incrementa il contatore) |

### Notifiche

#### `notifications`
Notifiche in-app per utente (`type`: `info`/`success`/`warning`/`error`, `title`, `message`,
`link`, `is_read`).

### Pagamenti e commercio

| Tabella | Scopo |
|---------|-------|
| `services` | Servizi offerti (lezione privata/gruppo, corso, campo) con prezzo e durata |
| `products` | Prodotti shop |
| `orders` | Ordini shop (creati via webhook) |
| `payments` | Transazioni (`payment_type`: subscription/booking/course/event/product; `status`; supporto ospiti) |
| `subscription_credits` | Crediti settimanali per le lezioni di gruppo |

### Email, log e video

| Tabella | Scopo |
|---------|-------|
| `email_logs` | Audit trail email (stato, provider, message id, timestamp apertura/click) |
| `email_templates` | Gestione template email |
| `email_settings` | Configurazione email |
| `email_unsubscribes` | Preferenze di disiscrizione (`all`/`marketing`/`notifications`) |
| `activity_log` | Audit completo delle azioni utente (action, entity, metadata, IP, user agent) |
| `video_lessons` | Video lezioni (URL, durata, note, creatore) |
| `video_assignments` | Assegnazione video agli atleti con tracciamento visualizzazione |

---

## Funzioni e trigger principali

### Funzioni core

| Funzione | Descrizione |
|----------|-------------|
| `get_my_role()` | **SECURITY DEFINER** — restituisce il ruolo dell'utente corrente senza ricorsione RLS |
| `update_updated_at_column()` | Trigger generico per aggiornare `updated_at` |
| `handle_new_user()` | Crea automaticamente il profilo alla registrazione (trigger `on_auth_user_created`) |
| `check_booking_participants_limit()` | Impedisce più di 4 partecipanti per prenotazione |
| `calculate_profile_completion(id)` | Calcola la percentuale di completamento del profilo |

### Funzioni di dominio

| Funzione | Descrizione |
|----------|-------------|
| `update_arena_stats_on_challenge_complete()` | Aggiorna stats, punti, ranking e livello al completamento di una sfida Arena |
| `calculate_group_standings(group_uuid)` | Calcola la classifica di un girone (punti, set/game diff, scontri diretti) |
| `reset_weekly_credits()` | Reimposta i crediti settimanali (lezioni di gruppo) |
| `consume_group_credit(user_id)` | Consuma un credito per la partecipazione a una lezione di gruppo |
| `is_user_unsubscribed(email, category)` | Verifica disiscrizione email |
| `get_email_stats(start, end)` | Statistiche email per intervallo |
| `increment_announcement_views()` | Incrementa il contatore visualizzazioni annunci |
| `cleanup_old_typing_indicators()` | Rimuove gli indicatori di digitazione obsoleti |

---

## Row Level Security (RLS)

La sicurezza a livello di riga è abilitata su tutte le tabelle sensibili. L'autorizzazione
si basa sulla funzione **`public.get_my_role()`** (`SECURITY DEFINER`, evita la ricorsione
infinita delle policy).

### Pattern principali

| Pattern | Implementazione | Esempi |
|---------|-----------------|--------|
| Self + admin | `auth.uid() = id OR get_my_role() IN ('admin','gestore')` | profiles, notifications, payments |
| Basato sul ruolo | `get_my_role() IN ('admin','gestore','maestro')` | gestione contenuti, impostazioni |
| Relazionale | `auth.uid() = user_id OR auth.uid() = coach_id` | bookings, messages |
| Pubblico in lettura | `is_active = true` + override staff | courses, services, events |
| Visibilità broadcast | enum `visibility` + match ruolo | announcements |
| Classifica pubblica | `USING (true)` | arena_stats |

> **Prevenzione ricorsione**: le policy non leggono direttamente `profiles` ma usano
> `get_my_role()` in `SECURITY DEFINER`. Le migrazioni 016, 017, 020b, 029, 036 hanno
> consolidato questo approccio.

---

## Storage bucket

| Bucket | Scopo | Note |
|--------|-------|------|
| `chat-attachments` | Allegati dei messaggi | Upload autenticato; cancellazione per cartella `auth.uid()` |
| `certificates` | Certificati medici/PDF | Limite 10 MB, solo `application/pdf`; insert/delete admin/gestore |
| `images/` (public) | Logo e branding | In `public/images/` |
| Video lessons | Registrazioni video | URL in `video_lessons` |

---

## Elenco migrazioni

Le migrazioni si trovano in `supabase/migrations/` e vanno applicate in ordine numerico.

| # | File | Descrizione |
|---|------|-------------|
| 001 | create_tournaments_and_participants | Tabelle base tornei |
| 002 | rls_policies_tournaments | Policy RLS tornei |
| 003 | add_competition_types | Enum `competition_type`/`format`, colonne JSONB |
| 004 | tennis_tournament_system | `tournament_groups`, `tournament_matches`, scoring tennis |
| 005 | chat_messaging_system | `conversations`, `messages`, `message_reads` |
| 006 | announcements_system | Annunci + tracciamento viste |
| 006b | create_messages_system | `internal_messages` (1:1) |
| 007 | allow_users_search | RLS ricerca profili |
| 007b | email_system | `email_logs`, `email_templates`, `email_settings`, `email_unsubscribes` |
| 008 | profile_enhancements | Campi profilo estesi + `athlete_stats` |
| 008b | tournament_start_notifications | Notifica avvio torneo |
| 009 | allow_authenticated_create_notifications | RLS creazione notifiche |
| 010 | simplified_tournament_system | Tipi torneo semplificati, gestione fasi |
| 011 | make_dates_optional | Date torneo opzionali |
| 012 | tournament_matches_bracket_columns | Colonne bracket |
| 013 | tennis_scoring_system | Formattazione punteggio match |
| 014 | add_booking_confirmation_columns | `coach_confirmed`, `manager_confirmed` |
| 015 | add_profiles_rls_for_bookings | RLS profili per prenotazioni |
| 015 | dashboard_refactor_features_SAFE | Refactoring funzioni dashboard |
| 016 | fix_rls_infinite_recursion | Fix ricorsione RLS (SECURITY DEFINER) |
| 017 | fix_all_remaining_rls | Revisione completa policy RLS |
| 018 | chat_storage | Bucket `chat-attachments` + RLS |
| 019 | add_email_notifications_preference | Preferenza notifiche email |
| 020 | add_user_presence_system | `user_presence`, `typing_indicators` |
| 020b | fix_rls_security | Hardening RLS |
| 021 | add_promo_banner_settings | Impostazioni banner promozionale |
| 021b | video_lessons | Tabella `video_lessons` |
| 022 | fix_recruitment_applications | Fix candidature |
| 023 | create_email_campaigns | Campagne email |
| 024 | create_activity_log | `activity_log` (audit) |
| 025 | create_email_log | Audit email |
| 026 | create_courts_settings | `courts_settings` + 4 campi default |
| 027 | create_video_assignments | `video_assignments` |
| 028 | chat_groups | `chat_groups`, `chat_group_members` |
| 029 | fix_chat_groups_rls | Fix RLS chat di gruppo |
| 030 | fix_profiles_insert_rls | Fix RLS insert profili |
| 031 | add_handle_new_user_trigger | Trigger auto-creazione profilo |
| 032 | add_booking_participants | `booking_participants` (1–4 atleti) |
| 033 | add_phone_to_booking_participants | Campo `phone` partecipanti |
| 034 | create_email_logs_table_if_missing | Garanzia esistenza `email_logs` |
| 035 | support_external_players | Supporto giocatori ospiti nelle prenotazioni |
| 036 | fix_all_rls_recursion_comprehensive | Fix completo ricorsione RLS |
| 037 | add_notes_to_video_lessons | Note video |
| 038 | allow_maestro_video_assignments | Permessi maestro su assegnazioni video |
| 039 | allow_maestro_delete_own_video_lessons | Maestro elimina i propri video |
| 040 | add_is_disabled_to_court_blocks | `is_disabled` su blocchi campo |
| 041 | add_awaiting_score_to_arena_challenges | Stato `awaiting_score` Arena |
| 042 | fix_arena_challenges_status_constraint_awaiting_score | Fix vincolo stato Arena |
| 043 | fix_handle_new_user_trigger | Fix trigger creazione utente |
| 044 | add_created_by_to_bookings | `created_by` su prenotazioni |
| 045 | update_arena_points_system | Sistema punti Arena basato sul risultato |
| 046 | add_sets_won_to_arena_stats | `sets_won` + trigger aggiornato |
| 047 | add_bookings_no_overlap_constraint | Vincolo GIST anti-sovrapposizione |
| 048 | add_court_name_to_courses | `court_name` sui corsi |
| 049 | create_course_enrollments | `course_enrollments` |
| 050 | create_lesson_attendance | `lesson_attendance` |
| 051 | add_fee_to_course_enrollments | Quota iscrizione |
| 052 | create_payments_table | `payments` |
| 053 | create_certificates_bucket | Bucket `certificates` |
| 054 | course_enrollments_guest_support | Iscrizioni corsi per ospiti |
| 055 | lesson_attendance_guest_support | Presenze per ospiti |
| 056 | courses_schedule_periods | Programmazione multi-periodo |
| 057 | courses_cancelled_dates | Date annullate |
| 058 | courses_extra_dates | Date extra |
| 060 | courses_lesson_time_overrides | Override orario lezione |
| 061 | courses_created_by | `created_by` sui corsi |
| 062 | payments_guest_support | Pagamenti per ospiti |
