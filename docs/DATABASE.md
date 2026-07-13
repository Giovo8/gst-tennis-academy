# Database

Schema del database **Supabase (PostgreSQL)** di GST Tennis Academy: ~60 tabelle definite da **67 migrazioni** (`supabase/migrations/001–067`) più lo schema base di riferimento `supabase/schema.sql`.

## Estensioni

| Estensione | Dove | Uso |
|---|---|---|
| `pgcrypto` | migrazione 001 | `gen_random_uuid()` per le primary key |
| `btree_gist` | schema.sql / migrazione 047 | Vincolo di esclusione anti-sovrapposizione su `bookings` |
| `pg_cron` | migrazione 063 (opzionale) | Schedulazione generazione notizie AI |
| `pg_net` | migrazione 063 (opzionale) | Chiamata HTTP dalla funzione cron alla Edge Function `genera-news` |

## Enum

| Tipo | Valori |
|---|---|
| `user_role` | `atleta`, `maestro`, `gestore`, `admin` |
| `booking_type` | `campo`, `lezione_privata`, `lezione_gruppo` |
| `competition_type` | `torneo`, `campionato` |
| `competition_format` | formati torneo (eliminazione, round robin, gironi+eliminazione) |
| `recruitment_role` | `maestro`, `personale` |

## Tabelle per dominio

### Utenti e profili

| Tabella | Colonne chiave / note |
|---|---|
| `profiles` | `id` (FK `auth.users`), `email`, `full_name`, `role user_role` (default `atleta`), `subscription_type`, `avatar_url`, `metadata`; creato automaticamente dal trigger `handle_new_user` (migrazioni 031/043, backfill 067) |
| `user_presence` | Stato online per la chat (migrazione 020) |
| `staff` | Membri staff mostrati nella landing: `full_name`, `role`, `bio`, `image_url`, `order_index`, `active` |
| `recruitment_applications` | Candidature "lavora con noi": `full_name`, `email`, `role recruitment_role`, `message`, `cv_url` |

### Prenotazioni

| Tabella | Colonne chiave / note |
|---|---|
| `bookings` | `user_id`, `coach_id`, `court`, `type booking_type`, `start_time`/`end_time`, `status` (default `pending`), `coach_confirmed`, `manager_confirmed`, `created_by` (044). **Vincolo di esclusione GIST `bookings_no_overlap`**: stesso campo + intervalli `tstzrange` sovrapposti = rifiutato a livello DB |
| `booking_participants` | Fino a **4 partecipanti** per prenotazione: `booking_id`, `user_id` (null per ospiti), `full_name`, `email`, `phone`, `is_registered`, `participant_type` (`atleta`/`ospite`), `order_index` 0–3 con `unique(booking_id, order_index)` (migrazioni 032–035) |
| `court_blocks` | Blocchi campo (manutenzione/eventi): `court_id`, `start_time`/`end_time`, `reason`, `is_disabled` (040), `created_by` |
| `courts_settings` | Configurazione dei campi (nomi, attivazione) — sorgente per `getCourts()` (migrazione 026) |
| `subscription_credits` | Crediti settimanali abbonamento: `plan`, `weekly_credits`, `credits_available`, `last_reset` |

### Tornei

| Tabella | Colonne chiave / note |
|---|---|
| `tournaments` | `title`, `start_date`/`end_date`, `max_participants`, `status`, `competition_type`, `format`, `match_format` (best-of-1/3/5), `surface_type`, più JSONB `rounds_data`, `groups_data`, `standings` |
| `tournament_participants` | Iscritti: `tournament_id`, `user_id`, seed, statistiche match; supporto giocatori esterni (035) |
| `tournament_matches` | Match con punteggio tennis per set, `stage` (`groups`/`knockout`), `round_order`, `winner_id` (migrazioni 004, 012, 013) |
| `tournament_groups` | Gironi con classifiche (migrazioni 004, 010) |

### Arena (sfide 1v1)

| Tabella | Colonne chiave / note |
|---|---|
| `arena_challenges` | `challenger_id`, `opponent_id`, `status` (pending/accepted/awaiting_score/completed/cancelled, migrazioni 041–042), `winner_id`, `score`, `match_type` (singolo/doppio con partner), `challenge_type` (ranked), `booking_id` collegato |
| `arena_stats` | Classifica: punti, vittorie/sconfitte, streak, `sets_won` (046), livelli Bronzo→Diamante calcolati dai punti |

