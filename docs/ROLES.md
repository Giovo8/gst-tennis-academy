# Sistema di ruoli e permessi

La piattaforma usa quattro ruoli utente, definiti dall'enum PostgreSQL `user_role` e salvati nella colonna `profiles.role`. Un solo ruolo primario per utente; il ruolo determina dashboard, API accessibili e policy RLS.

## I quattro ruoli

| Ruolo | Dashboard | Descrizione |
|---|---|---|
| `atleta` | `/dashboard/atleta` | Prenota campi e lezioni, si iscrive a corsi e tornei, partecipa all'Arena, usa la chat |
| `maestro` | `/dashboard/maestro` | Gestisce le proprie lezioni e prenotazioni, corsi, video-lezioni e comunicazioni |
| `gestore` | `/dashboard/admin` | Gestione operativa della struttura; nella quasi totalità delle API è equiparato ad `admin` |
| `admin` | `/dashboard/admin` | Accesso completo: utenti, campi, tornei, news/AI, statistiche, log |

Definizioni e helper in `src/lib/roles.ts`:

- `roleLabels` — etichette UI (`maestro` è mostrato come "Coach").
- `roleDestinations` — destinazione post-login per ruolo (`gestore` e `admin` condividono `/dashboard/admin`).
- `isAdmin(role)` — vero per `admin` **e** `gestore`: i due ruoli sono interscambiabili quasi ovunque.
- `isCoach(role)`, `isStaffRole(role)`, `canManageUsers(role)` (quest'ultimo include anche `maestro`).
- `isBookableCoachProfile(profile)` — supporto ai **ruoli secondari**: un `gestore` con `maestro` in `secondary_roles` è prenotabile come coach.

## Capacità per ruolo (pagine reali)

### Atleta — `src/app/dashboard/atleta/(main)/`

| Sezione | Pagina |
|---|---|
| Prenotazioni campi/lezioni | `bookings/` |
| Corsi (iscrizioni, calendario) | `corsi/` |
| Arena (sfide 1v1, classifica) | `arena/` |
| Tornei (iscrizione, bracket) | `tornei/` |
| Video-lezioni assegnate | `videos/` |
| Comunicazioni | `mail/` |
| Profilo (avatar, certificato medico) | `profile/` |

### Maestro — `src/app/dashboard/maestro/(main)/`

Stesse sezioni dell'atleta (bookings, corsi, arena, tornei, videos, mail, profile) più la vista `maestro/` con gli strumenti da coach: conferma/rifiuto delle prenotazioni che lo coinvolgono, gestione dei propri corsi con registro presenze, assegnazione di video-lezioni.

I vecchi percorsi `/dashboard/coach/*` vengono rediretti a `/dashboard/maestro/*` (redirect in `next.config.ts`).

### Gestore e Admin — `src/app/dashboard/admin/`

| Sezione | Pagina |
|---|---|
| Utenti (dati, ruoli) | `users/` |
| Prenotazioni (tutte) | `bookings/` |
| Corsi | `corsi/` |
| Campi e blocchi | `courts/` |
| Tornei (creazione, bracket, punteggi) | `tornei/` |
| News + configurazione AI | `news/` |
| Video-lezioni | `video-lessons/` |
| Staff (pagina pubblica) | `staff/` |
| Codici invito | `invite-codes/` |
| Candidature lavora-con-noi | `job-applications/` |
| Statistiche | `statistiche/` |
| Log attività | `platform-logs/` |
| Chat (vista admin) | `chat/` |
| Notifiche | `notifications/` |

`gestore` e `admin` condividono la stessa area: nella maggior parte delle API il controllo è `allowedRoles: ["admin", "gestore"]` (o l'helper `isAdmin`). Le poche differenze sono puntuali e vanno verificate nelle singole route.

## Assegnazione del ruolo

- Alla registrazione (`POST /api/auth/signup`) il profilo nasce con ruolo `atleta`.
- I ruoli `maestro`, `gestore` e `admin` vengono assegnati da admin/gestore dalla pagina utenti (`/dashboard/admin/users`) oppure tramite codici invito con ruolo predefinito (tabella `invite_codes`).
- Il ruolo vive in `profiles.role` (enum `user_role`): un cambio ha effetto immediato su API e RLS.

## Dove vengono verificati i permessi

Tre livelli, dal più esterno al più interno.

### 1. API — `verifyAuth()` (server-side, vincolante)

`src/lib/auth/verifyAuth.ts`: verifica il Bearer token con Supabase e, se viene passato `allowedRoles`, confronta il ruolo del profilo. Ritorna un risultato tipizzato (`AuthSuccessResponse | AuthErrorResponse`): 401 per token mancante/non valido, 403 per ruolo insufficiente.

```ts
const auth = await verifyAuth(request, { allowedRoles: ["admin", "gestore"] });
if (!auth.success) return auth.response;
```

Variante cookie-based per le route che usano la sessione SSR: `getRouteAuth()` in `src/lib/auth/routeAuth.ts`, con gli helper `unauthorized()` / `forbidden()` e `isAdmin(role)`.

### 2. Pagine dashboard — `AuthGuard` (solo client-side)

`src/components/auth/AuthGuard.tsx` avvolge i layout delle dashboard: senza sessione redirige a `/login`; con ruolo diverso da quello atteso redirige alla dashboard corretta (`getDestinationForRole`).

**Limite noto**: la protezione delle pagine è **esclusivamente client-side**. Né il middleware (`src/middleware.ts`, che gestisce solo CSRF e refresh sessione) né i layout server verificano il ruolo. Un utente con ruolo sbagliato può quindi vedere brevemente il markup della pagina prima del redirect; i **dati** restano però protetti da RLS e dai controlli `verifyAuth` sulle API.

### 3. Database — RLS + `get_my_role()`

Row Level Security attiva su 50+ tabelle. Pattern ricorrenti:

- **Self-access**: `auth.uid() = user_id` (proprie prenotazioni, proprie notifiche, ecc.).
- **Role-based**: policy che usano `get_my_role()` (funzione SECURITY DEFINER che evita la ricorsione RLS su `profiles`) per concedere accesso a `admin`/`gestore` o `maestro`.
- **Ibride**: proprietario oppure staff (es. `booking_participants`: owner, coach coinvolto, admin/gestore).

Le route server che usano la **service role key** (`src/lib/supabase/serverClient.ts`) bypassano RLS: in quei casi l'autorizzazione dipende interamente dai controlli su ruolo e ownership fatti nella route.

## Riepilogo

| Livello | Meccanismo | Natura |
|---|---|---|
| API route | `verifyAuth(allowedRoles)` / `getRouteAuth()` | Server-side, vincolante |
| Pagine `/dashboard/*` | `AuthGuard` | Solo client-side (UX, non sicurezza) |
| Database | RLS + `get_my_role()` | Ultima linea di difesa (salvo service role) |
