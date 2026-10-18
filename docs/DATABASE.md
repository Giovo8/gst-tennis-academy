# Database

Schema del database **Supabase (PostgreSQL)** di GST Tennis Academy. Lo schema nasce da `supabase/schema.sql` (base iniziale), dalle migrazioni `supabase/migrations/001–089` e da alcuni script una tantum in `supabase/scripts/` che creano oggetti assenti dalle migrazioni (vedi [Setup da zero](#setup-da-zero)).

> Le migrazioni sono sempre state applicate **a mano dallo SQL Editor** (il progetto non ha `supabase/config.toml` né storico `supabase db push`). L'ordine numerico non coincide sempre con quello reale di applicazione.

## Estensioni

| Estensione               | Dove                            | Uso                                                            |
| ------------------------ | ------------------------------- | -------------------------------------------------------------- |
| `pgcrypto` / `uuid-ossp` | attive di default su Supabase   | `gen_random_uuid()` / `uuid_generate_v4()` per le primary key  |
| `btree_gist`             | migrazione 047                  | Vincolo di esclusione anti-sovrapposizione su `bookings`       |
| `pg_cron`                | migrazioni 063, 082 (opzionale) | Generazione notizie AI schedulata, retention `security_events` |
| `pg_net`                 | migrazione 063 (opzionale)      | Chiamata HTTP dal job cron alla Edge Function `genera-news`    |

## Enum

| Tipo                 | Valori                                                       |
| -------------------- | ------------------------------------------------------------ |
| `user_role`          | `atleta`, `maestro`, `gestore`, `admin`                      |
| `booking_type`       | `campo`, `lezione_privata`, `lezione_gruppo`, `torneo` (084) |
| `competition_type`   | `torneo`, `campionato`                                       |
| `competition_format` | `eliminazione_diretta`, `round_robin`, `girone_eliminazione` |
| `recruitment_role`   | `maestro`, `personale`                                       |
| `recruitment_status` | `pending`, `reviewed`, `accepted`, `rejected`                |

## Tabelle per dominio

### Utenti e profili

| Tabella                            | Colonne chiave / note                                                                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                         | `id` (FK `auth.users`), `email`, `full_name`, `role user_role` (default `atleta`), `avatar_url`, `metadata`; creata automaticamente dal trigger `handle_new_user` (031/043, backfill 067) |
| `staff`                            | Membri staff mostrati nella landing: `full_name`, `role`, `bio`, `image_url`, `order_index`, `active`, link social                                                                        |
| `recruitment_applications`         | Candidature "lavora con noi": `full_name`, `email`, `role recruitment_role`, `message`, `cv_url`, `status`                                                                                |
| `invite_codes`, `invite_code_uses` | Codici invito con `role`, `max_uses`, `uses_remaining`, `expires_at` e log utilizzi                                                                                                       |

### Prenotazioni

| Tabella                | Colonne chiave / note                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bookings`             | `user_id`, `coach_id`, `court`, `type booking_type`, `start_time`/`end_time`, `status` (default `pending`), `coach_confirmed`, `manager_confirmed`, `created_by` (044), `tournament_match_id` (084). **Vincolo di esclusione GIST `bookings_no_overlap`**: stesso campo + intervalli sovrapposti = rifiutato a livello DB. Il trigger `check_booking_tournament_match` (086) valida le prenotazioni di tipo `torneo` |
| `booking_participants` | Fino a **4 partecipanti** per prenotazione: `booking_id`, `user_id` (null per ospiti), `full_name`, `email`, `phone`, `is_registered`, `participant_type`, `order_index` 0–3 (032–035)                                                                                                                                                                                                                               |
| `court_blocks`         | Blocchi campo (manutenzione/eventi): `court_id`, `start_time`/`end_time`, `reason`, `is_disabled` (040), `created_by`                                                                                                                                                                                                                                                                                                |
| `courts_settings`      | Configurazione dei campi (nomi, ordine, attivazione), sorgente per `getCourts()` (026)                                                                                                                                                                                                                                                                                                                               |
| `personal_todos`       | Note personali dell'agenda (081)                                                                                                                                                                                                                                                                                                                                                                                     |

### Tornei

| Tabella                   | Colonne chiave / note                                                                                                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tournaments`             | `title`, `start_date`/`end_date`, `max_participants`, `status`, `competition_type`, `format`, `current_phase` (083, 085), `best_of`, JSONB `rounds_data`, `groups_data`, `standings`                                                           |
| `tournament_participants` | Iscritti: `tournament_id`, `user_id`, seed, statistiche; giocatori esterni (035)                                                                                                                                                               |
| `tournament_groups`       | Gironi (ricreata dalla 010)                                                                                                                                                                                                                    |
| `tournament_matches`      | Struttura della 010 (`phase`, `round_number`, `match_number`, `player1_score`, `status`…) più le colonne bracket della 012 (`stage`, `match_status`, `bracket_position`…) e `sets` JSONB della 013. Il codice usa entrambi i gruppi di colonne |

### Arena (sfide 1v1)

| Tabella            | Colonne chiave / note                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arena_challenges` | `challenger_id`, `opponent_id`, `status` (incl. `counter_proposal`, `awaiting_score`: 041–042), `winner_id`, `score`, `match_format`, `match_type` (singolo/doppio con partner), `challenge_type`, `booking_id` |
| `arena_stats`      | Classifica: punti, vittorie/sconfitte, streak, `sets_won` (046), livello calcolato dai punti (`calculate_arena_level`)                                                                                          |

### Corsi e video-lezioni

| Tabella              | Colonne chiave / note                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `courses`            | Corsi con calendario: `court_name` (048), periodi (056), date annullate (057) ed extra (058), override orario (060) e istruttore (066) per lezione, `created_by` (061) |
| `course_enrollments` | Iscrizioni con quota `fee` (051) e supporto ospiti (054) — migrazione 049                                                                                              |
| `lesson_attendance`  | Presenze per lezione, anche ospiti (050, 055)                                                                                                                          |
| `video_lessons`      | Video-lezioni: titolo, URL, `notes` (037); i maestri gestiscono le proprie (038–039)                                                                                   |
| `video_assignments`  | Assegnazione video ad atleti (027)                                                                                                                                     |

### Chat e messaggistica

| Tabella                             | Colonne chiave / note                              |
| ----------------------------------- | -------------------------------------------------- |
| `internal_messages`                 | Messaggi diretti della chat delle dashboard (006b) |
| `chat_groups`, `chat_group_members` | Gruppi con ruolo membro `admin`/`member` (028–029) |

### News e generatore AI

| Tabella                   | Colonne chiave / note                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `news`                    | Articoli; il modulo AI (063) aggiunge `stato` (`bozza`/`pubblicata`/`scartata`), `ai_generated`, `fonte_url` (dedup), `fonte_nome` |
| `ai_news_config`          | `pubblicazione_auto`, `numero_post` (064)                                                                                          |
| `ai_news_fonti`           | Fonti RSS: `nome`, `url` (unique), `attiva`, `categoria`; 3 fonti seed                                                             |
| `ai_news_cron`            | Schedulazioni: `ora`, `minuto`, `categoria`, `prompt_custom`, `attivo`, `ultimo_eseguito`                                          |
| `ai_news_generation_logs` | Log esecuzioni: `tipo` (`manuale`/`cron`), `generate`, `skippate`, `errori`                                                        |

### Pagamenti, contenuti e log

| Tabella                   | Colonne chiave / note                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `payments`                | Pagamenti (corsi, iscrizioni) con supporto ospiti (052, 062); nessun provider di pagamento integrato                    |
| `notifications`           | Notifiche in-app per utente                                                                                             |
| `activity_log`            | Log attività applicative (024)                                                                                          |
| `security_events`         | Anomalie di sicurezza (082), scritta solo con service role; retention 90 giorni via `purge_security_events()` + pg_cron |
| `email_logs`, `email_log` | Esiti invii Resend: il codice scrive su entrambe (007b/034 e 025)                                                       |

### Oggetti rimossi dalla migrazione 087

La migrazione `087_rimozione_oggetti_non_usati.sql` elimina ciò che nessuna parte di `src/` o `supabase/functions/` usa più:

- **Contabilità** (modulo rimosso dal codice): `listino_prezzi`, `soglie_orario_notturno`, `bookings.prezzo_applicato` col relativo trigger, `courts_settings.hourly_rate`.
- **E-commerce e abbonamenti**: `orders`, `products`, `subscription_credits`, `subscriptions`, `event_registrations`.
- **Vecchia chat**: `chat_rooms`, `chat_room_members`, `chat_messages`.
- **Email marketing**: `email_campaigns`, `email_templates`, `email_settings`, `email_unsubscribes`.
- **Varie**: `announcement_views`, `athlete_stats` (con il trigger su `tournament_participants`), `daily_notes`, `promo_banner_settings`, `system_settings`, e i residui dei setup iniziali (`hero_*`, `homepage_sections`, `gallery_items`, `coach_notes`, `course_sections`, `programs`).
- **Funzioni orfane**: tra cui `consume_group_credit`, `reset_weekly_credits`, `log_activity`, `is_court_blocked`, `validate_invite_code`, `calculate_standings`, `cleanup_old_typing_indicators`.

È **distruttiva**: va applicata manualmente dopo un backup (istruzioni nell'intestazione del file).

### Oggetti rimossi dalla migrazione 088

`088_rimozione_chat_legacy_e_contenuti.sql` elimina la vecchia chat "a conversazioni", la cui pagina `/chat` non era più raggiungibile da aprile 2026 ed è stata rimossa con le sue API:

- **Tabelle**: `conversations`, `conversation_participants`, `messages`, `message_reads`, `typing_indicators`, `user_presence`, più `announcements`, `events`, `services`, `enrollments`, che nessuna parte dell'app usa.
- **Funzioni**: `get_or_create_conversation`, `update_conversation_last_message`, `update_unread_counts`, `reset_unread_count`, `update_user_presence_timestamp` e le funzioni degli annunci.
- **Storage**: le policy del bucket `chat-attachments`; il bucket va poi eliminato dal Dashboard.

Elimina i messaggi storici della vecchia chat: esportarli prima se servono.

### Migrazione 089

`089_invite_codes_rimozione_policy_pubblica.sql` rimuove la policy `"Anyone can validate a specific code"` (`USING (true)`), che permetteva a chiunque, con la anon key, di leggere tutti i codici invito e i loro ruoli. La validazione passa ormai solo da API con service role. Non tocca dati.

## Row Level Security

Pattern ricorrenti:

1. **Self-access**: `auth.uid() = user_id` (o `= id` su `profiles`).
2. **Role-based**: `public.get_my_role() IN ('admin', 'gestore')`.
3. **Ibridi**: ad es. su `bookings` proprietario o `coach_id`, più visibilità estesa a staff; su `booking_participants` proprietario della prenotazione, coach o admin.

```sql
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;
```

`SECURITY DEFINER` evita la ricorsione RLS leggendo `profiles.role` (fix 016, 017, 036).

Le API route che usano `serverClient.ts` (service role) **bypassano la RLS**: lì l'autorizzazione è applicativa (vedi [API.md](API.md)).

Diverse policy delle migrazioni 004–008 fanno riferimento a una colonna inesistente `profiles.user_role` e quindi non vengono create; le tabelle interessate restano coperte dalle policy delle migrazioni successive.

## Funzioni e trigger principali

| Funzione                                                                                                                         | Tipo                          | Scopo                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `update_updated_at_column()`                                                                                                     | trigger (molte tabelle)       | Aggiorna `updated_at` a ogni UPDATE                                                                                             |
| `handle_new_user()`                                                                                                              | trigger su `auth.users`       | Crea la riga `profiles` alla registrazione (031, 043)                                                                           |
| `check_booking_participants_limit()`                                                                                             | trigger BEFORE INSERT         | Blocca oltre 4 partecipanti per prenotazione                                                                                    |
| `check_booking_tournament_match()`                                                                                               | trigger su `bookings`         | Coerenza delle prenotazioni di partite di torneo (086)                                                                          |
| `update_arena_stats_on_challenge_complete()`                                                                                     | trigger su `arena_challenges` | Punti, W/L, streak e set vinti al completamento sfida (045, 046)                                                                |
| `ai_news_sync_cron_job(...)`                                                                                                     | SECURITY DEFINER              | Sincronizza una riga `ai_news_cron` con pg_cron (Europe/Rome→UTC) e programma la `net.http_post` verso `genera-news` (063, 065) |
| `calculate_group_standings(group_uuid)`, `update_match_stats()`, `create_tournament_groups()`, `assign_participants_to_groups()` | tornei                        | Classifiche gironi e statistiche (004, 010)                                                                                     |
| `purge_security_events()`                                                                                                        | job pg_cron                   | Retention 90 giorni di `security_events` (082)                                                                                  |

## Storage bucket

| Bucket         | Creato da                                              | Contenuto                           |
| -------------- | ------------------------------------------------------ | ----------------------------------- |
| `avatars`      | `supabase/scripts/utilities/CREATE_AVATARS_BUCKET.sql` | Avatar utenti e foto staff          |
| `certificates` | migrazione 053                                         | Certificati medici (PDF, max 10 MB) |

## Realtime

Il frontend sottoscrive `postgres_changes` su: `bookings`, `internal_messages`, `notifications`. Queste tabelle devono essere nella publication `supabase_realtime` (Dashboard → Database → Replication): le migrazioni ne aggiungono solo una parte.

## Migrazioni

Le migrazioni vivono in `supabase/migrations/` (`001`–`089`). Regole:

- **Non modificare** i file esistenti: per ogni cambiamento creare una nuova migrazione col numero successivo (la prossima è `090`).
- Scriverle idempotenti (`IF NOT EXISTS`, `DROP ... IF EXISTS`, `ON CONFLICT DO NOTHING`).
- Applicarle dallo SQL Editor di Supabase (o con `psql`), una alla volta.

### Setup da zero

Rieseguendo tutta la catena su un Postgres pulito, l'ordine che produce lo schema atteso dal codice è:

1. `schema.sql`, ma con `update_updated_at_column()` creata **prima** (il file la definisce in fondo e la usa all'inizio); poi eliminare la vecchia tabella `messages` dello schema base, sostituita da quella della 005. Subito dopo `migrations/archive/add_profile_fields.sql`, unica definizione di colonne profilo usate dal codice (`date_of_birth`, `postal_code`…).
2. Migrazioni da `001` a `009` (incluse le varianti `b`).
3. `DROP TABLE tournament_matches, tournament_groups CASCADE`, poi `010`, che le ricrea nella forma usata dal codice.
4. Migrazioni da `011` a `021b`.
5. Gli script in `supabase/scripts/` che creano oggetti assenti dalle migrazioni: `utilities/ADD_STATUS_TO_RECRUITMENT_APPLICATIONS.sql`, `utilities/CREATE_ARENA_CHALLENGES.sql`, `utilities/ADD_BOOKING_ID_TO_ARENA_CHALLENGES.sql`, `utilities/UPDATE_ARENA_CHALLENGES_ADD_MATCH_CONFIG.sql`, `utilities/ADD_COUNTER_PROPOSAL_STATUS.sql`, `fixes/FIX_ARENA_CHALLENGES_FOREIGN_KEYS.sql`, `fixes/FIX_ARENA_LEVELS.sql`, `fixes/FIX_ARENA_NO_DRAWS.sql`, la tabella `staff` di `migrations/archive/complete_migration.sql`, `utilities/ADD_STAFF_SOCIAL_COLUMNS.sql`, `utilities/CREATE_AVATARS_BUCKET.sql`.
6. Migrazioni da `022` a `089`.

Questa sequenza è stata verificata su un Postgres locale. Gli errori residui sono solo duplicati innocui e le policy con `profiles.user_role` citate sopra.

Note:

- 063 e 082 usano `pg_cron` e `pg_net`: abilitarle dal dashboard se necessario.
- I job pg_cron delle notizie AI vengono creati a runtime da `ai_news_sync_cron_job()` quando si salva una schedulazione.
