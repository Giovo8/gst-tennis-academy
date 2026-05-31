# API Reference

Inventario completo degli endpoint API di GST Tennis Academy (~69 route handler in
`src/app/api/`). Tutte le rotte mutanti (POST/PUT/PATCH/DELETE) verso `/api/*` sono protette
da validazione CSRF nel middleware (eccetto `/api/webhooks/*`).

## Pattern di autenticazione

| Pattern | Descrizione |
|---------|-------------|
| **Sessione** | `verifyAuth(req)` / `getRouteAuth()` — richiede sessione valida via cookie |
| **Bearer token** | Header `Authorization: Bearer <token>` validato con `supabaseServer.auth.getUser()` |
| **Rate limited** | Limitazione per IP/endpoint (`src/lib/security/rate-limiter.ts`) |
| **Pubblico** | Nessuna autenticazione richiesta |

---

## Prenotazioni

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/bookings` | GET, POST, PATCH, DELETE | CRUD prenotazioni (filtri `id`/`user_id`/`coach_id`); RLS scoped | Sessione |
| `/api/bookings/availability` | GET | Disponibilità slot (modalità giornaliera o singolo slot) | Pubblico |
| `/api/bookings/batch` | POST | Creazione atomica di più prenotazioni con check conflitti + email/notifiche | Sessione |
| `/api/bookings/participants` | GET, POST | Partecipanti di una prenotazione (max 4) | Sessione |

## Tornei

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/tournaments` | GET, POST | Lista/creazione tornei (filtri `id`/`upcoming`/`type`/`includeCounts`) | GET pubblico / POST staff |
| `/api/tournaments/create` | POST | Creazione semplificata (3 tipi torneo) | Admin/Gestore |
| `/api/tournaments/[id]/start` | POST | Avvia torneo (inizializza la fase) | Admin/Gestore |
| `/api/tournaments/[id]/matches` | GET, POST | Partite del torneo (filtri `stage`/`status`) | GET pubblico / POST staff |
| `/api/tournaments/[id]/matches/[matchId]` | GET, PUT | Dettaglio/aggiornamento punteggio (validazione tennis) | PUT staff/partecipanti |
| `/api/tournaments/[id]/groups` | GET, POST | Gironi e classifiche | GET pubblico / POST staff |
| `/api/tournaments/[id]/generate-bracket` | POST | Genera tabellone eliminazione diretta | Admin/Gestore |
| `/api/tournaments/[id]/generate-championship` | POST | Genera tutte le partite del campionato (round-robin) | Admin/Gestore |
| `/api/tournaments/[id]/generate-groups` | POST | Genera gironi e partite (snake draft) | Bearer |
| `/api/tournaments/[id]/group-matches` | GET | Partite con filtri `group_id`/`phase` | Pubblico |
| `/api/tournaments/[id]/advance-stage` | POST | Avanza dai gironi al tabellone | Admin/Gestore |
| `/api/tournaments/[id]/advance-from-groups` | POST | Avanza i qualificati dalla fase a gironi | Admin/Gestore |
| `/api/tournaments/[id]/complete` | POST | Conclude il torneo | Admin/Gestore |
| `/api/tournaments/[id]/delete-matches` | DELETE | Elimina tutte le partite | Admin/Gestore |
| `/api/tournaments/[id]/knockout` | GET | Tabellone knockout per round | Pubblico |
| `/api/tournaments/stats` | GET | Statistiche tornei | Sessione |
| `/api/tournaments/reports` | GET | Report con statistiche giocatori | Pubblico |
| `/api/tournament_participants` | GET, POST | Iscrizioni torneo (maestro può iscrivere solo atleti) | GET pubblico / POST sessione |

## Arena

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/arena/players` | GET | Lista giocatori con stats (email solo admin) | Sessione |
| `/api/arena/challenges` | GET, POST | Sfide (filtri `user_id`/`status`); creazione | Sessione |
| `/api/arena/challenges/[id]` | GET | Dettaglio sfida | Sessione |
| `/api/arena/stats` | GET | Statistiche utente o classifica (`limit`) | Sessione |
| `/api/arena/reset-season` | POST | Reset stagione (`confirm: "RESET_ARENA_SEASON"`) | Admin |

## Chat e messaggi

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/chat-groups` | GET, POST | Gruppi chat dell'utente / creazione | Sessione |
| `/api/chat-groups/[id]` | GET, PATCH | Dettaglio / modifica (admin gruppo) | Sessione + membro |
| `/api/chat-groups/[id]/messages` | GET, POST | Messaggi del gruppo (paginati) | Sessione + membro |
| `/api/chat-groups/[id]/members` | POST, DELETE | Aggiungi membri (admin) / esci-rimuovi | Sessione |
| `/api/conversations` | GET | Conversazioni con unread e ultimo messaggio | Sessione |
| `/api/conversations/[id]` | GET | Dettaglio conversazione + messaggi | Sessione + partecipante |
| `/api/messages` | POST | Invia messaggio a una conversazione | Sessione |
| `/api/messages/[id]` | PUT | Modifica messaggio / marca letto | Sessione |
| `/api/messages/unread-count` | GET | Conteggio messaggi non letti | Sessione |
| `/api/messages/upload` | POST | Upload allegato (max 10MB, immagini/pdf, check magic bytes) | Sessione |
| `/api/internal-messages` | GET, POST | Messaggi interni (inbox/sent/all, ricerca) | Sessione |
| `/api/internal-messages/[id]` | GET, PATCH | Dettaglio + thread / marca letto | Sessione + interessato |

