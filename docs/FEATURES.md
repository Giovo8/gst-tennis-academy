# Funzionalità per modulo

Panoramica delle funzionalità della piattaforma, verificate sul codice. Per i dettagli su ruoli e permessi vedi [ROLES.md](ROLES.md); per le API vedi [API.md](API.md); per lo schema dati vedi [DATABASE.md](DATABASE.md).

---

## Prenotazioni (campi e lezioni)

Pagine: `dashboard/{atleta,maestro}/(main)/bookings`, `dashboard/admin/bookings`. API principali: `/api/bookings` (+ `availability`, `confirm`, `reject`, `batch`, `participants`).

- **Tipi di prenotazione**: campo, lezione (privata o di gruppo). L'enum `booking_type` e i template email distinguono `campo`, `lezione`, `lezione_privata`, `lezione_gruppo`.
- **Multi-partecipante (max 4)**: tabella `booking_participants` (migrazione `032`), con CHECK su `order_index < 4` e trigger `check_booking_participants_limit()`. I partecipanti possono essere atleti registrati o ospiti (`participant_type`). Selezione in UI via `src/components/bookings/AthletesSelector.tsx`.
- **Anti-sovrapposizione a livello DB**: constraint `bookings_no_overlap` (migrazione `047`, `EXCLUDE USING gist` su campo + `tstzrange(start_time, end_time)` con `btree_gist`), che ignora gli stati `cancelled`, `rejected`, `cancellation_requested`.
- **Flusso di conferma**: le lezioni richiedono conferma del maestro e/o del gestore (`/api/bookings/confirm` e `/api/bookings/reject`); il gestore può creare prenotazioni per conto degli atleti.
- **Partite di torneo**: tipo `torneo` (migrazioni 084–086) per prenotare il campo di una partita; atleti e maestri vedono solo i propri tornei e partite (`/api/bookings/tournament-matches`, `src/lib/bookings/tournamentBookings*.ts`). Le partite prenotate compaiono nella sezione "In programma" del torneo.
- **Creazione**: `POST /api/bookings` applica rate limiting, validazione Zod (`createBookingSchema`), sanitizzazione input, restrizioni sugli orari prenotabili e logging attività.
- **Email**: notifiche automatiche a gestori, maestro e atleta su creazione/eliminazione (vedi [EMAIL.md](EMAIL.md)).
- **Blocchi campo**: tabella `court_blocks` gestita da admin/gestore (`/dashboard/admin/courts`).

## Corsi

Pagine: `dashboard/admin/corsi` (gestione), `dashboard/{atleta,maestro}/(main)/corsi`. Tabelle: `courses`, `course_enrollments`, `lesson_attendance`.

- Creazione corsi con calendario delle lezioni e maestro assegnato.
- Iscrizioni degli atleti (`course_enrollments`).
- Registro presenze per lezione (`lesson_attendance`), compilabile dal maestro.

## Video-lezioni

Pagine: `dashboard/admin/video-lessons`, `dashboard/{atleta,maestro}/(main)/videos`. Tabelle: `video_lessons`, `video_assignments`.

- Caricamento/gestione di video-lezioni da parte di maestro/admin.
- Assegnazione dei video a singoli atleti; visualizzazione tracciata (azione `video_lesson.view` nel log attività).

## Tornei

Pagine: `/tornei` (pubblica), `dashboard/admin/tornei` (gestione), sezioni tornei nelle dashboard atleta/maestro. Tabelle: `tournaments` (con `rounds_data`/`groups_data` JSONB), `tournament_participants`, `tournament_matches`, `tournament_groups`.

- **Tre formati** (`competition_type` in `src/lib/constants/app.ts`): eliminazione diretta (`knockout` / `eliminazione_diretta`), girone all'italiana (`round_robin`), gironi + eliminazione (`groups_then_knockout` / `girone_eliminazione`).
- **Bracket generati automaticamente** con seed e avanzamento del vincitore (`next_match_id`).
- **Punteggi tennis**: set per set, formato best-of-1/3/5, superficie del campo.
- Stati del torneo: `draft → open → in_progress → completed`; visibilità `public`/`private`; deadline di iscrizione.
- Classifiche gironi con vittorie/sconfitte, set e game (`GroupStanding`).

