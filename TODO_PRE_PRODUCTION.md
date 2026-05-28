# TODO Pre-Produzione — GST Tennis Academy
> Aggiornato: Maggio 2026 | Nessuna modifica applicata al momento della creazione

---

## 🔴 Sicurezza — CRITICO (da risolvere prima del deploy)

- [x] **#01** — **`src/app/api/arena/reset-season/route.ts`** — Aggiungere autenticazione admin: chiunque può cancellare tutti i dati Arena
- [x] **#02** — **`src/app/api/stats/admin/route.ts`** — Aggiungere autenticazione admin: statistiche business esposte pubblicamente
- [x] **#03** — **`src/app/api/notifications/notify-admins/route.ts`** — Aggiungere autenticazione: chiunque può inviare messaggi arbitrari a tutti gli admin

---

## 🟠 Sicurezza — ALTO

- [x] **#04** — **`src/app/api/bookings/route.ts`** (GET, riga 34) — Aggiungere `verifyAuth()`: prenotazioni di qualsiasi utente leggibili da chiunque
- [x] **#05** — **`src/app/api/tournament_participants/route.ts`** (GET, riga 16) — Aggiungere autenticazione: dati partecipanti tornei esposti pubblicamente
- [x] **#06** — **`src/app/api/arena/challenges/route.ts`** (GET) — Aggiungere autenticazione: email e telefono di tutti i giocatori esposti
- [x] **#07** — **`src/app/api/health/route.ts`** — Rimuovere `environment` e `hasServiceRole` dalla risposta
- [x] **#08** — **`next.config.ts`** — Aggiungere HTTP security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [x] **#09** — **`src/lib/security/rate-limiter.ts`** — Rate limiter riscritto: rimosso il vecchio `class RateLimiter` con in-memory `Map`, ora usa una singola `Map` con cleanup automatico ogni 60s. `applyRateLimit` è diventata `async` (firma invariata per i chiamanti). Aggiunto `await` nei 4 file chiamanti (`signup`, `bookings`, `tournaments`, `users/search`). Valutata soluzione Upstash/Vercel KV ma scartata (a pagamento, non necessaria per traffico ridotto di un'accademia). Soluzione in-memory è adeguata per deployment single-instance su Vercel.

---

## 🟡 Sicurezza — MEDIO

- [x] **#10** — **`src/lib/supabase/client.ts`** — Cambiare `flowType: "implicit"` in `flowType: "pkce"` (implicit è deprecato)
- [x] **#11** — **`src/app/api/arena/players/route.ts`** — Rimuovere `email` e `role` dalla risposta per utenti non admin
- [x] **#12** — **`src/lib/auth/verifyAuth.ts`** (riga 36) — Tipare correttamente il return type (`Promise<any>` → interfaccia esplicita)
- [x] **#13** — Standardizzare su un unico pattern di autenticazione (`verifyAuth` vs `getRouteAuth` usati in modo inconsistente)

---

## 🟡 Sicurezza — DIPENDENZE

- [x] **#14** — **`package.json`** — Risolvere 15 vulnerabilità npm (`npm audit fix`): 4 HIGH (flatted, minimatch, **next**, picomatch), 11 moderate. Eseguito `npm audit fix` + aggiornato `next` 15.1.1 → 16.2.6 (unica versione sicura). Rimangono 2 moderate non risolvibili: `yaml` (dentro lint-staged, dev-only) e `postcss` (bundled dentro next internamente). Nessun errore TypeScript dopo l'upgrade.

---

## 🧹 Pulizia del Codice

- [x] **#15** — **`src/app/api/arena/challenges/route.ts`** — Rimuovere 30+ `console.log` con emoji
- [x] **#16** — **`src/app/api/tournaments/[id]/matches/[matchId]/route.ts`** — Rimuovere 15+ `console.log`
- [x] **#17** — **`src/app/dashboard/atleta/(main)/bookings/page.tsx`** — Rimuovere 6 `console.log`
- [x] **#18** — **`src/lib/config/env.ts`** (riga 69) — Rimuovere `console.log('✅ Environment variables validated')` dal percorso di produzione
- [x] **#19** — **`src/app/news/[id]/page.tsx`** — Rimuovere i 3 post fittizi hardcoded (n1, n2, n3); usare `notFound()` se l'articolo non esiste nel DB
- [x] **#20** — **`src/lib/seo/metadata.ts`** — Sostituire i placeholder: `+39-XXX-XXXXXXX`, `Via Example`, `your-google-verification-code`
- [x] **#21** — **`src/lib/seo/metadata.ts`** — Aggiornare `metadataBase` con il dominio di produzione reale (non l'URL Vercel di staging)
- [x] **#22** — Sostituire tutte le chiamate **`alert()`** con toast/notifiche (20+ occorrenze in: GroupStageView, ChampionshipStandingsView, EliminationBracketView, ChatPanel, NewConversationModal, AthletesSelector, services/[id]/page.tsx)
- [ ] **#23** — **`src/components/tournaments/GroupStageView.tsx`** (riga 388) — Implementare o rimuovere la funzionalità "rimozione partecipante" (attualmente uno stub `alert()`)
- [x] **#24** — **`src/lib/logger/secure-logger.ts`** — Revisione e miglioramento del sistema di logging interno: aggiunto `LOG_LEVEL` env var, `withContext()` per logging request-scoped, stack trace in produzione, `safeStringify()` circular-ref safe, `security()` promosso a livello `error`, `LogContext: unknown` invece di `any`. Scelta deliberata di non integrare servizi esterni.
- [x] **#25** — Centralizzare la creazione del client Supabase: rimosso `createClient(url, serviceKey)` locale da 4 file API (`arena/challenges/route.ts`, `arena/challenges/[id]/route.ts`, `bookings/batch/route.ts`, `bookings/availability/route.ts`). Tutti importano ora il singleton `supabaseServer` da `src/lib/supabase/serverClient.ts`.

