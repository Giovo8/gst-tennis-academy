# Ruoli e permessi

GST Tennis Academy implementa un sistema **multi-ruolo** con quattro ruoli principali e una
gerarchia di permessi crescente.

```
Admin  >  Gestore  >  Maestro  >  Atleta
```

I ruoli sono definiti in `src/lib/roles.ts` e in `src/lib/constants/app.ts` (`USER_ROLES`).

---

## Ruoli

| Ruolo | Dashboard | Descrizione |
|-------|-----------|-------------|
| `atleta` | `/dashboard/atleta` | Utente finale: prenota campi/lezioni, partecipa a tornei e Arena |
| `maestro` | `/dashboard/maestro` | Allenatore: gestisce lezioni e corsi, appare nella selezione coach |
| `gestore` | `/dashboard/admin` | Amministratore operativo: gestione utenti, contenuti, tornei |
| `admin` | `/dashboard/admin` | Super admin: accesso completo, configurazione e log di sistema |

### Multi-ruolo

Un utente può avere **ruoli secondari** tramite i metadata (`secondary_roles`). Ad esempio un
`gestore` con `maestro` nei ruoli secondari diventa prenotabile come coach
(`isBookableCoachProfile`).

---

## Capacità per ruolo

### Atleta
- Prenotare campi, lezioni private e di gruppo; visualizzare e annullare le proprie prenotazioni.
- Iscriversi a corsi e tornei; consultare schede e calendari.
- Creare e gestire sfide Arena (accettare/rifiutare, inviare punteggi).
- Guardare i video assegnati; messaggiare con maestri e atleti.
- Gestire il proprio profilo e visualizzare le proprie statistiche.

**Non può**: gestire utenti, creare corsi/tornei, caricare video, accedere alle sezioni admin.

### Maestro
- Tutte le capacità dell'atleta, più:
- Visualizzare le prenotazioni degli studenti e gestire le lezioni.
- Creare e gestire corsi; vedere gli iscritti per corso.
- Gestire i propri video lezioni (creare/eliminare).
- Consultare statistiche di lezioni e atleti.

**Non può**: creare tornei, gestire utenti, accedere alle sezioni admin avanzate.

### Gestore
- Tutte le capacità di atleta e maestro, più:
- Gestione utenti completa (creare/modificare/eliminare); **non può creare admin**.
- Gestione completa di prenotazioni, corsi, tornei (partecipanti e punteggi).
- Gestione news, annunci, staff homepage, campi, video, invite code, candidature.
- Moderazione chat, statistiche di piattaforma, campagne email.

**Non può**: creare account admin, accedere alla configurazione di sistema, ai platform log o
alle impostazioni del server email.

### Admin
- Tutte le capacità del gestore, più:
- Creare e gestire account admin.
- Configurazione e impostazioni di sistema.
- Accesso a platform log e activity log.
- Configurazione e debug del sistema email.
- Design system demo e gallery media.

---

## Funzioni helper (`src/lib/roles.ts`)

| Funzione | Descrizione |
|----------|-------------|
| `isAdmin(role)` / `isAdminOrGestore(role)` | `true` per `admin` o `gestore` |
| `isCoach(role)` | `true` per `maestro`, `admin` o `gestore` |
| `isStaffRole(role)` | `true` per `maestro`, `gestore` o `admin` (case-insensitive) |
| `canManageUsers(role)` | `true` per `admin`, `gestore`, `maestro` |
| `isBookableCoachProfile(profile)` | Determina se il profilo è prenotabile come coach |
| `getSecondaryRoles(metadata)` | Estrae i ruoli secondari dai metadata |
| `getDestinationForRole(role)` | URL della dashboard per il ruolo |
| `roleLabels` / `roleDestinations` | Etichette (IT) e mapping delle rotte |

### Autenticazione (`src/lib/auth/`)

| Funzione | Descrizione |
|----------|-------------|
| `getRouteAuth()` | Recupera utente e ruolo dalla sessione cookie |
| `verifyAuth(req, allowedRoles?)` | Valida il Bearer token con controllo opzionale dei ruoli |
| `handleLogout()` | Logout lato client con logging dell'attività |

---

## Enforcement dei permessi

- **Lato database**: policy **RLS** basate su `get_my_role()` (vedi [DATABASE.md](DATABASE.md)).
- **Lato API**: `verifyAuth` / `getRouteAuth` con liste di ruoli ammessi.
- **Lato UI**: wrapper `AuthGuard` e redirect basati sul ruolo.
