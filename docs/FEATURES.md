# Funzionalità per modulo

Panoramica delle funzionalità della piattaforma, verificate sul codice (ottobre 2026). Per ruoli e permessi vedi [ROLES.md](ROLES.md); per le API [API.md](API.md); per lo schema dati [DATABASE.md](DATABASE.md).

---

## Prenotazioni (campi, lezioni, partite di torneo)

Pagine: `dashboard/{atleta,maestro}/(main)/bookings` (lista, dettaglio, nuova, modifica), `dashboard/admin/bookings` e la **timeline** dei campi nella home admin (`BookingsTimeline`, con trascinamento per spostare/ridimensionare). API: `/api/bookings` (POST/PUT/DELETE), `availability`, `confirm`, `reject`, `tournament-matches`.

- **Tipi**: `campo`, `lezione_privata`, `lezione_gruppo`, `torneo` (lo schema accetta anche il generico `lezione`). Il `formato` (singolo/doppio per i campi, singola/doppia per le lezioni private) si calcola in creazione dal numero di partecipanti.
- **Partecipanti (max 4)**: `booking_participants`, atleti registrati o ospiti, scelti con `AthletesSelector`; limite imposto anche da un trigger.
- **Orari prenotabili** per atleti e maestri (`src/lib/bookings/bookingTimeRestrictions.ts`, fuso Europe/Rome): lun–ven 07:00–20:30, sabato 07:00–18:00, domenica 07:00–13:00. Admin e gestore non hanno limiti.
- **Conflitti**, controllati in creazione, modifica e conferma: altre prenotazioni attive sullo stesso campo, **blocchi campo** (`court_blocks`) e **corsi programmati** (`src/lib/bookings/courseConflicts.ts`, che tiene conto di periodi, date annullate/extra e override per lezione). Il vincolo di esclusione `bookings_no_overlap` del DB copre le corse concorrenti. Gli orari occupati sono mostrati in grigio nella nuova prenotazione (`/api/bookings/availability`).
- **Lezioni private richieste da un atleta**: nascono `pending`; admin/gestore e il maestro assegnato ricevono una notifica e confermano (`/api/bookings/confirm`, con ricontrollo dei conflitti) o rifiutano (`/api/bookings/reject`). Le prenotazioni `pending` non occupano lo slot.
- **Per conto di altri**: admin/gestore prenotano per qualsiasi atleta; un maestro può solo spostare le prenotazioni che lo coinvolgono.
- **Partite di torneo**: tipo `torneo` (migrazioni 084–086), partecipanti presi dalla partita; atleti e maestri vedono solo i propri tornei e partite. Le partite prenotate compaiono nella sezione "In programma" della pagina pubblica del torneo.
- **Side effect** (`src/lib/bookings/bookingService.ts`): email a segreteria, atleti e maestro (creazione, modifica, eliminazione — vedi [EMAIL.md](EMAIL.md)), notifiche in-app (all'atleta se agisce lo staff, agli admin se agisce l'atleta, al maestro per le lezioni private) e log in `activity_log`.

## Blocchi campo

Pagine: `dashboard/admin/courts` (elenco con filtri), `courts/new` (blocchi su più periodi, giorni della settimana e fasce orarie), `courts/[id]`, `courts/modifica`. Tabella `court_blocks`.

- Tipi: corsi tennis, corso adulti, manutenzione, evento, altro.
- Prima del salvataggio `checkCourtBlockConflicts()` (`src/lib/courts/blockConflicts.ts`) verifica che il blocco non si sovrapponga a prenotazioni attive o corsi.
- Un blocco può essere disattivato (`is_disabled`) senza eliminarlo.
- La lista dei campi viene sempre da `courts_settings` tramite `getCourts()` / `useCourts()`.

## Corsi

Pagine: `dashboard/admin/corsi` (gestione completa), `dashboard/maestro/(main)/corsi`, `dashboard/atleta/(main)/corsi`. Tabelle `courses`, `course_enrollments`, `lesson_attendance`, `payments`.

- Calendario per giorni e orari, anche **multi-periodo e multi-campo** (`schedule_periods`), con date annullate, date extra e override per singola lezione di orario, campo e istruttore.
- Iscrizioni di atleti registrati e **ospiti**, con quota (`fee`) e pagamenti registrati a mano (nessun provider di pagamento).
- Registro presenze per lezione e schede per partecipante (anche ospite), compilabili da admin e maestro.
- Alla creazione/modifica di un corso vengono segnalate le prenotazioni che cadrebbero dentro le sue lezioni.

## Video-lezioni