---

## ⚡ Performance

- [x] **#26** — **`src/app/api/arena/challenges/route.ts`** — Spostato il filtro `status` nella query Supabase (`.eq("status", status)`) invece di filtrare in JS dopo il fetch. Rimosso `filteredData.filter(c => c.status === status)`.
- [x] **#27** — **`src/app/api/bookings/batch/route.ts`** — Eliminato il pattern N+1: sostituito il loop di N query (una per slot) con una singola query che copre tutti i campi e il range temporale complessivo. Il controllo di overlap esatto viene fatto in JS sul risultato.
- [x] **#28** — **`src/app/api/arena/challenges/route.ts`** — Parallelizzate le 3 query sequenziali (profiles, arena_stats, bookings) con `Promise.all()`. Da 3 round-trip sequenziali a 1 round-trip parallelo.
- [x] **#29** — Revisione `.select("*")` (30+ occorrenze): la maggior parte restituisce l’oggetto completo al client e non può essere ridotta senza rischiare regressioni. Le occorrenze nelle route pubbliche (services, staff, news) sono state mantenute intenzionalmente poiché tutti i campi sono necessari per il rendering.
- [x] **#30** — Aggiunto header `Cache-Control` sugli endpoint pubblici a dati stabili: `services` (5 min), `staff` (5 min), `news` (1 min). Non applicato alle varianti admin `?all=true`.
- [ ] **#31** — Sostituire i tag `<img>` con il componente `<Image>` di Next.js e aggiungere `loading="lazy"` (8 occorrenze: StaffSection, NewsSection, PlayerProfileModal, ChallengeModal, TextHeroSection, DashboardShell)

---

## 🏗️ Qualità e Manutenibilità

- [x] **#32** — **`src/app/api/bookings/route.ts`** (~1000 righe) — Separare in handler distinti e un service layer (email, notifiche, logging). Creato `src/lib/bookings/bookingService.ts` con `handleBookingCreatedSideEffects` e `handleBookingDeletedSideEffects`. Il route ha ora ~790 righe (era ~1200).
- [x] **#33** — **`src/app/api/arena/challenges/route.ts`** (~700 righe) — Estrarre la logica Arena in `src/lib/arena/challengeService.ts`. Creato il service con `fetchEnrichedChallenge`, `fetchEnrichedChallenges`, `notifyOpponentOfNewChallenge`, `notifyChallengeStatusChange`. Il route è passato da 652 a 306 righe.
- [x] **#34** — **`src/components/bookings/BookingsTimeline.tsx`** (69 KB) e **`TournamentManager.tsx`** (61 KB) — Scomporre in componenti più piccoli con hook custom
- [x] **#35** — 15 page.tsx nel dashboard con dimensione 40–63 KB — Estrarre form e logica in componenti riutilizzabili
- [x] **#36** — Eliminare tutti i cast `as any` e sostituire con interfacce TypeScript esplicite
- [x] **#37** — **`src/app/news/[id]/page.tsx`** — Convertire da componente client con accesso diretto a Supabase a Server Component o API route

---

## ♿ Accessibilità

- [x] **#38** — **`src/app/services/[id]/page.tsx`** (righe 41, 45, 49) — Aggiungere `<label>` associati agli input del form (viola WCAG 2.1 AA 1.3.1 e 4.1.2): file eliminato in sessione precedente, problema non più presente
- [x] **#39** — Sostituire le chiamate `alert()` con `aria-live` regions per i messaggi di stato (viola WCAG 3.2 e 4.1.3): risolto dal task #22 — tutti gli `alert()` sostituiti con `toast()` di Sonner, che implementa internamente `aria-live="polite"` tramite il `<Toaster>` nel root layout
- [x] **#40** — **`src/components/dashboard/DashboardShell.tsx`** — Verificare `alt` descrittivi sugli avatar e `aria-label` sui bottoni icon-only: avatar già corretti (`alt={userName || "User"}`); aggiunti `aria-label` su bottone logout e bottone collapse/expand sidebar (avevano solo `title`, non letto in modo affidabile dagli screen reader)
