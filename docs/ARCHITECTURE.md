# Architettura

Panoramica tecnica di GST Tennis Academy: stack, struttura del progetto, middleware, pattern di autenticazione/autorizzazione e configurazioni notevoli.

## Stack tecnologico

| Tecnologia | Versione (package.json) | Uso |
|---|---|---|
| Next.js | ^16.2.6 | Framework full-stack (App Router, Turbopack) |
| React / React DOM | 19.2.3 | UI |
| TypeScript | ^5.9.3 | Linguaggio (`strict: false`, vedi sotto) |
| Tailwind CSS | v4 (`@tailwindcss/postcss`) | Styling |
| @supabase/supabase-js | ^2.88.0 | Auth, PostgreSQL, Storage, Realtime |
| @supabase/ssr | ^0.8.0 | Sessione via cookie (browser + server) |
| Zod | ^3.24.1 | Validazione input |
| Resend | ^6.9.3 | Email transazionali |
| @google/generative-ai | ^0.24.1 | Notizie AI (Gemini 2.0 Flash) |
| rss-parser | ^3.13.0 | Parsing feed RSS per le notizie AI |
| isomorphic-dompurify | ^2.18.0 | Sanitizzazione HTML |
| framer-motion / lucide-react / sonner / date-fns / clsx / tailwind-merge | — | Animazioni, icone, toast, date, utility CSS |
| Jest ^30.2.0 + Testing Library | — | Test (231 passing, 23 skipped) |

Non integrati: **Stripe** e **Sentry**. I pagamenti sono tracciati solo a livello dati (tabella `payments`, colonna `stripe_payment_id` predisposta ma senza provider collegato).

## Struttura del progetto

```
.
├── src/
│   ├── app/                      # App Router (~100 pagine, 89 API route handler)
│   │   ├── page.tsx              # Landing pubblica
│   │   ├── login/ register/ news/ tornei/ lavora-con-noi/ …  # Area pubblica
│   │   ├── auth/                 # reset-password
│   │   ├── dashboard/
│   │   │   ├── atleta/(main)/    # bookings, corsi, arena, tornei, videos, profile
│   │   │   ├── maestro/(main)/   # bookings, corsi, arena, tornei, videos, mail
│   │   │   └── admin/            # users, corsi, courts, tornei, news+AI, staff, …
│   │   ├── chat/                 # messaggistica interna
│   │   └── api/                  # 89 route handler REST (vedi docs/API.md)
│   ├── components/               # admin, arena, auth, bookings, chat, dashboard,
│   │                             # landing, layout, news, notifications, profile,
│   │                             # theme, tournaments, ui
│   ├── lib/
│   │   ├── auth/                 # verifyAuth (Bearer), routeAuth (cookie), logout
│   │   ├── supabase/             # client.ts, server.ts, serverClient.ts (vedi sotto)
│   │   ├── email/                # client Resend, template, logging su email_logs
│   │   ├── ai-news/              # auth helper, sanitizer, tipi notizie AI
│   │   ├── security/             # rate-limiter (in-memory), sanitize, XSS prevention
│   │   ├── validation/           # schemi Zod (schemas.ts)
│   │   ├── logger/               # secure-logger (redazione dati sensibili)
│   │   ├── bookings/ arena/ courts/ notifications/ chat/ activity/  # logica di dominio
│   │   └── config/ constants/ hooks/ roles.ts / seo/ types/ utils/
│   └── middleware.ts             # CSRF + refresh sessione Supabase
├── supabase/
│   ├── migrations/               # 67 migrazioni SQL (001–067) + archive/
│   ├── functions/genera-news/    # Edge Function per la generazione notizie AI
│   ├── scripts/                  # utilities e fix una tantum (es. bucket avatars)
│   └── schema.sql                # schema base di riferimento
├── docs/                         # documentazione (indice: docs/README.md)
├── public/                       # asset statici
├── next.config.ts                # security headers, redirects, immagini
├── tsconfig.json                 # strict: false
├── jest.config.js                # coverage threshold 10%
└── .env.example                  # template variabili d'ambiente
```

## Middleware (`src/middleware.ts`)

Il middleware esegue due compiti, su tutte le richieste tranne gli asset statici:

1. **Protezione CSRF** — per le richieste mutanti (`POST/PUT/PATCH/DELETE`) verso `/api/*`: se l'header `Origin` è presente e non corrisponde all'host corrente (http/https) o a `NEXT_PUBLIC_SITE_URL`, la richiesta viene rifiutata con 403. Le richieste senza `Origin` (server-to-server) passano; il path `/api/webhooks/*` è escluso.
2. **Refresh della sessione Supabase** — tramite `createServerClient` di `@supabase/ssr` viene chiamato `supabase.auth.getUser()`, che rinnova il token nei cookie e mantiene viva la sessione tra le richieste.

Il middleware **non esegue alcun controllo di ruolo** sulle route `/dashboard/*`: la protezione delle pagine è client-side (vedi sotto).

## Autenticazione e autorizzazione

