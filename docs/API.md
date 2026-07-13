# API Reference

Inventario completo delle **89 API route** in `src/app/api/`, raggruppate per dominio, con metodi HTTP, autenticazione richiesta e descrizione. La colonna "Auth" è verificata leggendo il codice di ogni route.

Tutte le richieste mutanti (POST/PUT/PATCH/DELETE) verso `/api/*` passano inoltre dalla **protezione CSRF** del middleware (`src/middleware.ts`): se l'header `Origin` è presente e non è in whitelist, la richiesta è rifiutata con 403.

## Legenda autenticazione

| Valore | Significato |
|---|---|
| Nessuna | Endpoint pubblico, nessuna verifica |
| Bearer | Header `Authorization: Bearer <token>` (`verifyAuth` o verifica manuale del token) |
| Sessione | Cookie di sessione Supabase (`getRouteAuth` / `createClient` server) |
| + admin/gestore ecc. | Oltre all'autenticazione è richiesto il ruolo indicato |

`admin/gestore` corrisponde all'helper `isAdmin()` di `src/lib/auth/routeAuth.ts`, che considera equivalenti i due ruoli.

---

## Auth e registrazione

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/auth/signup` | POST | Nessuna (rate limited) | Registrazione utente con validazione Zod; ruoli consentiti solo `atleta` e `maestro`, supporto codice invito; invia email di notifica |
| `/api/invite-codes/validate` | GET | Nessuna | Valida un codice invito (esistenza, scadenza, usi residui) con service role |
| `/api/invite-codes/validate` | POST | Nessuna | Consuma il codice in fase di registrazione e fa upsert del profilo con service role (non verifica che il chiamante sia lo `user_id` del body — vulnerabilità nota) |

## Prenotazioni

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/bookings` | GET | Bearer | Elenco prenotazioni (filtrate per ruolo/utente) |
| `/api/bookings` | POST | Bearer | Crea prenotazione (campo, lezione privata/di gruppo); restrizioni orarie per atleti/maestri, lezioni private in stato `pending`, crediti settimanali |
| `/api/bookings` | PUT | Bearer | Modifica prenotazione con ricontrollo conflitti |
| `/api/bookings` | DELETE | Bearer | Annulla prenotazione; notifica l'atleta se annullata da gestore |
| `/api/bookings/availability` | GET | Nessuna | Disponibilità slot per campo/giorno; espone bookings, court_blocks e corsi (nessuna autenticazione — nota di sicurezza) |
| `/api/bookings/batch` | POST | Sessione | Creazione multipla di prenotazioni (es. ricorrenze) |
| `/api/bookings/confirm` | POST | Bearer + admin/gestore o maestro assegnato | Conferma una lezione privata `pending` dopo ricontrollo conflitti |
| `/api/bookings/reject` | POST | Bearer + admin/gestore o maestro assegnato | Rifiuta una lezione privata `pending` con notifica |
| `/api/bookings/participants` | GET, POST, DELETE | Bearer | Gestione partecipanti di una prenotazione (max 4, vincolo a livello DB) |
| `/api/court-blocks` | GET | Bearer | Elenco blocchi campo (manutenzione, eventi) |
| `/api/court-blocks` | POST, DELETE | Bearer + admin/gestore | Crea/elimina blocchi campo |