Pagine: `dashboard/admin/video-lessons`, `dashboard/maestro/(main)/videos` (+ `new`), `dashboard/atleta/(main)/videos`. Tabelle `video_lessons`, `video_assignments`.

- Creazione e assegnazione a uno o più atleti da parte di admin/gestore e maestri (scrittura diretta su Supabase con RLS).
- Gli atleti vedono solo i video assegnati, i maestri i propri e quelli assegnati a loro, admin/gestore tutti (`GET /api/video-lessons`).

## Tornei

Pagine pubbliche `/tornei` e `/tornei/[id]`; gestione in `dashboard/admin/tornei`; sezioni tornei nelle dashboard atleta e maestro. Tabelle `tournaments`, `tournament_participants`, `tournament_groups`, `tournament_matches`.

- **Tre tipi** (`tournament_type`): `eliminazione_diretta` (tabellone da 2 a 128), `girone_eliminazione` (gironi + tabellone dei qualificati), `campionato` (tutti contro tutti a giornate).
- **Fasi** (`current_phase`): `iscrizioni` → `eliminazione` / `gironi` / `campionato` → `completato`. Avvio, generazione di tabellone/gironi/calendario, passaggio dai gironi al tabellone e chiusura passano dalle API `/api/tournaments/[id]/*` (solo admin/gestore).
- **Iscrizioni**: l'atleta per sé, il maestro per i propri atleti, admin/gestore per chiunque (anche iscrizione manuale), fino a `max_participants`.
- **Punteggi tennis** set per set (`src/lib/tournaments/tennisScore.ts`): set validi (6-4, 7-5, 7-6, set lunghi, super tie-break), formato best-of-1/3/5 da `match_format`, **ritiro** registrato col set interrotto. I giocatori inseriscono il risultato una volta; poi solo admin/gestore possono correggerlo. Nei tabelloni il vincitore avanza in automatico e l'ultima partita chiude il torneo.
- Classifiche dei gironi (`calculate_group_standings`) e del campionato calcolate dai risultati.

## Arena (sfide 1v1)

Sistema competitivo a punti con livelli da Bronzo a Diamante, streak e classifica. Sfide in singolo o doppio, formati best-of-1/3/5, tipo `ranked` o `amichevole`, con prenotazione del campo collegata. Documentazione dedicata: [ARENA.md](ARENA.md).

## Chat

Pagine: `dashboard/{atleta,maestro}/(main)/mail` e `dashboard/admin/chat`, tutte basate su `src/components/chat/ChatView.tsx`.

- **Messaggi diretti** 1:1 su `internal_messages`, letti e scritti via Supabase con RLS.
- **Gruppi** (`chat_groups`, `chat_group_members`) creati da qualsiasi utente, gestiti via `/api/chat-groups`: il creatore è admin del gruppo; si può uscire, e l'admin può rimuovere membri.
- **Non letti**: per i diretti `is_read`, per i gruppi `last_read_at` per membro; il pallino "Chat" nella navigazione usa `get_unread_chat_count()` (`useUnreadChat`).
- Aggiornamento in tempo reale via Supabase Realtime; le notifiche di nuovi messaggi sono raggruppate (una sola notifica non letta per conversazione) e portano direttamente alla conversazione (`?c=direct-<id>` / `?c=group-<id>`).
- L'Arena usa la chat per avvisare i giocatori di nuove sfide e cambi di stato.

## Bacheca avvisi

Pagine: home atleta (`AthleteBacheca`), dettaglio `dashboard/atleta/(main)/avvisi/[id]`; gestione in `dashboard/admin/avvisi` (lista, nuovo, dettaglio, modifica). Tabella `avvisi` (093–095).

- Avvisi con tipo (generale, evento, chiusura, importante: icona e colore), titolo, testo, link interno facoltativo e data di scadenza.
- La pubblicazione invia una notifica a tutti gli atleti; un avviso si può disattivare senza eliminarlo.
- Il puntino "non letto" è salvato nel browser (`src/lib/avvisi/letti.ts`), senza tabelle dedicate.

## Notizie

Pagine pubbliche `/news` e `/news/[id]` (con pulsanti di condivisione); gestione in `dashboard/admin/news` (create, dettaglio) e `dashboard/admin/news/ai` (bozze generate, configurazione). Tabella `news`.

- Notizie scritte a mano dall'admin, con immagine caricata o presa da URL (`/api/upload/news-image`, ottimizzata in WebP).
- Notizie **generate con AI** da feed RSS + Gemini, con flusso bozza → approva / modifica / scarta. Pipeline completa in [AI-NEWS.md](AI-NEWS.md).
- La home mostra le ultime notizie pubblicate (lette lato server, ISR).

## Notifiche