Il sistema usa Supabase Auth con quattro ruoli (`atleta | maestro | gestore | admin`, enum PostgreSQL `user_role` salvato in `profiles.role`). Tre livelli di difesa:

### 1. API route

Due helper, a seconda di come la route viene chiamata:

- **`verifyAuth(req, allowedRoles?)`** — `src/lib/auth/verifyAuth.ts`. Verifica l'header `Authorization: Bearer <token>` con `supabaseServer.auth.getUser(token)`, carica il profilo e, se `allowedRoles` è passato, restituisce 403 quando il ruolo non è incluso. Ritorna un'unione discriminata `AuthSuccessResponse | AuthErrorResponse`. Da usare nelle route chiamate via `fetch` con header esplicito.
- **`getRouteAuth()`** — `src/lib/auth/routeAuth.ts`. Legge la sessione dai **cookie** (via `createClient()` di `src/lib/supabase/server.ts`) e restituisce `{ user, role }` o `null`. Le route applicano poi i controlli con gli helper `isAdmin(role)` (vero per `admin` e `gestore`), `unauthorized()`, `forbidden()`. Il modulo AI-news ha il wrapper `requireAdminOrGestore()` (`src/lib/ai-news/auth.ts`).

Alcune route legacy replicano la verifica manualmente (`supabase.auth.getUser(token)` + lettura di `profiles.role`), in particolare nel dominio tornei. Il dettaglio per singola route è in [API.md](API.md).

### 2. Pagine dashboard

La protezione delle pagine `/dashboard/*` è **solo client-side** tramite il componente `AuthGuard` (`src/components/auth/AuthGuard.tsx`): né il middleware né i layout server verificano il ruolo. I dati restano protetti da API e RLS, ma l'UI può renderizzarsi brevemente per utenti con ruolo sbagliato prima del redirect.

### 3. Row Level Security (RLS)

Ultima linea di difesa sui dati: RLS attiva su 50+ tabelle, con policy self-access (`auth.uid() = user_id`) e role-based tramite la funzione helper `get_my_role()` (SECURITY DEFINER, evita la ricorsione delle policy su `profiles`). Dettagli in [DATABASE.md](DATABASE.md).

## Client Supabase

Tre client distinti in `src/lib/supabase/`:

| File | Client | Chiave | Contesto |
|---|---|---|---|
| `client.ts` | `createBrowserClient` (@supabase/ssr, flusso PKCE) | anon | Browser: la sessione è salvata nei cookie, così è leggibile anche dai route handler |
| `server.ts` | `createServerClient` (@supabase/ssr) | anon | Server: legge la sessione dell'utente dai cookie (`getRouteAuth`, Server Components) |
| `serverClient.ts` | `createClient` (supabase-js) | **service role** | Solo server: **bypassa la RLS**, accesso completo al DB. Mai esporre lato client |

`serverClient.ts` è un singleton usato dalle API route per operazioni privilegiate; dove viene usato, l'ownership check applicativo sostituisce la RLS.

## Realtime

Supabase Realtime è usato lato client per: aggiornamenti prenotazioni, notifiche, messaggi chat (conversazioni e gruppi), presenza online (`user_presence`) e indicatori di digitazione (`typing_indicators`).

## Configurazioni notevoli

### `next.config.ts`

- **Security headers** su tutte le route: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS (`max-age=31536000; includeSubDomains`) e una **Content-Security-Policy** con `script-src 'self' 'unsafe-inline'` (più `'unsafe-eval'` solo in dev; nel file c'è un TODO per migrare a CSP con nonce), `connect-src` limitato a Supabase e Open-Meteo, `frame-ancestors 'none'`.
- Immagini remote consentite: `images.unsplash.com`, `cdn.sanity.io`, `*.supabase.co`; formati AVIF/WebP.
- Redirect permanente legacy: `/dashboard/coach/*` → `/dashboard/maestro/*`.

### `tsconfig.json`

`strict: false` e `noImplicitAny: false`: il type-checking è permissivo (debito tecnico noto, con ~442 occorrenze di `any` segnalate da ESLint). Alias `@/*` → `./src/*`. Le cartelle `__tests__` e `supabase/functions` sono escluse dal check.

### `jest.config.js`

Configurato con `next/jest` e ambiente `jsdom`. **Coverage threshold globale al 10%** (branches, functions, lines, statements): soglia bassa, pensata come safety net minima. Stato attuale: 231 test passing, 23 skipped.

### Qualità del codice

- ESLint 9 (`eslint-config-next`) + Prettier; pre-commit Husky + lint-staged (Prettier sui file staged).
- Rate limiting in-memory (`src/lib/security/rate-limiter.ts`), attivabile con `ENABLE_RATE_LIMITING`; applicato a signup, ricerca utenti, weather e ad alcune route bookings/tournaments. Essendo in-memory, su serverless si azzera a ogni cold start e non è condiviso tra istanze.
- Logger custom (`src/lib/logger/secure-logger.ts`) con redazione dei dati sensibili e livelli configurabili via `LOG_LEVEL`.