### Corsi e video-lezioni

| Tabella | Colonne chiave / note |
|---|---|
| `courses` | Corsi con calendario: `court_name` (048), periodi di schedule (056), date annullate (057) ed extra (058), override orario (060) e istruttore (066) per singola lezione, `created_by` (061) |
| `course_enrollments` | Iscrizioni con quota `fee` (051) e supporto ospiti (054) — migrazione 049 |
| `lesson_attendance` | Registro presenze per lezione, anche per ospiti (050, 055) |
| `enrollments` | Iscrizioni generiche dello schema base |
| `video_lessons` | Video-lezioni: titolo, URL, `notes` (037); i maestri possono gestire le proprie (038–039) |
| `video_assignments` | Assegnazione video ad atleti (027) |

### Chat e messaggistica

| Tabella | Colonne chiave / note |
|---|---|
| `conversations` | Conversazioni 1:1 con `last_message` e contatori non letti aggiornati da trigger (migrazione 005) |
| `messages` | Messaggi delle conversazioni (allegati sul bucket `chat-attachments`, migrazione 018) |
| `internal_messages` | Messaggi interni stile mail (006b) |
| `chat_groups`, `chat_group_members` | Gruppi con ruolo membro `admin`/`member` (028–029) |
| `message_reads` | Ricevute di lettura |
| `typing_indicators` | Indicatori di digitazione, ripuliti da `cleanup_old_typing_indicators()` |
| `user_presence` | Presenza online (020) |

### News e generatore AI

| Tabella | Colonne chiave / note |
|---|---|
| `news` | Articoli: `title`, `category`, `summary`, `image_url`, `published`; il modulo AI (063) aggiunge `stato` (`bozza`/`pubblicata`/`scartata`), `ai_generated`, `fonte_url` (dedup), `fonte_nome` |
| `ai_news_config` | Configurazione: `pubblicazione_auto` |
| `ai_news_fonti` | Fonti RSS: `nome`, `url` (unique), `attiva`, `categoria`; 3 fonti predefinite seed (Gazzetta, ATP Tour, Ubitennis) |
| `ai_news_cron` | Schedulazioni: `ora`, `minuto` (0/15/30/45), `categoria`, `prompt_custom`, `attivo`, `ultimo_eseguito` |
| `ai_news_generation_logs` | Log esecuzioni: `tipo` (`manuale`/`cron`), `generate`, `skippate`, `errori` JSONB |

### Pagamenti

| Tabella | Colonne chiave / note |
|---|---|
| `payments` | Pagamenti (corsi, iscrizioni) con supporto ospiti (052, 062); la colonna `stripe_payment_id` è predisposta ma **nessun provider è integrato** |
| `orders` | Ordini dello schema base |
| `subscriptions` | **Legacy** (vedi sotto) — i crediti reali sono in `subscription_credits` |

### Contenuti e homepage

| Tabella | Colonne chiave / note |
|---|---|
| `services`, `products` | Servizi e prodotti dell'accademia |
| `events`, `event_registrations` | Eventi e iscrizioni |
| `hero_content`, `hero_images`, `homepage_sections`, `promo_banner_settings` | Contenuti configurabili della landing (021) |

### Sistema e log

| Tabella | Colonne chiave / note |
|---|---|
| `notifications` | Notifiche in-app per utente |
| `activity_log` | Log attività applicative, scritto via `log_activity()` (024) |
| `email_logs` | Esiti invii Resend (025, 034) |
| `email_campaigns`, `email_settings`, `email_templates`, `email_unsubscribes` | Sistema campagne email (007b, 023) — templates/settings solo configurazione |
| `system_settings` | Impostazioni chiave/valore |
| `invite_codes`, `invite_code_uses` | Codici invito con `role`, `max_uses`, `uses_remaining`, `expires_at` e log utilizzi |

### Tabelle legacy / candidate alla rimozione

Presenti nello schema ma senza uso riscontrato nel codice applicativo:

- `chat_rooms` — sostituita da `conversations` + `chat_groups`
- `programs` — non referenziata
- `athlete_stats` (008) — sostituita da `arena_stats`
- `subscriptions` — sostituita da `subscription_credits`

## Row Level Security

