# API Reference

Inventario completo delle **68 API route** (93 handler) in `src/app/api/`, raggruppate per dominio, con metodi HTTP, autenticazione richiesta e descrizione. La colonna "Auth" è verificata leggendo il codice di ogni route (ottobre 2026).

Tutte le richieste verso `/api/*` passano prima dal **middleware** (`src/middleware.ts`): protezione CSRF sulle richieste mutanti (header `Origin` fuori whitelist → 403) e rate limiting per path (vedi [Note trasversali](#note-trasversali)).

## Legenda autenticazione

| Valore               | Significato                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Nessuna              | Endpoint pubblico, nessuna verifica                                                                        |
| Bearer               | Header `Authorization: Bearer <access_token>`, verificato da `verifyAuth()` (`src/lib/auth/verifyAuth.ts`) |
| Sessione             | Cookie di sessione Supabase, verificato da `getRouteAuth()` (`src/lib/auth/routeAuth.ts`)                  |
| + admin/gestore ecc. | Oltre all'autenticazione è richiesto il ruolo indicato                                                     |

`admin/gestore` significa che i due ruoli sono equivalenti: `verifyAuth(req, ['admin', 'gestore'])` oppure l'helper `isAdmin()` di `routeAuth.ts`.

Come chiamare una route Bearer dal client:

```ts
const {
  data: { session },
} = await supabase.auth.getSession();
await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify(payload),
});
```

Le route "Sessione" non richiedono header: il browser invia da solo i cookie della sessione.

---

## Auth e registrazione

| Route                        | Metodi | Auth                   | Descrizione                                                                                                                                                                                                                                          |
| ---------------------------- | ------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/signup`           | POST   | Nessuna (rate limited) | Registrazione solo su invito: codice obbligatorio e validato (esistenza, scadenza, usi residui); il ruolo viene dal codice, non dal client, e può essere solo `atleta` o `maestro`. Consuma il codice, notifica gli admin e invia l'email ai gestori |
| `/api/invite-codes/validate` | GET    | Nessuna                | `?code=` — valida un codice invito (esistenza, scadenza, usi residui) con service role e ne restituisce il ruolo                                                                                                                                     |

Il callback di Supabase Auth è `src/app/auth/callback/route.ts` (non sotto `/api`): scambia il `code` PKCE o verifica il `token_hash` (recupero password, invito, magic link), poi reindirizza a `?next=` (solo percorsi interni) o alla dashboard del ruolo; senza parametri rimanda a `/auth/reset-password`.

## Prenotazioni

| Route                              | Metodi | Auth                                       | Descrizione                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/bookings`                    | POST   | Bearer                                     | Crea prenotazione (campo, lezione, lezione privata/di gruppo, partita di torneo). Validazione Zod (`createBookingSchema`), orari ristretti per atleti/maestri, controllo conflitti con prenotazioni, blocchi e corsi; lezione privata chiesta da un atleta → `pending` |
| `/api/bookings`                    | PUT    | Bearer                                     | `?id=` — modifica con ricontrollo conflitti. Admin/gestore: tutti i campi; maestro: solo spostamento (`court`, `start_time`, `end_time`) delle prenotazioni in cui è coinvolto. Email di modifica + notifica all'atleta                                                |
| `/api/bookings`                    | DELETE | Bearer (proprietario o admin/gestore)      | `?id=` — elimina; email ai destinatari, notifica all'atleta se elimina lo staff, notifica agli admin se elimina l'atleta                                                                                                                                               |
| `/api/bookings/availability`       | GET    | Sessione                                   | `?date=YYYY-MM-DD&court=` — occupazioni del campo nel giorno: prenotazioni confermate, blocchi e corsi, senza dati personali                                                                                                                                           |
| `/api/bookings/confirm`            | POST   | Bearer + admin/gestore o maestro assegnato | `?id=` — conferma una lezione privata `pending` dopo il ricontrollo dei conflitti (409 `{ conflict: true }` se lo slot è stato occupato)                                                                                                                               |
| `/api/bookings/reject`             | POST   | Bearer + admin/gestore o maestro assegnato | `?id=` — rifiuta una lezione privata `pending` e notifica l'atleta                                                                                                                                                                                                     |
| `/api/bookings/tournament-matches` | GET    | Bearer                                     | Senza parametri: tornei in corso prenotabili. Con `?tournament_id=`: partite aperte da prenotare. Atleti e maestri vedono solo i propri tornei e partite, admin/gestore tutto                                                                                          |

La **lettura** delle prenotazioni avviene direttamente su Supabase dalle pagine (RLS), non da API.

## Tornei

| Route                                         | Metodi | Auth                                             | Descrizione                                                                                                                                                                             |
| --------------------------------------------- | ------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/tournaments`                            | GET    | Nessuna                                          | Elenco (`?upcoming=true`, `?type=`, `?includeCounts=true`) o dettaglio (`?id=`) con numero iscritti; usato anche da `/tornei`                                                           |
| `/api/tournaments`                            | DELETE | Bearer + admin/gestore                           | `?id=` — elimina il torneo                                                                                                                                                              |
| `/api/tournaments/create`                     | POST   | Bearer + admin/gestore                           | Crea il torneo (`tournament_type`: `eliminazione_diretta`, `girone_eliminazione`, `campionato`) con validazione per tipo; per i gironi crea anche i gruppi (`create_tournament_groups`) |
| `/api/tournaments/[id]/start`                 | POST   | Bearer + admin/gestore                           | Avvia il torneo dalla fase `iscrizioni`: tabellone, gironi o calendario a seconda del tipo                                                                                              |
| `/api/tournaments/[id]/generate-bracket`      | POST   | Bearer + admin/gestore                           | (Ri)genera il tabellone a eliminazione, con propagazione dei bye                                                                                                                        |
| `/api/tournaments/[id]/generate-groups`       | POST   | Bearer + admin/gestore                           | Genera gironi e partite round-robin (tornei `girone_eliminazione`)                                                                                                                      |
| `/api/tournaments/[id]/generate-championship` | POST   | Bearer + admin/gestore                           | Genera il calendario del campionato (tutti contro tutti)                                                                                                                                |
| `/api/tournaments/[id]/advance-from-groups`   | POST   | Bearer + admin/gestore                           | Chiude i gironi e crea il tabellone con i qualificati                                                                                                                                   |
| `/api/tournaments/[id]/complete`              | POST   | Bearer + admin/gestore                           | Chiude il torneo (`Concluso`)                                                                                                                                                           |
| `/api/tournaments/[id]/delete-matches`        | DELETE | Bearer + admin/gestore                           | Elimina tutte le partite (usato per rigenerare il calendario del campionato)                                                                                                            |
| `/api/tournaments/[id]/groups`                | GET    | Nessuna                                          | Gironi con classifiche (`calculate_group_standings`)                                                                                                                                    |
| `/api/tournaments/[id]/group-matches`         | GET    | Nessuna                                          | Partite del torneo con giocatori (nome e avatar, niente email); filtri `?group_id=`, `?phase=gironi\|eliminazione`                                                                      |
| `/api/tournaments/[id]/matches/[matchId]`     | PUT    | Bearer (admin/gestore o giocatori della partita) | Inserisce il punteggio set per set (`sets`, `retired_player`) con validazione tennis (`computeMatchResult`); i giocatori solo al primo inserimento. Nei tabelloni avanza il vincitore   |
| `/api/tournaments/[id]/scheduled-matches`     | GET    | Nessuna                                          | Partite prenotate in arrivo di un torneo in corso (sezione "In programma"): solo nomi, turno, campo e orari                                                                             |
| `/api/tournament_participants`                | GET    | Nessuna                                          | Iscritti (filtri `user_id`, `tournament_id`) con nome e avatar                                                                                                                          |
| `/api/tournament_participants`                | POST   | Bearer                                           | Iscrizione `{ user_id, tournament_id }` se c'è posto: per sé; admin/gestore per chiunque; maestro solo atleti                                                                           |
| `/api/tournament_participants`                | DELETE | Bearer                                           | `?id=` oppure `?user_id=&tournament_id=` — stesse regole del POST                                                                                                                       |

## Arena (sfide 1v1)

| Route                     | Metodi     | Auth                                             | Descrizione                                                                                                     |
| ------------------------- | ---------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `/api/arena/challenges`   | GET        | Sessione                                         | Elenco (`?user_id=`, `?status=`) o dettaglio (`?challenge_id=`); applica le transizioni automatiche di stato    |
| `/api/arena/challenges`   | POST       | Sessione                                         | Crea sfida; per conto di altri solo admin/gestore (che la creano già `accepted`)                                |
| `/api/arena/challenges`   | PATCH, PUT | Sessione (giocatori della sfida o admin/gestore) | Aggiorna stato, risultato, controproposta, prenotazione collegata (PUT è un alias che accetta `?challenge_id=`) |
| `/api/arena/challenges`   | DELETE     | Sessione (sfidante o admin/gestore)              | `?challenge_id=` — elimina la sfida                                                                             |
| `/api/arena/players`      | GET        | Bearer                                           | Giocatori sfidabili con statistiche; email solo per admin/gestore                                               |
| `/api/arena/stats`        | GET        | Sessione                                         | Statistiche di un utente (`?user_id=`, create al volo se assenti) o classifica                                  |
| `/api/arena/reset-season` | POST       | Sessione + admin/gestore                         | Body `{ "confirm": "RESET_ARENA_SEASON" }`: registra in `activity_log`, poi cancella sfide e statistiche        |

Dettagli su punti e livelli in [ARENA.md](ARENA.md).

## Notizie AI

Tutte le route del modulo richiedono **sessione + admin/gestore** tramite `requireAdminOrGestore()` (`src/lib/ai-news/auth.ts`).

| Route                           | Metodi        | Descrizione                                                                                          |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `/api/ai-news/config`           | GET, POST     | Configurazione (`pubblicazione_auto`, `numero_post`); crea la riga se assente                        |
| `/api/ai-news/genera`           | POST          | Generazione manuale: delega alla Edge Function `genera-news` (body opzionale `categoria`, `cron_id`) |
| `/api/ai-news/bozze`            | GET           | `?stato=bozza\|pubblicata\|scartata\|tutte` — notizie generate                                       |
| `/api/ai-news/[id]/approva`     | PATCH         | Pubblica la bozza (titolo e testo risanitizzati)                                                     |
| `/api/ai-news/[id]/modifica`    | PATCH         | Modifica titolo e testo della bozza                                                                  |
| `/api/ai-news/[id]/scarta`      | PATCH         | Scarta la bozza                                                                                      |
| `/api/ai-news/fonti`            | GET, POST     | Elenco/creazione fonti RSS (`ai_news_fonti`)                                                         |
| `/api/ai-news/fonti/[id]`       | PATCH, DELETE | Aggiorna/elimina fonte                                                                               |
| `/api/ai-news/fonti/[id]/test`  | GET           | Testa il feed della fonte                                                                            |
| `/api/ai-news/cron`             | GET, POST     | Elenco/creazione schedulazioni (`ai_news_cron`, max 8 attive)                                        |
| `/api/ai-news/cron/[id]`        | PATCH, DELETE | Aggiorna/elimina schedulazione e la risincronizza su `pg_cron`                                       |
| `/api/ai-news/cron/[id]/esegui` | POST          | Esecuzione manuale immediata di una schedulazione                                                    |
| `/api/ai-news/cron/sync`        | POST          | Risincronizza tutti i job `pg_cron` con la tabella                                                   |
| `/api/ai-news/logs`             | GET           | Ultime 20 generazioni (`ai_news_generation_logs`)                                                    |
| `/api/ai-news/cleanup`          | POST          | Bonifica dell'archivio AI: risanitizzazione e traduzione EN→IT con Gemini (`dryRun` supportato)      |

Pipeline completa in [AI-NEWS.md](AI-NEWS.md).

## Chat

La chat delle dashboard (`ChatView`, pagine `/dashboard/{atleta,maestro}/mail` e `/dashboard/admin/chat`) legge e scrive i messaggi **diretti** su `internal_messages` direttamente via Supabase (RLS, migrazione 096); i **gruppi** passano dalle API.

| Route                            | Metodi    | Auth            | Descrizione                                                                                                                                                                |
| -------------------------------- | --------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/chat-groups`               | GET       | Bearer          | Gruppi dell'utente con ultimo messaggio e numero di non letti (`last_read_at`)                                                                                             |
| `/api/chat-groups`               | POST      | Bearer          | Crea un gruppo (`createChatGroupSchema`): il creatore ne è admin, gli altri membri ricevono una notifica                                                                   |
| `/api/chat-groups/[id]/members`  | DELETE    | Bearer (membro) | Senza `?user_id`: esci dal gruppo (se eri l'ultimo admin il ruolo passa al membro più anziano; gruppo vuoto = eliminato). Con `?user_id`: rimozione, solo admin del gruppo |
| `/api/chat-groups/[id]/messages` | GET, POST | Bearer (membro) | Messaggi del gruppo (`?limit=` max 100, `?offset=`) / invio (`chatMessageSchema`) con notifica raggruppata agli altri membri                                               |

## Notifiche

| Route                | Metodi | Auth     | Descrizione                                                                                                                                                                                                                                                       |
| -------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/notifications` | POST   | Sessione | Crea una notifica per un altro utente (usata da `createNotification()`). Link solo interni (`/...`), lunghezze massime, tipo `[a-z_]`; le notifiche `message` sono raggruppate per conversazione. Lettura e "segna come letta" avvengono direttamente su Supabase |

## Avvisi (Bacheca atleti)

| Route                    | Metodi             | Auth                     | Descrizione                                                                               |
| ------------------------ | ------------------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| `/api/avvisi`            | GET                | Sessione + atleta        | Avvisi attivi e non scaduti per la Bacheca (max 10)                                       |
| `/api/avvisi/[id]`       | GET                | Sessione + atleta        | Dettaglio di un avviso attivo (404 se disattivato o scaduto)                              |
| `/api/admin/avvisi`      | GET, POST          | Sessione + admin/gestore | Elenco / pubblicazione (`createAvvisoSchema`); la pubblicazione notifica tutti gli atleti |
| `/api/admin/avvisi/[id]` | GET, PATCH, DELETE | Sessione + admin/gestore | Dettaglio, modifica parziale (`updateAvvisoSchema`, anche attiva/disattiva), eliminazione |

## Feedback

| Route                         | Metodi             | Auth                              | Descrizione                                                                        |
| ----------------------------- | ------------------ | --------------------------------- | ---------------------------------------------------------------------------------- |
| `/api/feedback`               | GET, POST          | Sessione + atleta/maestro         | Lista dei propri feedback / invio (`createFeedbackSchema`) con notifica agli admin |
| `/api/feedback/[id]`          | GET                | Sessione + atleta/maestro         | Dettaglio di un proprio feedback (404 se di un altro utente)                       |
| `/api/feedback/[id]/risposte` | GET, POST          | Sessione + autore o admin/gestore | Conversazione sul feedback; ogni risposta notifica l'altra parte                   |
| `/api/admin/feedback`         | GET                | Sessione + admin/gestore          | Elenco con autore e numero di nuovi; filtri `stato`, `categoria`                   |
| `/api/admin/feedback/[id]`    | GET, PATCH, DELETE | Sessione + admin/gestore          | Dettaglio (segna come letto), cambio stato, eliminazione                           |

## Utenti e amministrazione

| Route                             | Metodi      | Auth                     | Descrizione                                                                                                            |
| --------------------------------- | ----------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `/api/users`                      | GET         | Bearer                   | Utenti per prenotazioni, iscrizioni e chat; gli atleti vedono solo i maestri prenotabili. Aggiunge `is_bookable_coach` |
| `/api/admin/users`                | POST        | Bearer + admin/gestore   | Crea account Auth + profilo (+ `arena_stats`); un gestore non può creare admin                                         |
| `/api/admin/users`                | DELETE      | Bearer + admin/gestore   | `?userId=` — elimina account Auth e profilo (non se stessi; un gestore non può eliminare un admin)                     |
| `/api/admin/users/reset-password` | POST        | Bearer + admin/gestore   | Invia l'email di reimpostazione password (redirect a `/auth/reset-password`)                                           |
| `/api/admin/video-lessons`        | GET         | Bearer + admin/gestore   | Tutte le video-lezioni con utenti assegnati e autore                                                                   |
| `/api/invite-codes/[id]/uses`     | GET         | Sessione + admin/gestore | Utilizzi di un codice invito (`invite_code_uses` + vecchi log in `activity_log`)                                       |
| `/api/activity-logs`              | GET         | Sessione + admin/gestore | Log attività (`?limit=`, `?action=`)                                                                                   |
| `/api/security-events`            | GET         | Sessione + admin/gestore | Eventi di sicurezza + riepilogo degli IP più attivi nelle 24h. Filtri: `limit` (max 1000), `tipo`, `severita`          |
| `/api/recruitment-applications`   | GET, DELETE | Sessione + admin/gestore | Candidature "lavora con noi": elenco ed eliminazione (body `{ id }`)                                                   |

## Contenuti

| Route                | Metodi | Auth   | Descrizione                                                                                                                                          |
| -------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/video-lessons` | GET    | Bearer | Video visibili in base al ruolo (atleta: assegnati; maestro: propri + assegnati; admin/gestore: tutti), `?id=` per il dettaglio con stato di visione |

Creazione, modifica ed eliminazione delle video-lezioni avvengono direttamente su Supabase dalle pagine admin/maestro (RLS, migrazioni 038–039).

## Upload

| Route                     | Metodi | Auth                                            | Descrizione                                                                                                       |
| ------------------------- | ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/api/upload/news-image`  | POST   | Sessione + admin/gestore                        | Immagine news da file o URL esterno (SSRF: blocco host locali/reti private, niente redirect); ottimizzata in WebP |
| `/api/upload/staff-image` | POST   | Sessione (self; admin/gestore per altri utenti) | Avatar/foto staff (bucket `avatars`, max 800px WebP); `deleteOnly` per rimuovere                                  |
| `/api/upload/certificate` | POST   | Sessione (self; admin/gestore per altri utenti) | Certificato medico PDF max 10 MB (bucket `certificates`); `deleteOnly` per rimuovere                              |

## Utilità e integrazioni

| Route              | Metodi | Auth                   | Descrizione                                                                                                |
| ------------------ | ------ | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/api/health`      | GET    | Nessuna                | Health check (`{ status: "ok", timestamp }`) per il monitoraggio                                           |
| `/api/weather`     | GET    | Nessuna (rate limited) | Meteo via Open-Meteo, cache 5 minuti                                                                       |
| `/api/live-tennis` | GET    | Nessuna (rate limited) | Partite ATP/WTA del giorno e in corso (`?date=YYYY-MM-DD`, ora italiana) dallo scoreboard ESPN, cache 30 s |

---

## Note trasversali

- **Autenticazione**: tutte le route richiedono un utente autenticato tranne quelle pubbliche per scelta: `/api/health`, `/api/weather`, `/api/live-tennis`, `GET /api/tournaments` e i sottopercorsi di sola lettura (`groups`, `group-matches`, `scheduled-matches`), `GET /api/tournament_participants`, `GET /api/invite-codes/validate` e `POST /api/auth/signup`.
- **Service role**: quasi tutte le route usano `supabaseServer` (`src/lib/supabase/serverClient.ts`), che **bypassa la RLS**. Il controllo di ruolo e di ownership fatto nella route è quindi l'unica protezione: ogni nuova route deve farlo esplicitamente.
- **Validazione**: i body di prenotazioni, registrazione, feedback, avvisi e chat passano dagli schemi Zod di `src/lib/validation/schemas.ts`, dopo `sanitizeObject()` (rimozione dei null byte). Il PUT di `/api/bookings` per admin/gestore e le route tornei/AI news validano i campi a mano.
- **Rate limiting**: applicato **a tutte le route `/api/*`** dal middleware secondo le regole per path di `src/lib/security/rateLimitRules.ts` (auth e upload stretti, `/api/ai-news/genera` e `/esegui` 5/ora, default 300/min in lettura e 60/min in scrittura), con bucket separati per gruppo di endpoint. Esclusi i webhook. Signup, `POST /api/bookings`, weather e live-tennis hanno anche un limite interno più stretto: i due livelli si sommano. Oltre il limite: `429` con `Retry-After` e un evento in `security_events` (solo al primo superamento della finestra).

  ⚠️ Il contatore è in memoria (`src/lib/security/rate-limiter.ts`): su Vercel ogni istanza ha il proprio, quindi il limite effettivo è per-istanza e si azzera ai cold start. Regge un client insistente, non un attacco distribuito: per quello serve un contatore condiviso (Postgres/Redis) o un WAF.

- **Eventi di sicurezza**: `verifyAuth`, `unauthorized()`, `forbidden()`, il blocco CSRF e il rate limiter scrivono le anomalie in `security_events`, consultabili in `/dashboard/admin/platform-logs`.
- **Ogni route ha almeno un chiamante**: a ottobre 2026 sono state rimosse le route e i metodi che nessuna pagina richiamava (le pagine leggono e scrivono direttamente su Supabase). Prima di aggiungere una route o un metodo, verificare che il frontend li usi davvero; `/api/health` è l'unica eccezione voluta (monitoraggio).
