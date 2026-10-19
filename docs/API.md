# API Reference

Inventario completo delle **60 API route** in `src/app/api/`, raggruppate per dominio, con metodi HTTP, autenticazione richiesta e descrizione. La colonna "Auth" è verificata leggendo il codice di ogni route.

Tutte le richieste mutanti (POST/PUT/PATCH/DELETE) verso `/api/*` passano inoltre dalla **protezione CSRF** del middleware (`src/middleware.ts`): se l'header `Origin` è presente e non è in whitelist, la richiesta è rifiutata con 403.

## Legenda autenticazione

| Valore               | Significato                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| Nessuna              | Endpoint pubblico, nessuna verifica                                                |
| Bearer               | Header `Authorization: Bearer <token>` (`verifyAuth` o verifica manuale del token) |
| Sessione             | Cookie di sessione Supabase (`getRouteAuth` / `createClient` server)               |
| + admin/gestore ecc. | Oltre all'autenticazione è richiesto il ruolo indicato                             |

`admin/gestore` corrisponde all'helper `isAdmin()` di `src/lib/auth/routeAuth.ts`, che considera equivalenti i due ruoli.

---

## Auth e registrazione

| Route                        | Metodi | Auth                   | Descrizione                                                                                                                                                                                                                      |
| ---------------------------- | ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/signup`           | POST   | Nessuna (rate limited) | Registrazione solo su invito: codice obbligatorio e validato (esistenza, scadenza, usi residui); il ruolo viene dal codice, non dal client, e può essere solo `atleta` o `maestro`. Consuma il codice e invia l'email ai gestori |
| `/api/invite-codes/validate` | GET    | Nessuna                | Valida un codice invito (esistenza, scadenza, usi residui) con service role                                                                                                                                                      |

## Prenotazioni

| Route                              | Metodi | Auth                                       | Descrizione                                                                                                                                                                   |
| ---------------------------------- | ------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/bookings`                    | GET    | Bearer                                     | Elenco prenotazioni (filtrate per ruolo/utente)                                                                                                                               |
| `/api/bookings`                    | POST   | Bearer                                     | Crea prenotazione (campo, lezione privata/di gruppo); restrizioni orarie per atleti/maestri, lezioni private in stato `pending`, partite di torneo (tipo `torneo`)            |
| `/api/bookings`                    | PUT    | Bearer                                     | Modifica prenotazione con ricontrollo conflitti                                                                                                                               |
| `/api/bookings`                    | DELETE | Bearer                                     | Annulla prenotazione; notifica l'atleta se annullata da gestore                                                                                                               |
| `/api/bookings/availability`       | GET    | Sessione                                   | Occupazioni di un campo in un giorno (`?date=YYYY-MM-DD&court=`): prenotazioni confermate, blocchi e corsi, senza dati personali                                              |
| `/api/bookings/confirm`            | POST   | Bearer + admin/gestore o maestro assegnato | Conferma una lezione privata `pending` dopo ricontrollo conflitti                                                                                                             |
| `/api/bookings/reject`             | POST   | Bearer + admin/gestore o maestro assegnato | Rifiuta una lezione privata `pending` con notifica                                                                                                                            |
| `/api/bookings/tournament-matches` | GET    | Bearer                                     | Senza parametri: tornei in corso prenotabili. Con `?tournament_id=`: partite aperte da prenotare. Atleti e maestri vedono solo i propri tornei e partite, admin/gestore tutto |

## Tornei