## Arena (sfide 1v1)

Sistema competitivo a punti con livelli Bronzo→Diamante, streak e classifica. Sfide singolo/doppio, formati best-of-1/3/5, tipo `ranked` o `amichevole`. Documentazione dedicata: [ARENA.md](ARENA.md).

## Chat

Pagine: `dashboard/{atleta,maestro}/(main)/mail` e `dashboard/admin/chat`. Tabelle: `internal_messages` (messaggi diretti), `chat_groups`, `chat_group_members`.

- Conversazioni dirette 1:1 e gruppi.
- Messaggi letti/non letti con contatore nella sidebar.
- Aggiornamenti in tempo reale via Supabase Realtime.
- L'Arena usa la chat per notificare creazione e cambi di stato delle sfide (messaggi in `internal_messages`).

## Notizie

Pagine: `/news`, `/news/[id]` (pubbliche), `dashboard/admin/news` (gestione). Tabella: `news`.

- Notizie manuali create dall'admin e notizie **generate con AI** da feed RSS + Gemini, con workflow bozza → approva/modifica/scarta. Pipeline completa in [AI-NEWS.md](AI-NEWS.md).
- Upload immagini via `/api/upload/news-image`.

## Notifiche

Tabella `notifications`, API `/api/notifications`, campanella in dashboard con Realtime.

- Notifiche in-app per prenotazioni, sfide Arena, messaggi e comunicazioni.
- Lettura tracciata (azione `notification.read`).

## Codici invito

Pagina: `dashboard/admin/invite-codes`. Tabelle: `invite_codes`, `invite_code_uses`. API: `/api/invite-codes/validate` (registrazione) e `/api/invite-codes/[id]/uses`; la gestione dei codici avviene direttamente su Supabase.

- Admin/gestore genera codici con ruolo predefinito e limiti d'uso; alla registrazione il codice viene validato e il profilo configurato di conseguenza.

## Candidature (lavora con noi)

Pagina pubblica: `/lavora-con-noi`; gestione in `dashboard/admin/job-applications`. Tabella: `recruitment_applications` (enum `recruitment_role`).

- Form pubblico di candidatura con upload documenti; revisione delle candidature da parte di admin/gestore.

## Staff

Pagina: `dashboard/admin/staff`; tabella `staff`; upload foto via `/api/upload/staff-image`.

- Gestione delle schede staff mostrate sul sito pubblico.

## Log attività

Modulo `src/lib/activity/`: `logActivity()` (client) e `logActivityServer()` (server, usato dalle API route) scrivono sulla tabella `activity_log` azioni tipizzate come `user.register`, `booking.create`, `tournament.join`, `email.send`, `court.block`, `invite_code.create`, `video_lesson.view`, `notification.read`.

- Consultazione admin: pagina `/dashboard/admin/platform-logs`, che interroga `GET /api/activity-logs` (riservata ad admin/gestore, con filtri per azione e limite).

## Meteo

API: `/api/weather` (rate limited). Interroga **Open-Meteo** (forecast 7 giorni, coordinate della struttura, timezone Europe/Rome) per il widget meteo in dashboard (`useWeather`).

## Live tennis

Sezione nella landing (`LiveScoresSection`) e pagina pubblica di dettaglio partita `/live/[id]`. API: `/api/live-tennis` (rate limited), che legge lo scoreboard ESPN di ATP e WTA per il giorno richiesto (ora italiana) con cache di 30 secondi. Normalizzazione in `src/lib/live-tennis/espn.ts`.

## Email transazionali

Invio via Resend con logging in `email_logs`: prenotazioni create/eliminate e notifica registrazione ai gestori. Dettagli in [EMAIL.md](EMAIL.md).

## Contenuti homepage

La landing (`src/components/landing/`) legge staff, news e tornei dal database; il resto dei contenuti è nel codice. Le vecchie tabelle di contenuti configurabili (`hero_*`, `homepage_sections`, `promo_banner_settings`) non sono più usate e vengono rimosse dalla migrazione 087.