## Autenticazione e utenti

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/auth/signup` | POST | Registrazione con validazione password e invite code | Pubblico (rate limited) |
| `/api/users` | GET | Lista utenti filtrata per ruolo/capacità (`is_bookable_coach`) | Bearer |
| `/api/users/search` | GET | Ricerca utenti per messaggistica (`q` min 3 char) | Sessione (rate limited) |
| `/api/admin/users` | GET, POST | Lista / creazione utenti | Admin/Gestore (Bearer) |
| `/api/admin/users/reset-password` | POST | Invia email reset password | Admin/Gestore (Bearer) |

## Admin e statistiche

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/admin/stats` | GET | Statistiche dashboard admin | Admin |
| `/api/admin/video-lessons` | GET | Tutti i video con assegnazioni | Admin/Gestore |
| `/api/dashboard/stats` | GET | Statistiche dashboard specifiche per ruolo | Sessione |
| `/api/stats/coach` | GET | Statistiche maestro (`user_id`, check IDOR) | Sessione |
| `/api/stats/admin` | GET | Statistiche admin/gestore (utenti, prenotazioni, ricavi) | Admin/Gestore |

## News e contenuti

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/news` | GET, POST, PATCH, DELETE | News (pubblicate o tutte con `?all=true`) | GET pubblico / scrittura admin |
| `/api/staff` | GET, POST, PATCH, DELETE | Membri staff homepage | GET pubblico / scrittura admin |
| `/api/services` | GET, POST, PUT, DELETE | Servizi offerti | GET pubblico / scrittura admin/gestore |
| `/api/events` | GET, POST, PUT, DELETE | Eventi (filtri `id`/`event_type`/`upcoming`) | GET pubblico / scrittura admin |

## Notifiche

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/notifications` | GET, POST, PATCH | Notifiche utente (`user_id`, `unread_only`, check IDOR) | Sessione |
| `/api/notifications/notify-admins` | POST | Notifica tutti gli admin/gestori | Admin |

## Reclutamento e invite code

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/recruitment-applications` | GET, PATCH, DELETE | Candidature di lavoro | Admin |
| `/api/invite-codes` | GET, POST | Codici invito (`max_uses` 1–10000, scadenza) | Admin/Gestore (Bearer) |
| `/api/invite-codes/validate` | GET, POST | Valida / usa codice invito | Pubblico |
| `/api/invite-codes/[id]/uses` | GET | Utilizzi di un codice | Admin |
| `/api/invite-code-logs` | GET | Log di utilizzo codici (`limit`) | Admin |

## Campi, log e video

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/court-blocks` | GET, POST | Blocchi campo (con check conflitti) | Bearer / Admin-Gestore |
| `/api/activity-logs` | GET | Log attività (`limit`) | Admin |
| `/api/registration-logs` | GET | Log registrazioni | Admin |
| `/api/email-logs` | GET | Log consegna email (`limit` 1–200) | Admin |
| `/api/video-lessons` | GET | Video lezioni (filtri per ruolo) | Sessione |

## Utility ed esterni

| Endpoint | Metodi | Descrizione | Auth |
|----------|--------|-------------|------|
| `/api/health` | GET | Health check | Pubblico |
| `/api/weather` | GET | Previsioni meteo (Open-Meteo, cache 5min) | Pubblico (rate limited) |
| `/api/social/instagram` | GET | Post Instagram (oEmbed/scraping) | Pubblico |
| `/api/upload/news-image` | POST | Upload immagine news (protezione SSRF) | Admin |
| `/api/upload/staff-image` | POST | Upload immagine staff | Admin |
| `/api/email/scheduler` | GET/POST | Job email schedulato (cron giornaliero) | `CRON_SECRET` |
| `/api/webhooks/*` | POST | Webhook esterni (esenti da CSRF) | Firma/segreto |

---

## Note di sicurezza

1. **RLS**: prenotazioni e messaggi sono strettamente scoped all'utente.
2. **Protezione IDOR**: l'utente accede solo a notifiche/statistiche proprie salvo ruolo admin.
3. **Sanitizzazione input**: telefoni, UUID e query di ricerca sanitizzati lato server.
4. **Validazione MIME**: gli upload verificano MIME dichiarato e magic bytes effettivi.
5. **Protezione SSRF**: gli endpoint di upload bloccano gli IP privati.
6. **Service role**: usato per i flussi di registrazione/invite code che devono bypassare la RLS.