| Route                                         | Metodi            | Auth                     | Descrizione                                                                                                 |
| --------------------------------------------- | ----------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `/api/tournaments`                            | GET               | Nessuna                  | Elenco/dettaglio tornei (usato anche dalle pagine pubbliche `/tornei`)                                      |
| `/api/tournaments`                            | POST, PUT, DELETE | Bearer + gestore/admin   | Crea/aggiorna/elimina torneo (JSONB `rounds_data`/`groups_data`)                                            |
| `/api/tournaments/create`                     | POST              | Bearer + gestore/admin   | Creazione torneo (endpoint dedicato, validazione manuale)                                                   |
| `/api/tournaments/[id]/start`                 | POST              | Bearer + gestore/admin   | Avvia il torneo (transizione di stato)                                                                      |
| `/api/tournaments/[id]/complete`              | POST              | Bearer + admin/gestore   | Chiude il torneo                                                                                            |
| `/api/tournaments/[id]/advance-from-groups`   | POST              | Bearer + admin/gestore   | Passa da gironi a eliminazione diretta                                                                      |
| `/api/tournaments/[id]/generate-bracket`      | POST              | Bearer + gestore/admin   | Genera il tabellone a eliminazione                                                                          |
| `/api/tournaments/[id]/generate-groups`       | POST              | Bearer + admin/gestore   | Genera i gironi                                                                                             |
| `/api/tournaments/[id]/generate-championship` | POST              | Bearer + admin/gestore   | Genera il calendario round robin                                                                            |
| `/api/tournaments/[id]/groups`                | GET               | Nessuna                  | Gironi con partecipanti e classifiche                                                                       |
| `/api/tournaments/[id]/groups`                | POST              | Sessione + admin/gestore | Crea/aggiorna gironi                                                                                        |
| `/api/tournaments/[id]/group-matches`         | GET               | Nessuna                  | Match dei gironi (filtri per girone/fase)                                                                   |
| `/api/tournaments/[id]/group-matches`         | POST              | Bearer + gestore/admin   | Crea/aggiorna match dei gironi                                                                              |
| `/api/tournaments/[id]/matches/[matchId]`     | GET               | Nessuna                  | Dettaglio match con punteggio tennis                                                                        |
| `/api/tournaments/[id]/matches/[matchId]`     | PUT               | Bearer + admin/gestore   | Aggiorna punteggio/vincitore                                                                                |
| `/api/tournaments/[id]/matches/[matchId]`     | PATCH, DELETE     | Sessione + admin/gestore | Modifica parziale / eliminazione match                                                                      |
| `/api/tournaments/[id]/delete-matches`        | DELETE            | Bearer + gestore/admin   | Elimina tutti i match del torneo (reset)                                                                    |
| `/api/tournaments/[id]/scheduled-matches`     | GET               | Nessuna                  | Partite prenotate in arrivo di un torneo in corso (sezione "In programma"): solo nomi, turno, campo e orari |
| `/api/tournament_participants`                | GET               | Nessuna                  | Elenco iscritti (filtri user_id/tournament_id)                                                              |
| `/api/tournament_participants`                | POST, DELETE      | Bearer                   | Iscrizione/disiscrizione: l'atleta per sé, admin/gestore per chiunque                                       |
| `/api/tournament_participants`                | PATCH             | Bearer + gestore/admin   | Aggiorna dati partecipante (seed, stato)                                                                    |

## Arena (sfide 1v1)

| Route                        | Metodi     | Auth                                             | Descrizione                                                                      |
| ---------------------------- | ---------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `/api/arena/challenges`      | GET        | Sessione                                         | Elenco sfide (filtri user/status) o dettaglio singolo                            |
| `/api/arena/challenges`      | POST       | Sessione                                         | Crea sfida; per conto di altri solo admin/gestore (che la creano già `accepted`) |
| `/api/arena/challenges`      | PATCH, PUT | Sessione (giocatori della sfida o admin/gestore) | Aggiorna stato, punteggio, prenotazione collegata                                |
| `/api/arena/challenges`      | DELETE     | Sessione (sfidante o admin/gestore)              | Elimina la sfida                                                                 |
| `/api/arena/challenges/[id]` | GET        | Sessione                                         | Dettaglio sfida arricchito                                                       |
| `/api/arena/players`         | GET        | Bearer                                           | Giocatori Arena con statistiche                                                  |
| `/api/arena/stats`           | GET        | Sessione                                         | Classifica/statistiche Arena                                                     |
| `/api/arena/stats`           | POST       | Sessione + admin/gestore                         | Ricalcolo/gestione statistiche                                                   |
| `/api/arena/reset-season`    | POST       | Sessione + admin/gestore                         | Reset stagione (azzera classifica)                                               |

## Notizie AI

Tutte le route del modulo richiedono **sessione + admin/gestore** tramite `requireAdminOrGestore()` (`src/lib/ai-news/auth.ts`).

