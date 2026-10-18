# GST Tennis Academy

Piattaforma web completa per la gestione di un'accademia di tennis: prenotazione campi e lezioni, corsi, tornei, sfide competitive (Arena), chat interna, notizie generate con AI e area amministrativa multi-ruolo.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth, database, storage, realtime) · Resend · Google Gemini

---

## Indice

- [Stack tecnologico](#stack-tecnologico)
- [Architettura](#architettura)
- [Setup locale](#setup-locale)
- [Struttura cartelle](#struttura-cartelle)
- [Deploy su Vercel](#deploy-su-vercel)
- [Cron e job schedulati](#cron-e-job-schedulati)
- [Documentazione dettagliata](#documentazione-dettagliata)

---

## Stack tecnologico

| Tecnologia                                        | Versione                    | Uso                                               |
| ------------------------------------------------- | --------------------------- | ------------------------------------------------- |
| [Next.js](https://nextjs.org)                     | ^16.2.6                     | Framework (App Router, Turbopack)                 |
| [React](https://react.dev)                        | 19.2.3                      | UI                                                |
| [TypeScript](https://www.typescriptlang.org)      | ^5.9.3                      | Linguaggio (`strict: false` in tsconfig)          |
| [Tailwind CSS](https://tailwindcss.com)           | v4                          | Styling (via `@tailwindcss/postcss`)              |
| [Supabase](https://supabase.com)                  | supabase-js ^2.88, ssr ^0.8 | Auth, PostgreSQL, Storage, Realtime               |
| [Zod](https://zod.dev)                            | ^3.24                       | Validazione input                                 |
| [Resend](https://resend.com)                      | ^6.9                        | Email transazionali                               |
| [@google/generative-ai](https://ai.google.dev)    | ^0.24                       | Generazione/traduzione notizie (Gemini 2.0 Flash) |
| [rss-parser](https://github.com/rbren/rss-parser) | ^3.13                       | Parsing feed RSS per le notizie AI                |
| lucide-react, sonner, date-fns                    | —                           | Icone, toast, date (animazioni in CSS)            |
| [Recharts](https://recharts.org)                  | ^3.9                        | Grafici della dashboard maestro                   |
| [Jest](https://jestjs.io) 30 + jest-dom           | —                           | Test (305 passing, 23 skipped)                    |

> Non integrati (nonostante vecchi riferimenti): **Stripe** e **Sentry**. I pagamenti sono tracciati a livello di dati (tabella `payments`) ma senza provider collegato.

## Architettura

### Ruoli

Quattro ruoli utente, definiti dall'enum PostgreSQL `user_role` e salvati in `profiles.role`:

| Ruolo     | Descrizione                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| `atleta`  | Prenota campi/lezioni, si iscrive a corsi e tornei, partecipa all'Arena e alla chat  |
| `maestro` | Gestisce le proprie lezioni/prenotazioni, corsi, video-lezioni e comunicazioni       |
| `gestore` | Gestione operativa della struttura (equivale ad admin nella maggior parte delle API) |
| `admin`   | Accesso completo: utenti, campi, tornei, news/AI, statistiche, log                   |

### Autenticazione e autorizzazione

- **Supabase Auth** con sessione gestita dal middleware (`src/middleware.ts`, via `@supabase/ssr`).
- Le **API route** verificano il Bearer token con `verifyAuth()` (`src/lib/auth/verifyAuth.ts`), che accetta un parametro `allowedRoles` per il controllo ruolo.
- Il middleware applica anche una **protezione CSRF**: le richieste mutanti (`POST/PUT/PATCH/DELETE`) verso `/api/*` con header `Origin` non in whitelist vengono rifiutate (403).
- La protezione delle pagine dashboard è affidata a `AuthGuard` (client-side) + **RLS** sul database come ultima linea di difesa.

### Moduli principali

- **Prenotazioni** — campi e lezioni (private/di gruppo), fino a 4 partecipanti per prenotazione, conferma maestro/gestore, vincolo anti-sovrapposizione a livello DB (`btree_gist`), prenotazione del campo per le partite di torneo.
- **Corsi** — creazione corsi con calendario, iscrizioni, registro presenze, video-lezioni assegnabili.
- **Tornei** — eliminazione diretta, round robin o gironi+eliminazione; bracket generati automaticamente; punteggi tennis (set, formato best-of-1/3/5, superficie).
- **Arena** — sfide 1v1 tra atleti con classifica a punti, livelli (Bronzo→Diamante) e streak.
- **Notizie AI** — generazione automatica di notizie tennis: feed RSS configurabili in DB (`ai_news_fonti`) → filtri anti-duplicato/anti-podcast → Gemini per riscrittura/traduzione → workflow bozza/approva/scarta in dashboard admin. Fallback a solo parsing RSS se Gemini non è configurato o in rate limit.
- **Chat** — messaggi diretti e gruppi nelle dashboard (`internal_messages`, `chat_groups`), aggiornati con Supabase Realtime.
- **Email** — notifiche transazionali via Resend (prenotazioni create/confermate/annullate/rifiutate, registrazioni); esiti tracciati in `email_logs`. Se `RESEND_API_KEY` manca, l'invio viene saltato senza errori.
- **Amministrazione** — gestione utenti, staff, campi e blocchi, codici invito, candidature (lavora-con-noi), statistiche, log attività.

### Numeri del progetto

- ~110 pagine (App Router), **60 API route handler** in `src/app/api`
- **Migrazioni SQL** `supabase/migrations/001–089`, ~35 tabelle in uso con RLS
- Storage: bucket `avatars` e `certificates`

## Setup locale

### Prerequisiti

- Node.js 20+
- Un progetto [Supabase](https://supabase.com) (gratuito)
- Facoltativi: API key [Resend](https://resend.com) (email) e [Gemini](https://ai.google.dev) (notizie AI)

### Passi

```bash
# 1. Clona e installa
git clone <repo-url>
cd gst-tennis-academy
npm install

# 2. Configura le variabili d'ambiente
cp .env.example .env.local
# compila .env.local con le chiavi del tuo progetto Supabase (vedi commenti nel file)

# 3. Prepara il database
# Esegui dallo SQL Editor di Supabase schema base, migrazioni e script
# nell'ordine descritto in docs/DATABASE.md (sezione "Setup da zero").

# 4. Avvia
npm run dev
```

### Comandi

| Comando                                | Descrizione                   |
| -------------------------------------- | ----------------------------- |
| `npm run dev`                          | Dev server (Turbopack)        |
| `npm run build`                        | Build di produzione           |
| `npm start`                            | Avvio build di produzione     |
| `npm run lint`                         | ESLint                        |
| `npm run format`                       | Prettier su ts/tsx/js/json/md |
| `npm test`                             | Test Jest                     |
| `npm run test:watch` / `test:coverage` | Test in watch / con coverage  |

Pre-commit: Husky + lint-staged (Prettier sui file staged), attivato automaticamente da `npm install`.

## Struttura cartelle

```
.
├── src/
│   ├── app/                    # App Router
│   │   ├── (pagine pubbliche)  # /, /login, /register, /news, /tornei, legali…
│   │   ├── dashboard/
│   │   │   ├── atleta/(main)/  # bookings, corsi, arena, tornei, videos, profile
│   │   │   ├── maestro/(main)/ # bookings, corsi, arena, tornei, videos, mail
│   │   │   └── admin/          # users, corsi, courts, tornei, news+AI, staff…
│   │   └── api/                # 60 route handler (REST)
│   ├── components/             # UI per area: admin, auth, bookings,
│   │                           # dashboard (layout per ruolo), landing, layout,
│   │                           # live-tennis, maestro, news, notifications,
│   │                           # tournaments, ui
│   ├── lib/                    # Logica condivisa:
│   │   ├── auth/               # verifyAuth, route auth, logout
│   │   ├── supabase/           # client browser + server (service role)
│   │   ├── email/              # client Resend, template, logging
│   │   ├── ai-news/            # sanitizer e utilità notizie AI
│   │   ├── security/           # rate limiter, sanitize-server, security events
│   │   ├── validation/         # schemi Zod
│   │   ├── logger/             # secure-logger (redazione dati sensibili)
│   │   └── …                   # bookings, arena, notifications, hooks, types
│   └── middleware.ts           # CSRF + refresh sessione Supabase
├── supabase/
│   ├── migrations/             # 001–089 (prossima: 090)
│   ├── scripts/                # script una tantum (alcuni necessari al setup da zero)
│   ├── functions/genera-news/  # Edge Function notizie AI
│   └── schema.sql              # schema base iniziale
├── docs/                       # documentazione dettagliata (vedi sotto)
├── public/                     # asset statici
└── .env.example                # template variabili d'ambiente
```

## Deploy su Vercel

1. Importa il repository su Vercel (framework: **Next.js**, build command di default `next build`).
2. Configura le variabili d'ambiente nel progetto Vercel:

| Variabile                           | Obbligatoria | Note                                                                                        |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | ✅           | URL progetto Supabase                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | ✅           | Chiave anon (pubblica)                                                                      |
| `SUPABASE_URL`                      | ⚪           | URL lato server (default: `NEXT_PUBLIC_SUPABASE_URL`)                                       |
| `SUPABASE_SERVICE_ROLE_KEY`         | ✅           | **Solo server** — mai `NEXT_PUBLIC_`                                                        |
| `NEXT_PUBLIC_APP_URL`               | ✅           | URL pubblico del sito                                                                       |
| `NEXT_PUBLIC_SITE_URL`              | ✅           | Usato per la whitelist CSRF                                                                 |
| `RESEND_API_KEY`, `EMAIL_FROM`      | ⚪           | Senza, le email vengono saltate                                                             |
| `GEMINI_API_KEY`, `GEMINI_MODEL`    | ⚪           | Senza, le notizie AI usano solo RSS (vanno impostate anche nei secrets della Edge Function) |
| `ENABLE_RATE_LIMITING`, `LOG_LEVEL` | ⚪           | Default: `true`, `info`                                                                     |

3. Applica le migrazioni Supabase (vedi setup) prima del primo deploy.

Header di sicurezza (CSP, HSTS, X-Frame-Options, Permissions-Policy) sono configurati in `next.config.ts`.

> Nota: il rate limiter è in-memory e su serverless si azzera a ogni cold start; `ENABLE_RATE_LIMITING` resta comunque consigliato.

## Cron e job schedulati

- **Notizie AI**: gli orari di generazione sono configurati **nel database** (tabella `ai_news_cron`: ora, minuto, categoria, prompt custom) e gestiti dalla dashboard admin (`/dashboard/admin/news`). L'esecuzione avviene tramite la Edge Function Supabase `genera-news` (invocata con service role key), con supporto `pg_cron` lato database.
- **Non esistono cron Vercel**: il file `vercel.json` è stato rimosso perché puntava a un endpoint mai implementato.
- Job DB accessori: retention a 90 giorni di `security_events` (`purge_security_events()`, job pg_cron `purge-security-events`).

## Documentazione dettagliata

La documentazione completa è in [`docs/`](docs/README.md):

| Documento                               | Contenuto                                              |
| --------------------------------------- | ------------------------------------------------------ |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, struttura, middleware, pattern                  |
| [DATABASE.md](docs/DATABASE.md)         | Tabelle, RLS, funzioni, trigger, migrazioni            |
| [API.md](docs/API.md)                   | Le API route con auth richiesta                        |
| [ROLES.md](docs/ROLES.md)               | Sistema multi-ruolo e permessi                         |
| [FEATURES.md](docs/FEATURES.md)         | Funzionalità per modulo                                |
| [ARENA.md](docs/ARENA.md)               | Sistema sfide 1v1 e punteggi                           |
| [EMAIL.md](docs/EMAIL.md)               | Sistema email e logging                                |
| [AI-NEWS.md](docs/AI-NEWS.md)           | Pipeline notizie AI (RSS + Gemini)                     |
| [FRONTEND.md](docs/FRONTEND.md)         | Convenzioni UI e design system                         |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Deploy e configurazione                                |
| [CAMERAS.md](docs/CAMERAS.md)           | Live view telecamere Tapo (go2rtc + Cloudflare Tunnel) |

## Licenza

Progetto privato — tutti i diritti riservati.
