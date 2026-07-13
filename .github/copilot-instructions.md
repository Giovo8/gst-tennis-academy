# GST Tennis Academy — Istruzioni per GitHub Copilot

Gestionale per accademia di tennis: Next.js 16 (App Router, Turbopack), React 19, TypeScript (`strict: false`), Tailwind CSS v4, Supabase (auth + PostgreSQL + storage + realtime), Resend (email), Google Gemini (notizie AI). Lingua del progetto: italiano (UI, messaggi, gran parte dei nomi di dominio).

## Struttura

- `src/app/` — pagine App Router; dashboard per ruolo in `dashboard/{atleta,maestro,admin}/`; 89 API route handler in `src/app/api/`
- `src/components/` — UI per area (admin, arena, auth, bookings, chat, dashboard, news, tournaments, ui…)
- `src/lib/` — logica condivisa: `auth/` (verifyAuth), `supabase/` (client browser/server), `email/`, `security/`, `validation/` (Zod), `logger/`
- `supabase/migrations/` — 67 migrazioni SQL versionate (001–067)
- `docs/` — documentazione dettagliata; `README.md` per setup e deploy

## Regole fondamentali

1. **Auth nelle API**: ogni route handler verifica il Bearer token con `verifyAuth(request, { allowedRoles })` (`src/lib/auth/verifyAuth.ts`). Ruoli: `atleta | maestro | gestore | admin` (`gestore` ≈ `admin`).
2. **Service role**: `src/lib/supabase/serverClient.ts` bypassa la RLS — usarlo solo server-side e sempre con controllo di ownership o ruolo.
3. **Validazione**: body POST/PUT validati con Zod (`src/lib/validation/schemas.ts`), mai validazione manuale ad-hoc.
4. **Logging**: usare `secure-logger` (`src/lib/logger/secure-logger.ts`), non `console.log`, per dati potenzialmente sensibili.
5. **Migrazioni**: mai modificare file esistenti in `supabase/migrations/`; creare una nuova migrazione numerata.
6. **Campi**: lista campi da `getCourts()` (`src/lib/courts/getCourts.ts`), non hardcoded.

## Convenzioni di stile

- Import con alias `@/*` → `src/*`
- Tailwind v4; componenti base in `src/components/ui/`; icone `lucide-react`; toast `sonner`; animazioni `framer-motion`
- Palette per ruolo: blu = atleta, viola = maestro, arancione = admin
- Valori DB in italiano (es. `news.stato`: `bozza | pubblicata | scartata`) — non tradurli in inglese
- Formattazione: Prettier (pre-commit automatico via Husky + lint-staged)

## Non toccare senza conferma

- Migrazioni SQL esistenti, policy RLS, funzioni/trigger DB
- `middleware.ts` (CSRF + sessione), `verifyAuth.ts`, security headers in `next.config.ts`
- Nuove dipendenze o servizi esterni (Stripe e Sentry NON sono integrati)

## Comandi

`npm run dev` · `npm run build` · `npm run lint` · `npm run format` · `npm test` · `supabase db push`
