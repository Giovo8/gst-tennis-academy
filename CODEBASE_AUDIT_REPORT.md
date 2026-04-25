# GST Tennis Academy — Audit Completo della Codebase

**Data:** 28 Marzo 2026  
**Scope:** Analisi completa di codice duplicato, file inutilizzati, configurazione, sicurezza e possibili miglioramenti

---

## Indice

1. [Riepilogo Esecutivo](#1-riepilogo-esecutivo)
2. [Pagine Duplicate tra Dashboard (CRITICO)](#2-pagine-duplicate-tra-dashboard)
3. [Codice Duplicato in src/lib (CRITICO)](#3-codice-duplicato-in-srclib)
4. [Componenti Duplicati/Inutilizzati (ALTO)](#4-componenti-duplicatiinutilizzati)
5. [API Routes — Debug e Cartelle Vuote (CRITICO)](#5-api-routes--debug-e-cartelle-vuote)
6. [Dipendenze Non Utilizzate (MEDIO)](#6-dipendenze-non-utilizzate)
7. [File Root e Script da Rimuovere (BASSO)](#7-file-root-e-script-da-rimuovere)
8. [CSS Duplicato e Problemi di Stile (MEDIO)](#8-css-duplicato-e-problemi-di-stile)
9. [Configurazione TypeScript/ESLint (ALTO)](#9-configurazione-typescripteslint)
10. [Piano d'Azione Prioritizzato](#10-piano-dazione-prioritizzato)

---

## 1. Riepilogo Esecutivo

| Categoria | Problemi Trovati | Severità |
|-----------|-----------------|----------|
| Pagine duplicate atleta/maestro | **~5.300 righe duplicate** | 🔴 CRITICO |
| Codice lib duplicato | **~45 funzioni duplicate** | 🔴 CRITICO |
| Route API debug in produzione | **3 endpoint non protetti** | 🔴 CRITICO |
| Componenti inutilizzati | **3+ componenti dead code** | 🟠 ALTO |
| Dipendenze non usate | **3 pacchetti** | 🟡 MEDIO |
| File/script da rimuovere | **24 file** | 🟢 BASSO |
| CSS duplicato | **2 sistemi di variabili** | 🟡 MEDIO |
| TypeScript strict disabilitato | **strict: false** | 🟠 ALTO |

---

## 2. Pagine Duplicate tra Dashboard

### Problema

Le dashboard `atleta` e `maestro` contengono **8 pagine praticamente identiche** che differiscono solo per il path di navigazione (es. `/dashboard/atleta/...` vs `/dashboard/maestro/...`).

### Pagine 100% Identiche (differiscono solo per il basePath)

| Pagina | File Atleta | File Maestro | LOC Duplicate |
|--------|-------------|--------------|---------------|
| **Arena** | `dashboard/atleta/(main)/arena/page.tsx` | `dashboard/maestro/(main)/arena/page.tsx` | ~2000 |
| **Prenotazioni** | `dashboard/atleta/(main)/bookings/page.tsx` | `dashboard/maestro/(main)/bookings/page.tsx` | ~700 |
| **Nuova Prenotazione** | `dashboard/atleta/(main)/bookings/new/page.tsx` | `dashboard/maestro/(main)/bookings/new/page.tsx` | ~800 |
| **Profilo** | `dashboard/atleta/(main)/profile/page.tsx` | `dashboard/maestro/(main)/profile/page.tsx` | ~400 |
| **Abbonamento** | `dashboard/atleta/(main)/subscription/page.tsx` | `dashboard/maestro/(main)/subscription/page.tsx` | ~350 |
| **Video** | `dashboard/atleta/(main)/videos/page.tsx` | `dashboard/maestro/(main)/videos/page.tsx` | ~250 |
| **Tornei** | `dashboard/atleta/(main)/tornei/page.tsx` | `dashboard/maestro/(main)/tornei/page.tsx` | ~400 |
| **Mail** | `dashboard/atleta/(main)/mail/page.tsx` | `dashboard/maestro/(main)/mail/page.tsx` | ~400 |

### Pattern Corretto Già Esistente

La dashboard `gestore` usa già il pattern wrapper corretto:
```tsx
// dashboard/gestore/(main)/bookings/new/page.tsx
import { NewAdminBookingPageWithBasePath } from "../../../../admin/bookings/new/page";
export default function GestoreNewBookingPage() {
  return <NewAdminBookingPageWithBasePath basePath="/dashboard/gestore" />;
}
```

### Azione Raccomandata

1. Estrarre ogni pagina in un componente condiviso che accetta `basePath` come prop
2. Le pagine atleta/maestro diventano wrapper di 3-5 righe (come fa già gestore)
3. **Risparmio stimato: ~5.300 righe di codice**

---

## 3. Codice Duplicato in src/lib

### 3.1 Funzioni Email Duplicate (CRITICO)

**File:** `lib/email/booking-notifications.ts` e `lib/email/signup-notifications.ts`

Funzioni identiche duplicate:
- `normalizeEmail()` — normalizzazione email
- `escapeHtml()` — escape caratteri HTML
- `getGestoreRecipients()` — fetch utenti admin dal database

**Azione:** Creare `lib/email/email-utils.ts` con le funzioni condivise.

### 3.2 Sanitizzazione Duplicata (CRITICO)

**File:** `lib/security/sanitize.ts` e `lib/security/sanitize-server.ts`

**11 funzioni identiche** copiate tra i due file:
`sanitizeText`, `escapeSqlLike`, `sanitizeSearchQuery`, `sanitizeEmail`, `sanitizePhone`, `sanitizeUrl`, `sanitizeFilename`, `sanitizeUuid`, `removeNullBytes`, `sanitizeValue`, `sanitizeObject`

- `sanitize.ts` → usata solo in 1 file (`news/[id]/page.tsx`)
- `sanitize-server.ts` → usata nelle API routes

**Azione:** Consolidare le funzioni pure in un file base, tenere solo `sanitizeHtml` (con DOMPurify) nel file client.

### 3.3 isStaffRole() Duplicato (ALTO)

**File:** `lib/bookings/bookingDeletionNotifications.ts` e `lib/bookings/bookingEmailAthleteContext.ts`

Funzione privata `isStaffRole()` definita in entrambi con firme leggermente diverse.

**Azione:** Spostare in `lib/roles.ts` come funzione pubblica.

### 3.4 Conflitto canManageUsers() (CRITICO — BUG LOGICO)

**File A — `lib/roles.ts`:**
```ts
export function canManageUsers(role) { return isAdmin(role); } // Solo admin/gestore
```

**File B — `lib/auth/verifyAuth.ts`:**
```ts
export function canManageUsers(role) {
  return role === "admin" || role === "gestore" || role === "maestro"; // Include maestro!
}
```

I due file hanno logica **diversa**. Le API bookings importano da `verifyAuth`, le API users da `roles`. Questo crea potenziali problemi di autorizzazione.

**Azione:** Decidere se maestro può gestire utenti, consolidare in un unico file.

### 3.5 UserRole Definito 3 Volte

- `lib/roles.ts`
- `lib/auth/verifyAuth.ts`
- `lib/constants/app.ts`

**Azione:** Singola definizione in `lib/types/` o `lib/constants/app.ts`, importata dagli altri.

### 3.6 createNotification() Duplicato

- `lib/notifications/createNotification.ts` — usa `/api/notifications`
- `lib/notifications/helpers.ts` — usa `${NEXT_PUBLIC_APP_URL}/api/notifications`

`helpers.ts` **non è mai importato** da nessun file.

**Azione:** Eliminare `lib/notifications/helpers.ts`.

### 3.7 Due Client Supabase Server-Side

- `lib/supabase/server.ts` → 4 importazioni (users/search, messages)
- `lib/supabase/serverClient.ts` → 5+ importazioni (email, notifications)

Due moduli diversi per lo stesso scopo: creare un client Supabase lato server.

**Azione:** Valutare consolidamento in un unico modulo, o almeno documentare quando usare l'uno o l'altro.

---

## 4. Componenti Duplicati/Inutilizzati

### 4.1 Tre Implementazioni di StatsCard (CRITICO)

| File | Export | Props | Uso |
|------|--------|-------|-----|
| `components/dashboard/StatCard.tsx` | Default `StatCard` | title, value, icon, color, size, footer | 2 importazioni |
| `components/dashboard/StatsCard.tsx` | Named `StatsCard` | title, value, icon, trend, color | 1 importazione |
| `components/layout/DashboardComponents.tsx` | Named `StatsCard` | label, value, icon, trend, color | 0 importazioni |

**Azione:** Consolidare in un unico `StatCard` con interfaccia unificata.

### 4.2 ChampionshipStandings.tsx — DEAD CODE

`components/tournaments/ChampionshipStandings.tsx` **non è importato da nessun file**.
`ChampionshipStandingsView.tsx` è la versione completa effettivamente usata.

**Azione:** Eliminare `ChampionshipStandings.tsx`.

### 4.3 AnnouncementsBoard e PartnerBoard — Mai Importati

Entrambi i componenti in `components/announcements/` non sono importati da nessuna pagina.

**Azione:** Verificare se sono deprecati. Se sì, eliminare.

### 4.4 Layout Dashboard Quasi Identici (ALTO)

`AthleteLayout.tsx` e `MaestroAthleteLayout.tsx` condividono ~95% del codice (auth check, profile loading, unread messages, pending bookings).

**Azione:** Estrarre un hook `useAuthenticatedDashboard(requiredRole)` e passare solo la configurazione di navigazione come parametro.

### 4.5 Cartelle Componenti Vuote

- `components/email/` — vuota
- `components/seo/` — vuota

**Azione:** Eliminare.

---

## 5. API Routes — Debug e Cartelle Vuote

### 🔴 Route Debug in Produzione (SICUREZZA)

| Route | Problema |
|-------|----------|
| `api/debug-tournaments/route.ts` | Espone configurazione sistema, **NESSUNA autenticazione** |
| `api/tournaments-debug/route.ts` | Espone lunghezza env variables, **NESSUNA autenticazione** |
| `api/bookings-debug/route.ts` | Testa dipendenze interne, **NESSUNA autenticazione** |

**Azione IMMEDIATA:** Eliminare tutti e 3 i file.

### Cartelle API Vuote

| Cartella | Stato |
|----------|-------|
| `api/gallery/` | Vuota |
| `api/orders/` | Vuota |
| `api/products/` | Vuota |
| `api/send-email/` | Vuota |
| `api/test/email-admin/` | Vuota |

**Azione:** Eliminare tutte le cartelle vuote.

### Nota Sicurezza Aggiuntiva

`api/notifications/route.ts` POST accetta `user_id` dal body senza verificare che corrisponda all'utente autenticato.

---

## 6. Dipendenze Non Utilizzate

| Pacchetto | Stato | Azione |
|-----------|-------|--------|
| `vitest` | Mai configurato/importato (il progetto usa Jest) | **Rimuovere** |
| `recharts` | Mai importato in nessun `.tsx` | **Rimuovere** (usa lucide-react BarChart3 icon) |
| `react-hook-form` | Mai importato in nessun file | **Rimuovere** |
| `jsdom` | Usato solo come dependency jest-environment-jsdom | Verificare se necessario direttamente |

**Azione:** `npm uninstall vitest recharts react-hook-form`

---

## 7. File Root e Script da Rimuovere

### Markdown da Spostare in docs/archive/ (5 file)

- `ARENA_SETUP.md`
- `BOOKINGS_SYSTEM_FIXES.md`
- `COURTS_MIGRATION_README.md`
- `TIMELINE_SELECTION_FIX.md`
- `REFACTORING_COMPLETED.md`

### Script da Eliminare (9 file)

- `scripts/import-gst-serie-a.sql` — import una tantum
- `scripts/import-gst-serie-a-results.sql` — import una tantum
- `scripts/check-db-health.js` — diagnostica
- `scripts/check-tournaments-db.js` — diagnostica
- `scripts/migrate-to-logger.js` — migrazione completata
- `scripts/test-tournaments-query.js` — test helper
- `scripts/test-tournaments.js` — test helper
- `scripts/security-check.ps1` — audit completato
- `scripts/security-check-fixed.ps1` — audit completato
- `scripts/security-check.sh` — audit completato (bash)

### Artefatti da Eliminare (3 file)

- `build_errors.txt` — log storico
- `FIX_ORPHAN_USER.sql` — fix una tantum
- `test-bookings-query.js` — test query del database

### Preview Email da Eliminare (7 file in public/)

- `public/booking-deletion-email-preview-all-cases.html`
- `public/booking-deletion-email-preview.html`
- `public/booking-email-preview-all-cases.html`
- `public/booking-email-preview.html`
- `public/email-previews.html`
- `public/signup-email-preview.html`
- `public/staff-booking-mail-notification-preview.html`

### Cartella Vuota

- `src/app/account/` — vuota

**Totale: ~24 file da rimuovere/archiviare**

---

## 8. CSS Duplicato e Problemi di Stile

### Variabili CSS Definite Due Volte

`globals.css` definisce CSS custom properties sia in `:root` che in `@theme inline` (Tailwind v4), creando due fonti di verità per gli stessi valori.

**Azione:** Rimuovere le variabili duplicate da `:root`, usare solo `@theme`.

### Scala Tipografica Duplicata

Le classi `.text-display-*`, `.text-h1`...`.text-h6` sono definite sia in `globals.css` che in `utilities.css`.

**Azione:** Definire la scala tipografica in un solo file.

### Utility CSS Ridondanti con Tailwind

`utilities.css` contiene wrapper come `.text-primary`, `.bg-flat-*`, `.focus-ring` che replicano funzionalità Tailwind.

**Azione:** Valutare se sostituire con classi Tailwind native o configurazione `@theme`.

---

## 9. Configurazione TypeScript/ESLint

### TypeScript Strict Mode Disabilitato

```json
"strict": false,
"noImplicitAny": false
```

Queste impostazioni disabilitano i controlli di tipo più importanti, rendendo TypeScript poco più di un linter sintattico.

**Azione (progressiva):**
1. Attivare `noImplicitAny: true` e fixare gli errori
2. Attivare `strict: true` gradualmente

### ESLint Minimal

Solo presets Next.js, nessuna regola personalizzata per il progetto.

---

## 10. Piano d'Azione Prioritizzato

### 🔴 Fase 1 — Sicurezza & Quick Wins (1-2 ore)

| # | Azione | Impatto |
|---|--------|---------|
| 1 | Eliminare 3 route API debug (`debug-tournaments`, `tournaments-debug`, `bookings-debug`) | Chiude vulnerability |
| 2 | Eliminare 5 cartelle API vuote | Pulizia |
| 3 | Eliminare `ChampionshipStandings.tsx` (dead code) | Pulizia |
| 4 | Eliminare `lib/notifications/helpers.ts` (mai usato) | Pulizia |
| 5 | Eliminare cartelle componenti vuote (`email/`, `seo/`) | Pulizia |
| 6 | Eliminare cartella `src/app/account/` (vuota) | Pulizia |
| 7 | Rimuovere dipendenze inutili: `vitest`, `recharts`, `react-hook-form` | Riduce bundle |

### 🟠 Fase 2 — Consolidamento Codice Duplicato (4-6 ore)

| # | Azione | Risparmio |
|---|--------|-----------|
| 8 | Creare `lib/email/email-utils.ts` (normalizeEmail, escapeHtml, getGestoreRecipients) | ~100 LOC |
| 9 | Consolidare sanitizzazione (`sanitize.ts` + `sanitize-server.ts`) | ~200 LOC |
| 10 | Unificare `canManageUsers()` e risolvere conflitto logico | Fix bug autorizzazione |
| 11 | Consolidare `UserRole` in singola definizione | Consistenza tipi |
| 12 | Estrarre `isStaffRole()` in `lib/roles.ts` | ~20 LOC |
| 13 | Consolidare `StatCard` / `StatsCard` / `DashboardComponents.StatsCard` | Pulizia API componenti |
| 14 | Estrarre hook `useAuthenticatedDashboard()` dai layout | ~300 LOC |

### 🟡 Fase 3 — Deduplicazione Pagine Atleta/Maestro (6-8 ore)

| # | Azione | Risparmio |
|---|--------|-----------|
| 15 | Consolidare pagina Profile (100% identica) | ~400 LOC |
| 16 | Consolidare pagina Subscription (100% identica) | ~350 LOC |
| 17 | Consolidare pagina Videos (100% identica) | ~250 LOC |
| 18 | Consolidare pagina Mail (100% identica) | ~400 LOC |
| 19 | Consolidare pagina Bookings con basePath | ~700 LOC |
| 20 | Consolidare pagina New Booking con basePath | ~800 LOC |
| 21 | Consolidare pagina Tornei con basePath | ~400 LOC |
| 22 | Consolidare pagina Arena con basePath | ~2000 LOC |

### 🟢 Fase 4 — Pulizia File e CSS (2-3 ore)

| # | Azione |
|---|--------|
| 23 | Spostare 5 markdown interni in `docs/archive/` |
| 24 | Eliminare 10 script non più necessari |
| 25 | Eliminare 3 artefatti root |
| 26 | Eliminare 7 preview email HTML da `public/` |
| 27 | Consolidare variabili CSS duplicate |
| 28 | Rimuovere scala tipografica duplicata |

### 🔵 Fase 5 — Miglioramenti Configurazione (progressivo)

| # | Azione |
|---|--------|
| 29 | Attivare `noImplicitAny: true` in tsconfig |
| 30 | Attivare gradualmente `strict: true` |
| 31 | Consolidare 2 Supabase server client in 1 |
| 32 | Standardizzare pattern autenticazione API (usare sempre `verifyAuth`) |
| 33 | Fix `api/notifications` POST — validare user_id con token |

---

## Metriche Finali

| Metrica | Valore |
|---------|--------|
| Righe codice duplicate stimato | **~6.500 LOC** |
| File da eliminare | **~24** |
| File da consolidare | **~20** |
| Dipendenze inutili | **3** |
| Vulnerabilità sicurezza (API debug) | **3** |
| Bug logici (canManageUsers) | **1** |