## Tornei

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/tournaments` | GET | Nessuna | Elenco/dettaglio tornei (usato anche dalle pagine pubbliche `/tornei`) |
| `/api/tournaments` | POST, PUT, DELETE | Bearer + gestore/admin | Crea/aggiorna/elimina torneo (JSONB `rounds_data`/`groups_data`) |
| `/api/tournaments/create` | POST | Bearer + gestore/admin | Creazione torneo (endpoint dedicato, validazione manuale) |
| `/api/tournaments/reports` | GET | Nessuna | Report aggregato tornei + partecipanti (nessuna autenticazione) |
| `/api/tournaments/stats` | GET | Sessione | Statistiche complessive tornei |
| `/api/tournaments/matches/[matchId]` | GET | Nessuna | Dettaglio match |
| `/api/tournaments/matches/[matchId]` | PUT | Bearer + gestore/admin | Aggiorna risultato match |
| `/api/tournaments/[id]/start` | POST | Bearer + gestore/admin | Avvia il torneo (transizione di stato) |
| `/api/tournaments/[id]/complete` | POST | Bearer + admin/gestore | Chiude il torneo |
| `/api/tournaments/[id]/advance-stage` | POST | Sessione + admin/gestore | Avanza alla fase successiva |
| `/api/tournaments/[id]/advance-from-groups` | POST | Bearer + admin/gestore | Passa da gironi a eliminazione diretta |
| `/api/tournaments/[id]/generate-bracket` | POST | Bearer + gestore/admin | Genera il tabellone a eliminazione |
| `/api/tournaments/[id]/generate-groups` | POST | Bearer + admin/gestore | Genera i gironi |
| `/api/tournaments/[id]/generate-championship` | POST | Bearer + admin/gestore | Genera il calendario round robin |
| `/api/tournaments/[id]/groups` | GET | Nessuna | Gironi con partecipanti e classifiche |
| `/api/tournaments/[id]/groups` | POST | Sessione + admin/gestore | Crea/aggiorna gironi |
| `/api/tournaments/[id]/group-matches` | GET | Nessuna | Match dei gironi (filtri per girone/fase) |
| `/api/tournaments/[id]/group-matches` | POST | Bearer + gestore/admin | Crea/aggiorna match dei gironi |
| `/api/tournaments/[id]/knockout` | GET | Nessuna | Tabellone a eliminazione organizzato per round |
| `/api/tournaments/[id]/matches` | GET | Nessuna | Match del torneo (filtri stage/status) |
| `/api/tournaments/[id]/matches` | POST | Sessione + admin/gestore | Crea match |
| `/api/tournaments/[id]/matches/[matchId]` | GET | Nessuna | Dettaglio match con punteggio tennis |
| `/api/tournaments/[id]/matches/[matchId]` | PUT | Bearer + admin/gestore | Aggiorna punteggio/vincitore |
| `/api/tournaments/[id]/matches/[matchId]` | PATCH, DELETE | Sessione + admin/gestore | Modifica parziale / eliminazione match |
| `/api/tournaments/[id]/delete-matches` | DELETE | Bearer + gestore/admin | Elimina tutti i match del torneo (reset) |
| `/api/tournament_participants` | GET | Nessuna | Elenco iscritti (filtri user_id/tournament_id) |
| `/api/tournament_participants` | POST, DELETE | Bearer | Iscrizione/disiscrizione: l'atleta per sé, admin/gestore per chiunque |
| `/api/tournament_participants` | PATCH | Bearer + gestore/admin | Aggiorna dati partecipante (seed, stato) |

## Arena (sfide 1v1)

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/arena/challenges` | GET | Sessione | Elenco sfide (filtri user/status) o dettaglio singolo |
| `/api/arena/challenges` | POST | Sessione | Crea sfida; per conto di altri solo admin/gestore (che la creano già `accepted`) |
| `/api/arena/challenges` | PATCH, PUT, DELETE | **Nessuna** | Aggiorna stato/punteggio o elimina sfida — **manca la verifica di autenticazione** (protetti solo dal CSRF check del middleware; nota di sicurezza) |
| `/api/arena/challenges/[id]` | GET | Sessione | Dettaglio sfida arricchito |
| `/api/arena/players` | GET | Bearer | Giocatori Arena con statistiche |
| `/api/arena/stats` | GET | Sessione | Classifica/statistiche Arena |
| `/api/arena/stats` | POST | Sessione + admin/gestore | Ricalcolo/gestione statistiche |
| `/api/arena/reset-season` | POST | Sessione + admin/gestore | Reset stagione (azzera classifica) |

## Notizie AI

Tutte le route del modulo richiedono **sessione + admin/gestore** tramite `requireAdminOrGestore()` (`src/lib/ai-news/auth.ts`).

