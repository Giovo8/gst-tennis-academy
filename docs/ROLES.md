# Sistema di ruoli e permessi

La piattaforma usa quattro ruoli utente, definiti dall'enum PostgreSQL `user_role` e salvati nella colonna `profiles.role`. Un solo ruolo primario per utente; il ruolo determina dashboard, API accessibili e policy RLS.

## I quattro ruoli

| Ruolo     | Dashboard            | Descrizione                                                                                |
| --------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `atleta`  | `/dashboard/atleta`  | Prenota campi e lezioni, segue corsi e tornei, partecipa all'Arena, usa chat e Bacheca     |
| `maestro` | `/dashboard/maestro` | Come l'atleta, più gestione delle lezioni che lo coinvolgono, corsi, video-lezioni         |
| `gestore` | `/dashboard/admin`   | Gestione operativa della struttura; nella quasi totalità delle API è equiparato ad `admin` |
| `admin`   | `/dashboard/admin`   | Accesso completo: utenti, campi, tornei, news/AI, avvisi, log                              |

Definizioni e helper in `src/lib/roles.ts`:

- `getDestinationForRole(role)` — destinazione post-login (`gestore` e `admin` condividono `/dashboard/admin`).
- `isAdminOrGestore(role)` — vero per `admin` **e** `gestore`: i due ruoli sono interscambiabili quasi ovunque. Nelle route con sessione via cookie si usa l'equivalente `isAdmin(role)` di `src/lib/auth/routeAuth.ts`.
- `isStaffRole(role)` — maestro, gestore o admin.
- `getSecondaryRoles(metadata)` e `isBookableCoachProfile(profile)` — **ruoli secondari**: un `gestore` con `maestro` in `profiles.metadata.secondary_roles` è prenotabile come coach, compare nella classifica Arena e vede la vista maestro nell'area admin.

## Capacità per ruolo (pagine reali)

### Atleta — `src/app/dashboard/atleta/(main)/`

| Sezione                                          | Pagina           |
| ------------------------------------------------ | ---------------- |
| Home: Bacheca avvisi, notizie, meteo, live score | `page.tsx`       |
| Prenotazioni campi/lezioni/partite di torneo     | `bookings/`      |
| Corsi (iscrizioni, calendario)                   | `corsi/`         |
| Arena (sfide 1v1, classifica, regole)            | `arena/`         |
| Tornei (iscrizione, tabellone, risultati)        | `tornei/`        |
| Video-lezioni assegnate                          | `videos/`        |
| Chat (messaggi diretti e gruppi)                 | `mail/`          |
| Dettaglio avviso della Bacheca                   | `avvisi/[id]`    |
| Feedback sulla web app                           | `feedback/`      |
| Profilo (avatar, certificato medico)             | `profile/`       |
| Centro notifiche                                 | `notifications/` |

### Maestro — `src/app/dashboard/maestro/(main)/`

Stesse sezioni dell'atleta (molte pagine riesportano direttamente quelle atleta), con in più:

- **Area Maestro** (`maestro/`): prossimi impegni e grafici delle lezioni (andamento, ore per giorno, fasce orarie).
- **Prenotazioni**: conferma/rifiuto delle lezioni private `pending` in cui è il maestro assegnato; spostamento delle prenotazioni che lo coinvolgono.
- **Corsi**: registro presenze e schede partecipanti dei propri corsi.
- **Video-lezioni**: creazione e assegnazione (`videos/new`).
- Iscrizione di atleti ai tornei.

I vecchi percorsi `/dashboard/coach/*` vengono rediretti a `/dashboard/maestro/*` (redirect in `next.config.ts`).

### Gestore e Admin — `src/app/dashboard/admin/`

| Sezione                                              | Pagina              |
| ---------------------------------------------------- | ------------------- |
| Home: timeline delle prenotazioni di tutti i campi   | `page.tsx`          |
| Utenti (dati, ruoli, reset password, eliminazione)   | `users/`            |
| Prenotazioni (elenco, dettaglio, creazione/modifica) | `bookings/`         |
| Corsi, lezioni e presenze                            | `corsi/`            |
| Blocchi campo                                        | `courts/`           |
| Tornei (creazione, avvio, tabellone, punteggi)       | `tornei/`           |
| News + generatore AI                                 | `news/`, `news/ai/` |
| Avvisi della Bacheca atleti                          | `avvisi/`           |
| Video-lezioni                                        | `video-lessons/`    |
| Staff (pagina pubblica)                              | `staff/`            |
| Codici invito                                        | `invite-codes/`     |
| Candidature lavora-con-noi                           | `job-applications/` |
| Feedback di atleti e maestri sulla web app           | `feedback/`         |
| Arena (gestione sfide, classifica, reset stagione)   | `(main)/arena/`     |
| Vista maestro (solo con ruolo secondario `maestro`)  | `maestro/`          |
| Log attività ed eventi di sicurezza                  | `platform-logs/`    |
| Chat                                                 | `chat/`             |
| Notifiche                                            | `notifications/`    |

`gestore` e `admin` condividono la stessa area. Le differenze sono puntuali: un gestore **non può creare né eliminare utenti admin** (`/api/admin/users`).

## Assegnazione del ruolo

- **Registrazione pubblica** (`POST /api/auth/signup`): solo con un codice invito valido; il ruolo è quello del codice e può essere solo `atleta` o `maestro`. Il ruolo inviato dal client viene ignorato.
- **Pannello admin** (`/dashboard/admin/users/new` → `POST /api/admin/users`): admin e gestore creano utenti con qualsiasi ruolo (il gestore non può creare admin).
- Il ruolo vive in `profiles.role`: un cambio ha effetto immediato su API e RLS.

## Dove vengono verificati i permessi

| Livello               | Meccanismo                                  | Natura                                      |
| --------------------- | ------------------------------------------- | ------------------------------------------- |
| API route             | `verifyAuth(req, ruoli)` / `getRouteAuth()` | Server-side, vincolante                     |
| Pagine `/dashboard/*` | Layout di area + `AuthGuard`                | Solo client-side (UX, non sicurezza)        |
| Database              | RLS + `get_my_role()`                       | Ultima linea di difesa (salvo service role) |

La protezione delle pagine è **solo client-side**: un utente con il ruolo sbagliato può vedere per un istante l'interfaccia prima del redirect, ma i dati restano protetti dalla RLS e dai controlli nelle API. Le route che usano la service role (`src/lib/supabase/serverClient.ts`) bypassano la RLS: lì l'autorizzazione dipende interamente dai controlli fatti nella route.

Il dettaglio dei tre livelli è in [ARCHITECTURE.md](ARCHITECTURE.md#autenticazione-e-autorizzazione); il ruolo richiesto da ogni route in [API.md](API.md); le policy in [DATABASE.md](DATABASE.md#row-level-security).
