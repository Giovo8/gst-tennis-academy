# GST Tennis Academy — Istruzioni per GitHub Copilot

Gestionale per accademia di tennis: Next.js 16 (App Router), React 19, TypeScript (`strict: false`), Tailwind CSS v4, Supabase (auth + PostgreSQL + storage + realtime), Resend (email), Google Gemini (notizie AI). Lingua del progetto: italiano (UI, messaggi, gran parte dei nomi di dominio).

Versione ridotta di `CLAUDE.md` (root del repo), che resta il riferimento completo.

## Struttura

- `src/app/` — pagine App Router; dashboard per ruolo in `dashboard/{atleta,maestro,admin}/`; API in `src/app/api/`
- `src/components/` — UI per area (admin, bookings, dashboard, landing, tournaments, ui…)
- `src/lib/` — logica condivisa: `auth/`, `supabase/`, `bookings/`, `courses/`, `arena/`, `tournaments/`, `email/`, `security/`, `validation/` (Zod), `logger/`
- `supabase/migrations/` — migrazioni SQL numerate, applicate dallo SQL Editor; setup da zero in `docs/DATABASE.md`
- `docs/` — documentazione dettagliata (indice nel `README.md`)

## Regole fondamentali

1. **Auth nelle API**: ogni route handler verifica l'utente: Bearer token con `verifyAuth(request, ['admin', 'gestore'])` (`src/lib/auth/verifyAuth.ts`) oppure sessione via cookie con `getRouteAuth()` (`src/lib/auth/routeAuth.ts`). Ruoli: `atleta | maestro | gestore | admin` (`gestore` ≈ `admin`).
2. **Service role**: `src/lib/supabase/serverClient.ts` bypassa la RLS — usarlo solo server-side e sempre con controllo di ownership o ruolo.
3. **Validazione**: body POST/PUT/PATCH validati con Zod (`src/lib/validation/schemas.ts`); mai passare il body intero a `insert`/`update`.
4. **Logging**: `secure-logger` (`src/lib/logger/secure-logger.ts`), non `console.log`, per dati potenzialmente sensibili.
5. **Migrazioni**: mai modificare file esistenti in `supabase/migrations/`; creare una nuova migrazione numerata.
6. **Niente duplicati**: prima di scrivere un helper in una pagina cercarlo in `src/lib/` (calendario corsi in `courses/schedule.ts`, sfide Arena in `arena/challengeDisplay.ts`, news in `news/display.ts`, campi con `getCourts()` / `useCourts()`, ruoli in `roles.ts`). Ciò che serve a più pagine va in `src/lib/`.
7. **Niente codice morto**: nessuna API route o metodo senza un chiamante nel frontend (eccezione: `/api/health`), nessun export o dipendenza inutilizzati.
8. **Date lato server**: sempre `timeZone: 'Europe/Rome'` in `toLocaleDateString`/`toLocaleTimeString` (Vercel gira in UTC).
9. **Utente corrente nel browser**: `getSessionUser()` (`src/lib/auth/clientSession.ts`), non `supabase.auth.getUser()`.

## Stile

- Import con alias `@/*` → `src/*`; non introdurre nuovi `any`
- Tailwind v4; componenti base in `src/components/ui/`; icone `lucide-react`; toast `sonner` (`toastError` per gli errori); animazioni in CSS (niente framer-motion)
- Una sola palette blu brand (scala Tailwind `frozen-*`) per tutte le aree, niente rosso; solo tema chiaro (niente `dark:`)
- Valori DB in italiano (es. `news.stato`: `bozza | pubblicata | scartata`) — non tradurli
- Le pagine maestro riesportano spesso quelle atleta
- Formattazione: Prettier (hook pre-commit Husky + lint-staged)

## Non toccare senza conferma

- Migrazioni SQL esistenti, policy RLS, funzioni/trigger DB
- `middleware.ts` (CSRF + rate limiting + sessione), `verifyAuth.ts`, security headers in `next.config.ts`
- Nuove dipendenze o servizi esterni (Stripe e Sentry NON sono integrati)

## Comandi

`npm run dev` · `npm run build` · `npm run lint` · `npm run format` · `npm test` · `npx tsc --noEmit`