| Route | Metodi | Descrizione |
|---|---|---|
| `/api/ai-news/config` | GET, POST | Configurazione (pubblicazione automatica) |
| `/api/ai-news/genera` | POST | Genera bozze: fetch RSS dalle fonti attive, dedup su `fonte_url`, riscrittura con Gemini (fallback a solo RSS) |
| `/api/ai-news/bozze` | GET | Elenco bozze in attesa di revisione |
| `/api/ai-news/[id]/approva` | PATCH | Approva e pubblica la bozza |
| `/api/ai-news/[id]/modifica` | PATCH | Modifica il contenuto della bozza |
| `/api/ai-news/[id]/scarta` | PATCH | Scarta la bozza |
| `/api/ai-news/fonti` | GET, POST | Elenco/creazione fonti RSS (`ai_news_fonti`) |
| `/api/ai-news/fonti/[id]` | PATCH, DELETE | Aggiorna/elimina fonte (le predefinite non sono eliminabili) |
| `/api/ai-news/fonti/[id]/test` | GET | Testa il parsing del feed della fonte |
| `/api/ai-news/cron` | GET, POST | Elenco/creazione schedulazioni (`ai_news_cron`) |
| `/api/ai-news/cron/[id]` | PATCH, DELETE | Aggiorna/elimina schedulazione (sincronizza `pg_cron`) |
| `/api/ai-news/cron/[id]/esegui` | POST | Esecuzione manuale immediata di una schedulazione |
| `/api/ai-news/cron/sync` | POST | Risincronizza tutti i job `pg_cron` con la tabella |
| `/api/ai-news/logs` | GET | Log delle generazioni (`ai_news_generation_logs`) |
| `/api/ai-news/cleanup` | POST | Pulizia/traduzione EN→IT delle news esistenti via Gemini |

## Chat e messaggistica

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/conversations` | GET, POST | Sessione | Elenco conversazioni dell'utente / crea (o recupera) conversazione 1:1 |
| `/api/conversations/[id]` | GET, PUT | Sessione (partecipante) | Messaggi e aggiornamento conversazione |
| `/api/conversations/[id]` | DELETE | Sessione (partecipante o admin/gestore) | Elimina conversazione |
| `/api/messages` | POST | Sessione | Invia messaggio in una conversazione |
| `/api/messages/[id]` | PUT | Sessione (autore) | Modifica messaggio |
| `/api/messages/[id]` | DELETE | Sessione (autore o admin/gestore) | Elimina messaggio |
| `/api/messages/unread-count` | GET | Sessione | Conteggio messaggi non letti |
| `/api/messages/upload` | POST | Sessione | Upload allegati (bucket `chat-attachments`) |
| `/api/internal-messages` | GET, POST | Sessione | Casella messaggi interni (stile mail) |
| `/api/internal-messages/[id]` | GET, PATCH, DELETE | Sessione | Lettura/aggiornamento/eliminazione messaggio interno |
| `/api/chat-groups` | GET, POST | Bearer | Elenco gruppi dell'utente / crea gruppo |
| `/api/chat-groups/[id]` | GET | Bearer (membro) | Dettaglio gruppo |
| `/api/chat-groups/[id]` | PATCH, DELETE | Bearer (admin del gruppo) | Rinomina/elimina gruppo |
| `/api/chat-groups/[id]/members` | POST, PATCH, DELETE | Bearer (admin del gruppo; uscita self consentita) | Gestione membri e ruoli del gruppo |
| `/api/chat-groups/[id]/messages` | GET, POST | Bearer (membro) | Messaggi del gruppo |

## Notifiche

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/notifications` | GET | Sessione (per altri utenti solo admin/gestore) | Notifiche dell'utente |
| `/api/notifications` | POST | Sessione | Crea notifica — non verifica che il `user_id` destinatario sia lecito (vulnerabilità nota) |
| `/api/notifications` | PATCH, DELETE | Sessione | Segna come letta / elimina |
| `/api/notifications/notify-admins` | POST | Sessione + admin/gestore | Invia notifica a tutti gli admin/gestori |

