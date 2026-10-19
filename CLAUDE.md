# CLAUDE.id — Istruzioni per agenti AI

Piattaforia gestionale per accademia di tennis. Next.js 16 (App Router) + Supabase. Comunicazione con l'utente in **italiano**.

## Comandi

```bash
npm run dev            # dev server (Turbopack)
npm run build          # build produzione
npm run lint           # ESLint
npm run format         # Prettier
npm test               # Jest (311 passing, 17 skipped)
```

Pre-commit: `.husky/pre-commit` lancia lint-staged (Prettier sui file staged); l'hook si attiva da solo con `npm install` (script `prepare`). Il codice esistente non è ancora tutto formattato: si allinea file per file ai commit.

## Architettura in breve

- **Ruoli**: `atleta | maestro | gestore | admin` (enum `user_role`, colonna `profiles.role`). `gestore` equivale ad `admin` nella maggior parte delle API.
- **Auth API**: ogni route handler deve chiamare `verifyAuth(request, { allowedRoles })` da `src/lib/auth/verifyAuth.ts` (Bearer token). Le pagine dashboard usano `AuthGuard` (client-side); la vera protezione dati è la RLS di Supabase.
- **Client Supabase**: browser → `src/lib/supabase/client.ts`; server → `src/lib/supabase/serverClient.ts` (service role key, **bypassa RLS**: usalo solo con controlli espliciti di ownership/ruolo).
- **Utente corrente lato client**: usare `getSessionUser()` (`src/lib/auth/clientSession.ts`, sessione locale, zero rete), non `supabase.auth.getUser()` che fa un round-trip al server Auth. Lato server resta obbligatorio `getUser()`/`verifyAuth`.
- **Performance/fluidità**: i layout dashboard non bloccano il render (controllo ruolo in parallelo); niente polling stretto (preferire Realtime con filtro + fallback lento a scheda visibile); niente `setLoading(true)` sui ricaricamenti in background; librerie pesanti (Recharts) via `next/dynamic` con segnaposto ad altezza fissa; animazioni in CSS (framer-motion è stato rimosso: non reintrodurlo); niente API route senza un chiamante nel frontend.
- **Middleware** (`src/middleware.ts`): CSRF (blocca mutazioni API con Origin non in whitelist) + refresh sessione. NON controlla i ruoli.
- **Validazione**: schemi Zod in `src/lib/validation/schemas.ts` — usali per ogni body POST/PUT.
- **Logging**: `src/lib/logger/secure-logger.ts` (redige campi sensibili) — mai `console.log` con dati utente.
- **Email**: Resend via `src/lib/email/` — skip silenzioso se `RESEND_API_KEY` assente; loggare esiti in `email_logs`.
- **AI News**: pipeline RSS (`rss-parser`) + Gemini in `src/app/api/ai-news/`; cron configurati in DB (`ai_news_cron`), NON in Vercel.
- **DB**: migrazioni `001–092` in `supabase/migrations/`, applicate a mano dallo SQL Editor (niente `supabase db push`: non c'è `config.toml`). Mai modificare migrazioni esistenti: crearne di nuove numerate progressivamente (prossima `093`). Setup da zero e oggetti rimossi: `docs/DATABASE.md`. Vincoli importanti: max 4 partecipanti per prenotazione (trigger), anti-overlap bookings (btree_gist).

## Convenzioni

- TypeScript con `strict: false` (non introdurre `any` nuovi; il debito `no-explicit-any` è già ampio).
- Import con alias `@/*` → `src/*`.
- UI: Tailwind v4, componenti condivisi in `src/components/ui/`, icone lucide-react, toast sonner, animazioni in CSS. Solo tema chiaro: non usare la variante `dark:` né aggiungere dark mode. Palette per ruolo: blu (atleta), viola (maestro), arancione (admin).
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