Tabella `notifications`; campanella nella shell della dashboard (`NotificationsDropdown`), lista nella home maestro (`NotificationsList`) e pagine `notifications/` di ogni area (`NotificationCenter`).

- Notifiche in-app per prenotazioni, lezioni private, sfide Arena, messaggi chat, feedback, avvisi e nuove registrazioni (agli admin).
- Aggiornamento in tempo reale filtrato per utente, con polling di riserva lento (60 s, solo a scheda visibile).
- I link salvati portano alla pagina giusta; i percorsi di pagine rimosse vengono riportati a pagine esistenti (`resolveNotificationLink`).

## Feedback

Pagine: `dashboard/{atleta,maestro}/(main)/feedback` (lista, nuovo, dettaglio) e `dashboard/admin/feedback`. Tabelle `feedback` (090, 091) e `feedback_risposte` (092).

- Atleti e maestri inviano un feedback con categoria (suggerimento / problema / altro), titolo e messaggio.
- Admin/gestore ricevono una notifica, lo trovano in una lista filtrabile per stato e categoria, lo leggono (nuovo → letto), archiviano o eliminano.
- Nel dettaglio staff e autore si scrivono in una conversazione; ogni risposta notifica l'altra parte e una risposta dell'autore riporta il feedback a "nuovo". Il numero di risposte non lette è mostrato in navigazione (`src/lib/feedback/nonLetti.ts`).

## Utenti, registrazione e codici invito

Pagine: `/register`, `/login`, `/auth/reset-password`; gestione in `dashboard/admin/users` e `dashboard/admin/invite-codes`. Tabelle `profiles`, `invite_codes`, `invite_code_uses`.

- **Registrazione solo su invito**: il codice (validato da `/api/invite-codes/validate`) determina il ruolo (`atleta` o `maestro`); alla registrazione l'uso viene consumato e i gestori ricevono email e notifica.
- Admin/gestore generano codici con ruolo, numero massimo di utilizzi e scadenza, e vedono chi li ha usati.
- Dal pannello admin si creano utenti con qualsiasi ruolo, si modificano anagrafica e ruoli (anche il ruolo secondario `maestro` per i gestori), si invia il reset password e si elimina un utente (account Auth incluso).
- Profilo personale con avatar e certificato medico (PDF), caricati con `/api/upload/staff-image` e `/api/upload/certificate`.

## Candidature (lavora con noi)

Pagina pubblica `/lavora-con-noi`; gestione in `dashboard/admin/job-applications`. Tabella `recruitment_applications`.

- Form pubblico con ruolo (`maestro` / `personale`), messaggio e **link al CV** (validato), salvato direttamente su Supabase.
- Admin/gestore consultano ed eliminano le candidature.

## Staff

Pagina `dashboard/admin/staff` (lista, nuovo, dettaglio); tabella `staff`; foto via `/api/upload/staff-image`.

- Schede dello staff (ruolo, bio, foto, link social, ordine) mostrate nella sezione staff della home.

## Log attività e sicurezza

Pagina `dashboard/admin/platform-logs`.

- **Log attività**: `logActivity()` (client) e `logActivityServer()` (API) scrivono su `activity_log` azioni come `booking.create`, `tournament.join`, `user.login`, `arena.season_reset`; consultabili con `GET /api/activity-logs`.
- **Eventi di sicurezza** (`SecurityEventsPanel`): accessi negati, token non validi, blocchi CSRF e rate limit superati, con riepilogo degli IP più attivi nelle 24 ore (`GET /api/security-events`).

## Meteo

`/api/weather` interroga **Open-Meteo** (condizioni attuali e previsioni a 7 giorni per la sede, fuso Europe/Rome) per la `WeatherCard` delle dashboard (`useWeather`, cache di 10 minuti nel browser).

## Live tennis

Sezione `LiveScoresSection` (landing e home atleta) e pagina pubblica `/live/[id]`. `/api/live-tennis` legge lo scoreboard ESPN di ATP e WTA per il giorno richiesto (ora italiana), con cache di 30 secondi; normalizzazione in `src/lib/live-tennis/espn.ts`.

## Email transazionali

Invio via Resend con esiti registrati in `email_logs`: prenotazioni create, modificate ed eliminate, nuove registrazioni. Dettagli in [EMAIL.md](EMAIL.md).

## Sito pubblico

Landing (`src/app/page.tsx`, componenti in `src/components/landing/`) con hero, notizie, tornei, live score, staff e loghi partner; pagine `news`, `tornei`, `live`, `lavora-con-noi`, privacy, termini e cookie policy; pagina 404 personalizzata. I contenuti dinamici (staff, notizie, tornei) vengono dal database; il resto è nel codice.