## Utenti e amministrazione

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/users` | GET | Bearer | Elenco utenti per prenotazioni/iscrizioni (atleti vedono i maestri prenotabili) |
| `/api/users/search` | GET | Sessione (rate limited) | Ricerca utenti per la chat (query sanificata, Zod) |
| `/api/admin/users` | GET, POST, PATCH, DELETE | Bearer + admin/gestore | CRUD utenti; il gestore non può promuovere ad admin né eliminare admin |
| `/api/admin/users/reset-password` | POST | Bearer + admin/gestore | Reset password di un utente |
| `/api/admin/stats` | GET | Sessione + admin/gestore | Statistiche dashboard admin |
| `/api/admin/video-lessons` | GET | Bearer + admin/gestore | Vista amministrativa delle video-lezioni |
| `/api/stats/admin` | GET | Sessione + admin/gestore | Statistiche aggregate (prenotazioni, utenti) |
| `/api/stats/coach` | GET | Sessione (self o admin/gestore) | Statistiche del maestro |
| `/api/dashboard/stats` | GET | Sessione | Statistiche della dashboard, calcolate in base al ruolo |
| `/api/staff` | GET | Nessuna | Elenco staff pubblico (variante `?all=true` inclusa, senza check aggiuntivo) |
| `/api/staff` | POST, PATCH, DELETE | Sessione + admin/gestore | Gestione membri staff |
| `/api/invite-codes` | GET, POST, DELETE | Bearer + admin/gestore | Gestione codici invito |
| `/api/invite-codes/[id]/uses` | GET | Sessione + admin/gestore | Utilizzi di un codice invito |
| `/api/invite-code-logs` | GET | **Nessuna** | Log utilizzi codici invito — **manca la verifica di autenticazione** (nota di sicurezza) |
| `/api/registration-logs` | GET | Sessione + admin/gestore | Log registrazioni |
| `/api/activity-logs` | GET | Sessione + admin/gestore | Log attività (`activity_log`) |
| `/api/email-logs` | GET | Sessione + admin/gestore | Esiti invii email (`email_logs`) |
| `/api/recruitment-applications` | GET, PATCH, DELETE | Sessione + admin/gestore | Gestione candidature "lavora con noi" |

## Contenuti

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/news` | GET | Nessuna | News pubblicate (con `?all=true` restituisce anche le bozze; cache solo sulla variante pubblica) |
| `/api/news` | POST, PATCH, DELETE | Sessione + admin/gestore | CRUD news |
| `/api/events` | GET | Nessuna | Eventi (filtri tipo/futuri) |
| `/api/events` | POST, PUT, DELETE | Sessione + admin/gestore | CRUD eventi |
| `/api/services` | GET | Nessuna | Servizi dell'accademia |
| `/api/services` | POST, PUT, DELETE | Bearer + admin/gestore | CRUD servizi |
| `/api/video-lessons` | GET | Bearer | Video-lezioni visibili in base al ruolo (atleta: assegnate; maestro: proprie; admin: tutte) |
| `/api/video-lessons` | POST | Bearer + admin/gestore/maestro | Crea video-lezione |
| `/api/video-lessons` | PUT | Bearer | Aggiorna (staff o maestro proprietario, con controlli interni) |
| `/api/video-lessons` | DELETE | Bearer + admin/gestore | Elimina video-lezione |

## Upload

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/upload/news-image` | POST | **Nessuna** | Upload immagine news (file o URL esterno con protezione SSRF) — **manca la verifica di autenticazione** (nota di sicurezza) |
| `/api/upload/staff-image` | POST | Sessione (self; admin/gestore per altri utenti) | Upload avatar/foto staff (bucket `avatars`) |
| `/api/upload/certificate` | POST | Sessione (self; admin/gestore per altri utenti) | Upload certificato medico (bucket `certificates`) |

## Utilità e integrazioni

| Route | Metodi | Auth | Descrizione |
|---|---|---|---|
| `/api/health` | GET | Nessuna | Health check (`{ status: "ok" }`) |
| `/api/weather` | GET | Nessuna (rate limited) | Meteo via Open-Meteo, cache 5 minuti |
| `/api/social/instagram` | GET | Nessuna | Feed Instagram via oEmbed Meta (token opzionale, fallback scraping) |

---

## Note trasversali

- **Route senza autenticazione che dovrebbero averla** (rilevate a luglio 2026, da correggere): `PATCH/PUT/DELETE /api/arena/challenges`, `GET /api/invite-code-logs`, `POST /api/upload/news-image`, `GET /api/bookings/availability` (information disclosure), `POST /api/invite-codes/validate` (upsert profilo senza ownership check), `GET /api/tournaments/reports`.
- **Rate limiting** (`src/lib/security/rate-limiter.ts`, in-memory): applicato a signup, ricerca utenti, weather e ad alcune route bookings/tournaments. Non copre il login (gestito client-side da Supabase Auth).
- La directory `src/app/api/email/scheduler/` esiste ma è vuota: non è una route attiva e non è conteggiata tra le 89.
