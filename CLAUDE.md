# CLAUDE.md — Istruzioni per agenti AI

Piattaforma gestionale per accademia di tennis. Next.js 16 (App Router) + Supabase. Comunicazione con l'utente in **italiano**.

## Comandi

```bash
npm run dev            # dev server (Turbopack; Webpack in automatico se Windows blocca il compilatore nativo: scripts/next.mjs)
npm run build          # build produzione
npm run lint           # ESLint (debito noto: ~230 errori preesistenti, soprattutto any e regole React Compiler)
npm run format         # Prettier
npm test               # Jest (330 passing, 17 skipped) — compilato con TypeScript (jest.transform.js), non SWC
npx tsc --noEmit       # type check (deve restare a 0 errori)
```

Il `tsconfig` esclude `src/__tests__`: per controllare anche i test usare un tsconfig temporaneo che li includa (oggi passano senza errori).

Pre-commit: `.husky/pre-commit` lancia lint-staged (Prettier sui file staged); l'hook si attiva da solo con `npm install` (script `prepare`). Il codice esistente non è ancora tutto formattato: si allinea file per file ai commit.

## Architettura in breve

- **Ruoli**: `atleta | maestro | gestore | admin` (enum `user_role`, colonna `profiles.role`). `gestore` equivale ad `admin` nella maggior parte delle API. Ruolo secondario `maestro` per i gestori in `profiles.metadata.secondary_roles`.
- **Auth API**: ogni route handler verifica l'utente. Route chiamate con `fetch` + header Bearer → `verifyAuth(request, ['admin', 'gestore'])` (`src/lib/auth/verifyAuth.ts`; l'array dei ruoli è facoltativo); route chiamate dal browser senza header → `getRouteAuth()` + `isAdmin()` / `unauthorized()` / `forbidden()` (`src/lib/auth/routeAuth.ts`). Non riscrivere a mano la verifica del token.
- **Pagine dashboard**: protezione solo client-side (layout di area + `AuthGuard`); la vera protezione dati è la RLS di Supabase e i controlli nelle API.
- **Client Supabase**: browser → `src/lib/supabase/client.ts`; server con sessione utente → `src/lib/supabase/server.ts`; server con service role → `src/lib/supabase/serverClient.ts` (**bypassa RLS**: usalo solo con controlli espliciti di ownership/ruolo). Non creare altri client con `createClient` nelle route.
- **Utente corrente lato client**: usare `getSessionUser()` (`src/lib/auth/clientSession.ts`, sessione locale, zero rete), non `supabase.auth.getUser()` che fa un round-trip al server Auth. Lato server resta obbligatorio `getUser()`/`verifyAuth`.
- **Accesso ai dati**: molte letture/scritture avvengono direttamente dalle pagine via Supabase + RLS; le API servono per service role, conflitti, email, notifiche ad altri utenti, upload. **Niente API route né metodi senza un chiamante nel frontend** (unica eccezione: `/api/health`).
- **Performance/fluidità**: i layout dashboard non bloccano il render (controllo ruolo in parallelo); niente polling stretto (preferire Realtime con filtro + fallback lento a scheda visibile); niente `setLoading(true)` sui ricaricamenti in background; librerie pesanti (Recharts) via `next/dynamic` con segnaposto ad altezza fissa; animazioni in CSS (framer-motion è stato rimosso: non reintrodurlo).
- **Middleware** (`src/middleware.ts`): CSRF (blocca mutazioni API con Origin non in whitelist) + rate limiting su tutte le `/api/*` (regole in `src/lib/security/rateLimitRules.ts`, contatore in memoria) + refresh sessione per le pagine. NON controlla i ruoli.
- **Validazione**: schemi Zod in `src/lib/validation/schemas.ts` (dopo `sanitizeObject()`) — usali per ogni nuovo body POST/PUT/PATCH; non passare mai il body intero a `insert`/`update` (whitelist dei campi).
- **Logging**: `src/lib/logger/secure-logger.ts` (redige campi sensibili) — mai `console.log` con dati utente. Le anomalie di sicurezza vanno in `security_events` (`logSecurityEvent`).
- **Date lato server**: sempre `timeZone: 'Europe/Rome'` in `toLocaleDateString`/`toLocaleTimeString` (Vercel gira in UTC).
- **Notifiche in-app**: tabella `notifications` con `link` a un percorso interno (non `action_url`, solo legacy). Da server: `notifyAdmins` / `notifyAthletes` / insert con service role; dal client verso altri utenti: `createNotification()` → `POST /api/notifications`.
- **Email**: Resend via `src/lib/email/` — skip silenzioso se `RESEND_API_KEY` assente; esiti registrati in `email_logs`.
- **AI News**: generazione nella Edge Function Supabase `supabase/functions/genera-news` (Gemini via REST); le route `src/app/api/ai-news/` gestiscono fonti, cron, bozze e delegano la generazione. Cron configurati in DB (`ai_news_cron` + pg_cron), NON in Vercel.
- **DB**: migrazioni `001–097` in `supabase/migrations/`, applicate a mano dallo SQL Editor (niente `supabase db push`: non c'è `config.toml`). Mai modificare migrazioni esistenti: crearne di nuove numerate progressivamente (prossima `098`). Setup da zero e oggetti rimossi: `docs/DATABASE.md`. Vincoli importanti: max 4 partecipanti per prenotazione (trigger), anti-overlap bookings (btree_gist).

## Convenzioni

- TypeScript con `strict: false` (non introdurre `any` nuovi; il debito `no-explicit-any` è già ampio).
- Import con alias `@/*` → `src/*`.
- UI: Tailwind v4, componenti condivisi in `src/components/ui/`, icone lucide-react, toast sonner (`toastError` di `src/lib/toast.ts` per gli errori), animazioni in CSS. Solo tema chiaro: non usare la variante `dark:` né aggiungere dark mode. Una sola palette blu brand (scala Tailwind `frozen-*`) per tutte le aree; niente rosso per errori e avvisi. Le classi `*-frozen-lake-*` non generano stili (token solo in `:root`).
- Testi UI e messaggi in italiano.
- Campi/valori DB spesso in italiano (es. `news.stato`: bozza/pubblicata/scartata) — non "tradurli".
- Per la lista campi usare `getCourts()` (`src/lib/courts/getCourts.ts`) o l'hook `useCourts()`, mai costanti hardcoded.
- Le pagine maestro spesso riesportano quelle atleta: una modifica alla pagina atleta vale anche per il maestro.

## Cosa NON fare senza conferma esplicita

- Modificare o eliminare **migrazioni SQL esistenti**, policy RLS o funzioni DB.
- Usare la **service role key** in nuovi endpoint senza controllo di ownership/ruolo.
- Cambiare `next.config.ts` (security headers/CSP), `middleware.ts` o `verifyAuth.ts`.
- Aggiungere dipendenze o integrare servizi esterni (Stripe e Sentry NON sono integrati: non aggiungerli per completare vecchi riferimenti).
- Commit/push: solo su richiesta.

## Riferimenti

- `README.md` — panoramica, setup, deploy
- `docs/` — documentazione dettagliata (indice in `docs/README.md`: API, DATABASE, ROLES, FEATURES, AI-NEWS…)
- `.env.example` — tutte le variabili d'ambiente effettivamente usate
- `CHANGELOG.md` — storico delle modifiche