| Route                           | Metodi        | Descrizione                                                                                                    |
| ------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `/api/ai-news/config`           | GET, POST     | Configurazione (pubblicazione automatica)                                                                      |
| `/api/ai-news/genera`           | POST          | Genera bozze: fetch RSS dalle fonti attive, dedup su `fonte_url`, riscrittura con Gemini (fallback a solo RSS) |
| `/api/ai-news/bozze`            | GET           | Elenco bozze in attesa di revisione                                                                            |
| `/api/ai-news/[id]/approva`     | PATCH         | Approva e pubblica la bozza                                                                                    |
| `/api/ai-news/[id]/modifica`    | PATCH         | Modifica il contenuto della bozza                                                                              |
| `/api/ai-news/[id]/scarta`      | PATCH         | Scarta la bozza                                                                                                |
| `/api/ai-news/fonti`            | GET, POST     | Elenco/creazione fonti RSS (`ai_news_fonti`)                                                                   |
| `/api/ai-news/fonti/[id]`       | PATCH, DELETE | Aggiorna/elimina fonte (le predefinite non sono eliminabili)                                                   |
| `/api/ai-news/fonti/[id]/test`  | GET           | Testa il parsing del feed della fonte                                                                          |
| `/api/ai-news/cron`             | GET, POST     | Elenco/creazione schedulazioni (`ai_news_cron`)                                                                |
| `/api/ai-news/cron/[id]`        | PATCH, DELETE | Aggiorna/elimina schedulazione (sincronizza `pg_cron`)                                                         |
| `/api/ai-news/cron/[id]/esegui` | POST          | Esecuzione manuale immediata di una schedulazione                                                              |
| `/api/ai-news/cron/sync`        | POST          | Risincronizza tutti i job `pg_cron` con la tabella                                                             |
| `/api/ai-news/logs`             | GET           | Log delle generazioni (`ai_news_generation_logs`)                                                              |
| `/api/ai-news/cleanup`          | POST          | Pulizia/traduzione EN→IT delle news esistenti via Gemini                                                       |

## Chat e messaggistica

La chat delle dashboard (`/dashboard/*/mail`, `/dashboard/admin/chat`) legge e scrive i messaggi diretti su `internal_messages` direttamente via Supabase; le API servono solo per i gruppi.

| Route                            | Metodi              | Auth                                              | Descrizione                             |
| -------------------------------- | ------------------- | ------------------------------------------------- | --------------------------------------- |
| `/api/chat-groups`               | GET, POST           | Bearer                                            | Elenco gruppi dell'utente / crea gruppo |
| `/api/chat-groups/[id]/members`  | POST, PATCH, DELETE | Bearer (admin del gruppo; uscita self consentita) | Gestione membri e ruoli del gruppo      |
| `/api/chat-groups/[id]/messages` | GET, POST           | Bearer (membro)                                   | Messaggi del gruppo                     |

## Notifiche

| Route                | Metodi | Auth     | Descrizione                                                                                                                                                                                                                 |
| -------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/notifications` | POST   | Sessione | Crea una notifica per un altro utente (usata da `createNotification()`). Link accettati solo interni (`/...`), lunghezze massime, tipo `[a-z_]`. Lettura e aggiornamento delle notifiche avvengono direttamente su Supabase |

## Utenti e amministrazione

| Route                             | Metodi                   | Auth                              | Descrizione                                                                                                                 |
| --------------------------------- | ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/api/users`                      | GET                      | Bearer                            | Elenco utenti per prenotazioni/iscrizioni (atleti vedono i maestri prenotabili)                                             |
| `/api/admin/users`                | GET, POST, PATCH, DELETE | Bearer + admin/gestore            | CRUD utenti; il gestore non può promuovere ad admin né eliminare admin                                                      |
| `/api/admin/users/reset-password` | POST                     | Bearer + admin/gestore            | Reset password di un utente                                                                                                 |
| `/api/admin/video-lessons`        | GET                      | Bearer + admin/gestore            | Vista amministrativa delle video-lezioni                                                                                    |
| `/api/invite-codes/[id]/uses`     | GET                      | Sessione + admin/gestore          | Utilizzi di un codice invito                                                                                                |
| `/api/activity-logs`              | GET                      | Sessione + admin/gestore          | Log attività (`activity_log`)                                                                                               |
| `/api/security-events`            | GET                      | Sessione + admin/gestore          | Eventi di sicurezza (`security_events`) + riepilogo IP più attivi nelle 24h. Filtri: `limit` (max 1000), `tipo`, `severita` |
| `/api/recruitment-applications`   | GET, PATCH, DELETE       | Sessione + admin/gestore          | Gestione candidature "lavora con noi"                                                                                       |
| `/api/feedback`                   | GET, POST                | Sessione + atleta/maestro         | Invio feedback sulla web app (notifica gli admin) e lista dei propri                                                        |
| `/api/feedback/[id]`              | GET                      | Sessione + atleta/maestro         | Dettaglio di un proprio feedback (404 se di un altro utente)                                                                |
| `/api/feedback/[id]/risposte`     | GET, POST                | Sessione + autore o admin/gestore | Conversazione sul feedback; notifica l'altra parte                                                                          |
| `/api/admin/feedback`             | GET                      | Sessione + admin/gestore          | Elenco feedback con autore; filtri `stato`, `categoria`                                                                     |
| `/api/admin/feedback/[id]`        | GET, PATCH, DELETE       | Sessione + admin/gestore          | Dettaglio (segna come letto), cambio stato, eliminazione                                                                    |

