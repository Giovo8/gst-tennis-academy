# CLAUDE.md — Istruzioni per agenti AI

Piattaforma gestionale per accademia di tennis. Next.js 16 (App Router) + Supabase. Comunicazione con l'utente in **italiano**.

## Comandi

```bash
npm run dev            # dev server (Turbopack)
npm run build          # build produzione
npm run lint           # ESLint
npm run format         # Prettier
npm test               # Jest (231 passing, 23 skipped)
supabase db push       # applica migrazioni (richiede supabase link)
```

Pre-commit: Husky + lint-staged (Prettier automatico).

## Architettura in breve

- **Ruoli**: `atleta | maestro | gestore | admin` (enum `user_role`, colonna `profiles.role`). `gestore` equivale ad `admin` nella maggior parte delle API.
- **Auth API**: ogni route handler deve chiamare `verifyAuth(request, { allowedRoles })` da `src/lib/auth/verifyAuth.ts` (Bearer token). Le pagine dashboard usano `AuthGuard` (client-side); la vera protezione dati è la RLS di Supabase.
- **Client Supabase**: browser → `src/lib/supabase/client.ts`; server → `src/lib/supabase/serverClient.ts` (service role key, **bypassa RLS**: usalo solo con controlli espliciti di ownership/ruolo).
- **Middleware** (`src/middleware.ts`): CSRF (blocca mutazioni API con Origin non in whitelist) + refresh sessione. NON controlla i ruoli.
- **Validazione**: schemi Zod in `src/lib/validation/schemas.ts` — usali per ogni body POST/PUT.
- **Logging**: `src/lib/logger/secure-logger.ts` (redige campi sensibili) — mai `console.log` con dati utente.
- **Email**: Resend via `src/lib/email/` — skip silenzioso se `RESEND_API_KEY` assente; loggare esiti in `email_logs`.
- **AI News**: pipeline RSS (`rss-parser`) + Gemini in `src/app/api/ai-news/`; cron configurati in DB (`ai_news_cron`), NON in Vercel.
- **DB**: 67 migrazioni in `supabase/migrations/` (mai modificare migrazioni esistenti: crearne di nuove numerate progressivamente). Vincoli importanti: max 4 partecipanti per prenotazione (trigger), anti-overlap bookings (btree_gist).

## Convenzioni

- TypeScript con `strict: false` (non introdurre `any` nuovi; il debito `no-explicit-any` è già ampio).
- Import con alias `@/*` → `src/*`.
- UI: Tailwind v4, componenti condivisi in `src/components/ui/`, icone lucide-react, toast sonner, animazioni framer-motion. Palette per ruolo: blu (atleta), viola (maestro), arancione (admin).
- Testi UI e messaggi in italiano.
- Campi/valori DB spesso in italiano (es. `news.stato`: bozza/pubblicata/scartata) — non "tradurli".
- Per la lista campi usare `getCourts()` (`src/lib/courts/getCourts.ts`), non costanti hardcoded.

## Cosa NON fare senza conferma esplicita

- Modificare o eliminare **migrazioni SQL esistenti**, policy RLS o funzioni DB.
- Usare la **service role key** in nuovi endpoint senza controllo di ownership/ruolo.
- Cambiare `next.config.ts` (security headers/CSP), `middleware.ts` o `verifyAuth.ts`.
- Aggiungere dipendenze o integrare servizi esterni (Stripe e Sentry NON sono integrati: non aggiungerli per completare vecchi riferimenti).
- Commit/push: solo su richiesta.

## Riferimenti

- `README.md` — panoramica, setup, deploy
- `docs/` — documentazione dettagliata (API, DATABASE, ROLES, AI-NEWS…)
- `.env.example` — tutte le variabili d'ambiente effettivamente usate
