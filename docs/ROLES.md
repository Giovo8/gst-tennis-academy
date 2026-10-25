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

- `roleLabels` — etichette UI (`maestro` è mostrato come "Coach").
- `getDestinationForRole(role)` — destinazione post-login (`gestore` e `admin` condividono `/dashboard/admin`).
- `isAdmin(role)` / `isAdminOrGestore(role)` — vero per `admin` **e** `gestore`: i due ruoli sono interscambiabili quasi ovunque.
- `isCoach(role)` (maestro o admin/gestore), `isStaffRole(role)` (maestro, gestore, admin), `canManageUsers(role)` (include anche `maestro`).
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

Tre livelli, dal più esterno al più interno.

### 1. API — server-side, vincolante

`verifyAuth(request, allowedRoles?)` (`src/lib/auth/verifyAuth.ts`) verifica il Bearer token con Supabase e, se viene passato l'array `allowedRoles`, confronta il ruolo del profilo: 401 per token mancante/non valido, 403 per ruolo non ammesso.

```ts
const auth = await verifyAuth(request, ['admin', 'gestore']);
if (!auth.success) return auth.response;
```

Variante cookie-based per le route chiamate dal browser senza header: `getRouteAuth()` (`src/lib/auth/routeAuth.ts`), con gli helper `isAdmin(role)`, `unauthorized()` e `forbidden()`. Il ruolo richiesto da ogni route è elencato in [API.md](API.md).

### 2. Pagine dashboard — solo client-side

I layout delle tre aree (`AthleteLayout`, `MaestroAthleteLayout`, `AdminLayout`) e, dove presente, `AuthGuard` (`src/components/auth/AuthGuard.tsx`) reindirizzano a `/login` senza sessione e alla dashboard corretta (`getDestinationForRole`) con un ruolo diverso.

**Limite noto**: la protezione delle pagine è **esclusivamente client-side**. Né il middleware (che gestisce CSRF, rate limiting e refresh sessione) né i layout server verificano il ruolo. Un utente con ruolo sbagliato può vedere per un istante l'interfaccia prima del redirect; i **dati** restano protetti da RLS e dai controlli nelle API.

### 3. Database — RLS + `get_my_role()`

Row Level Security attiva sulle tabelle applicative. Pattern ricorrenti:

- **Self-access**: `auth.uid() = user_id` (proprie prenotazioni, proprie notifiche, ecc.).
- **Role-based**: policy che usano `get_my_role()` (SECURITY DEFINER, evita la ricorsione RLS su `profiles`) per concedere accesso a `admin`/`gestore` o `maestro`.
- **Ibride**: proprietario oppure staff (es. `booking_participants`: owner, coach coinvolto, admin/gestore).
- **Chiuse**: RLS attiva senza policy (`feedback`, `feedback_risposte`, `avvisi`): accesso solo via API con service role.

Le route che usano la **service role key** (`src/lib/supabase/serverClient.ts`) bypassano la RLS: lì l'autorizzazione dipende interamente dai controlli su ruolo e ownership fatti nella route.

## Riepilogo

| Livello               | Meccanismo                                  | Natura                                      |
| --------------------- | ------------------------------------------- | ------------------------------------------- |
| API route             | `verifyAuth(req, ruoli)` / `getRouteAuth()` | Server-side, vincolante                     |
| Pagine `/dashboard/*` | Layout di area + `AuthGuard`                | Solo client-side (UX, non sicurezza)        |
| Database              | RLS + `get_my_role()`                       | Ultima linea di difesa (salvo service role) |