## Contenuti

| Route                | Metodi | Auth                           | Descrizione                                                                                 |
| -------------------- | ------ | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `/api/video-lessons` | GET    | Bearer                         | Video-lezioni visibili in base al ruolo (atleta: assegnate; maestro: proprie; admin: tutte) |
| `/api/video-lessons` | POST   | Bearer + admin/gestore/maestro | Crea video-lezione                                                                          |
| `/api/video-lessons` | PUT    | Bearer                         | Aggiorna (staff o maestro proprietario, con controlli interni)                              |
| `/api/video-lessons` | DELETE | Bearer + admin/gestore         | Elimina video-lezione                                                                       |

## Upload

| Route                     | Metodi | Auth                                            | Descrizione                                                                                      |
| ------------------------- | ------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/api/upload/news-image`  | POST   | Sessione + admin/gestore                        | Upload immagine news (file o URL esterno: blocco di host locali e reti private, niente redirect) |
| `/api/upload/staff-image` | POST   | Sessione (self; admin/gestore per altri utenti) | Upload avatar/foto staff (bucket `avatars`)                                                      |
| `/api/upload/certificate` | POST   | Sessione (self; admin/gestore per altri utenti) | Upload certificato medico (bucket `certificates`)                                                |

## Utilità e integrazioni

| Route              | Metodi | Auth                   | Descrizione                                                                                                |
| ------------------ | ------ | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/api/health`      | GET    | Nessuna                | Health check (`{ status: "ok" }`)                                                                          |
| `/api/weather`     | GET    | Nessuna (rate limited) | Meteo via Open-Meteo, cache 5 minuti                                                                       |
| `/api/live-tennis` | GET    | Nessuna (rate limited) | Partite ATP/WTA del giorno e in corso (`?date=YYYY-MM-DD`, ora italiana) dallo scoreboard ESPN, cache 30 s |

---

## Note trasversali

- **Autenticazione**: tutte le route richiedono una sessione tranne quelle pubbliche per scelta: `/api/health`, `/api/weather`, `/api/live-tennis`, `GET /api/tournaments` e sottopercorsi di sola lettura, `GET /api/tournament_participants`, `GET /api/invite-codes/validate` e `POST /api/auth/signup` (registrazione). Le falle segnalate a luglio 2026 sono state chiuse a ottobre 2026; la policy RLS che rendeva pubblici i codici invito si rimuove con la migrazione 089.
- **Rate limiting**: applicato **a tutte le route `/api/*`** dal middleware, secondo le regole per path in `src/lib/security/rateLimitRules.ts` (auth e upload stretti, `/api/ai-news/genera` a 5/ora, default 300/min in lettura e 60/min in scrittura). Bucket separati per gruppo di endpoint, così path diversi non condividono il contatore. Esclusi i webhook, che sono chiamate server-to-server da un solo IP. Le route con un `applyRateLimit` interno (signup, bookings, tournaments, weather, live-tennis) mantengono il proprio limite più stretto: i due livelli si sommano.

  Superato il limite la risposta è `429` con header `Retry-After` e viene registrato un evento in `security_events` (solo al primo superamento della finestra, non a ogni tentativo).

  ⚠️ Il contatore è in memoria (`src/lib/security/rate-limiter.ts`): su Vercel ogni istanza ha il proprio, quindi il limite effettivo è per-istanza e si azzera ai cold start. Regge un client insistente, non un attacco distribuito — per quello serve un contatore condiviso (Postgres/Redis) o un WAF.

- **Ogni route ha almeno un chiamante**: a ottobre 2026 sono state rimosse 33 route che nessuna pagina richiamava (le pagine leggono e scrivono direttamente su Supabase). Prima di aggiungere una route, verificare che il frontend la usi davvero; `/api/health` è l'unica eccezione voluta (monitoraggio).