RLS attiva su 50+ tabelle. Pattern ricorrenti:

1. **Self-access** — `auth.uid() = user_id` (o `= id` su `profiles`): l'utente vede/modifica solo le proprie righe.
2. **Role-based** — `public.get_my_role() IN ('admin', 'gestore')` per l'accesso amministrativo.
3. **Ibridi** — es. su `bookings`: proprietario o `coach_id`, più visibilità estesa a `maestro/admin/gestore`; su `booking_participants`: proprietario della prenotazione, coach o admin.

### Helper `get_my_role()`

```sql
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;
```

`SECURITY DEFINER` è essenziale: consente alle policy di leggere `profiles.role` senza innescare ricorsione RLS (fix nelle migrazioni 016, 017, 036).

Nota: le API route che usano `serverClient.ts` (service role) **bypassano la RLS**; in quei percorsi l'autorizzazione è applicativa (vedi [API.md](API.md)).

## Funzioni e trigger principali

| Funzione | Tipo | Scopo |
|---|---|---|
| `update_updated_at_column()` | trigger (25+ tabelle) | Aggiorna `updated_at` a ogni UPDATE |
| `handle_new_user()` | trigger su `auth.users` | Crea la riga `profiles` alla registrazione (031, 043) |
| `check_booking_participants_limit()` | trigger BEFORE INSERT | Blocca oltre 4 partecipanti per prenotazione |
| `consume_group_credit(p_user_id)` | funzione | Scala atomicamente un credito settimanale (ritorna `false` se esauriti) |
| `reset_weekly_credits()` | funzione (job schedulato) | Ripristina i crediti al lunedì |
| `update_arena_stats_on_challenge_complete()` | trigger su `arena_challenges` | Aggiorna punti, W/L, streak e set vinti al completamento sfida (045, 046) |
| `cleanup_old_typing_indicators()` | funzione (pulizia periodica) | Rimuove gli indicatori di digitazione obsoleti (020) |
| `ai_news_sync_cron_job(...)` | funzione SECURITY DEFINER | Sincronizza una riga `ai_news_cron` con `pg_cron` (conversione orario Europe/Rome→UTC) e programma la `net.http_post` verso la Edge Function `genera-news` (063, fix timezone 065) |
| `get_or_create_conversation()`, `update_conversation_last_message()`, `update_unread_counts()`, `reset_unread_count()` | funzioni/trigger chat | Gestione conversazioni e contatori non letti (005) |
| `calculate_group_standings()`, `update_participant_stats_from_match()`, `update_match_stats()` | funzioni/trigger tornei | Classifiche gironi e statistiche partecipanti (004, 010) |
| `is_court_blocked()`, `validate_invite_code()`, `log_activity()` | funzioni | Utility per blocchi campo, codici invito e activity log (015) |

## Storage bucket

| Bucket | Creato da | Contenuto |
|---|---|---|
| `avatars` | `supabase/scripts/utilities/CREATE_AVATARS_BUCKET.sql` | Avatar utenti e foto staff |
| `certificates` | migrazione 053 (limiti dimensione e MIME type) | Certificati medici |
| `chat-attachments` | migrazione 018 | Allegati della chat |

## Migrazioni

Le migrazioni sono in `supabase/migrations/`, numerate `001`–`067` (con alcune varianti `b` e una cartella `archive/` di versioni superate, da non applicare).

### Come applicarle

Con Supabase CLI:

```bash
supabase link --project-ref <project-id>
supabase db push
```

In alternativa, eseguire i file `*.sql` **in ordine numerico** (001→067) dallo SQL Editor di Supabase. Le migrazioni sono in gran parte idempotenti (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), ma l'ordine va rispettato per le dipendenze (es. `get_my_role()` prima delle policy che la usano).

Note:

- `schema.sql` è lo **schema base di riferimento** (profiles, bookings, tornei, contenuti): utile per un setup da zero, ma le migrazioni restano la fonte di verità dell'evoluzione.
- La migrazione 063 richiede le estensioni `pg_cron` e `pg_net` (disponibili sui progetti Supabase; abilitarle dal dashboard se necessario).
- Il bucket `avatars` va creato con lo script dedicato in `supabase/scripts/utilities/` perché non è incluso nelle migrazioni.
- `supabase/scripts/` contiene inoltre utilities e fix una tantum, non parte della catena di migrazione.
