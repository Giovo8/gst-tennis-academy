# GST Tennis Academy

Piattaforma web completa per la gestione di un'accademia di tennis: prenotazione campi e lezioni, corsi con presenze, tornei, sfide competitive (Arena), chat interna con gruppi, bacheca avvisi, feedback, notizie generate con AI e area amministrativa multi-ruolo.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth, database, storage, realtime, edge functions) · Resend · Google Gemini

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

| Tecnologia                                        | Versione                     | Uso                                            |
| ------------------------------------------------- | ---------------------------- | ---------------------------------------------- |
| [Next.js](https://nextjs.org)                     | ^16.4.3                      | Framework (App Router, Turbopack in sviluppo)  |
| [React](https://react.dev)                        | ^19.3.1                      | UI                                             |
| [TypeScript](https://www.typescriptlang.org)      | ^5.9.3                       | Linguaggio (`strict: false` in tsconfig)       |
| [Tailwind CSS](https://tailwindcss.com)           | ^4.3.3                       | Styling (via `@tailwindcss/postcss`)           |
| [Supabase](https://supabase.com)                  | supabase-js ^2.118, ssr ^0.8 | Auth, PostgreSQL, Storage, Realtime            |
| [Zod](https://zod.dev)                            | ^4.6.7                       | Validazione input delle API                    |
| [Resend](https://resend.com)                      | ^6.34                        | Email transazionali                            |
| [@google/generative-ai](https://ai.google.dev)    | ^0.24                        | Traduzione nella bonifica delle notizie AI     |
| [rss-parser](https://github.com/rbren/rss-parser) | ^3.13                        | Test dei feed RSS delle notizie AI             |
| [sharp](https://sharp.pixelplumbing.com)          | ^0.35                        | Ottimizzazione in WebP delle immagini caricate |
| [Recharts](https://recharts.org)                  | ^3.10                        | Grafici della dashboard maestro                |
| lucide-react, sonner, date-fns                    | —                            | Icone, toast, date (animazioni in CSS)         |
| [Jest](https://jestjs.io) 30 + Testing Library    | —                            | Test (307 passing, 17 skipped)                 |

La generazione delle notizie AI vera e propria gira nella Edge Function Supabase `genera-news` (Gemini via REST).

> Non integrati (nonostante vecchi riferimenti): **Stripe** e **Sentry**. I pagamenti sono tracciati a livello di dati (tabella `payments`) ma senza provider collegato.

## Architettura

### Ruoli

Quattro ruoli utente, definiti dall'enum PostgreSQL `user_role` e salvati in `profiles.role`:

| Ruolo     | Descrizione                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| `atleta`  | Prenota campi/lezioni, segue corsi e tornei, partecipa all'Arena, chat e Bacheca     |
| `maestro` | Come l'atleta, più lezioni private da confermare, corsi, presenze e video-lezioni    |
| `gestore` | Gestione operativa della struttura (equivale ad admin nella maggior parte delle API) |
| `admin`   | Accesso completo: utenti, campi, tornei, news/AI, avvisi, log                        |

Dettagli in [docs/ROLES.md](docs/ROLES.md).

### Autenticazione e autorizzazione

- **Supabase Auth**; la registrazione pubblica è **solo su invito** e il ruolo viene dal codice.
- Le **API route** verificano il Bearer token con `verifyAuth(req, ['admin', 'gestore'])` (`src/lib/auth/verifyAuth.ts`) oppure la sessione via cookie con `getRouteAuth()` (`src/lib/auth/routeAuth.ts`).
- Il **middleware** (`src/middleware.ts`) applica la protezione CSRF alle richieste mutanti verso `/api/*`, il rate limiting su tutte le API e il refresh della sessione per le pagine. Non controlla i ruoli.
- Le pagine dashboard sono protette lato client (layout di area + `AuthGuard`); la vera protezione dei dati è la **RLS** del database e i controlli nelle API (che usano la service role, quindi bypassano la RLS).

### Moduli principali

- **Prenotazioni** — campi, lezioni private/di gruppo e partite di torneo, fino a 4 partecipanti, orari ristretti per atleti e maestri, controllo conflitti con prenotazioni, blocchi campo e corsi (più vincolo anti-sovrapposizione nel DB), lezioni private da confermare, timeline admin con trascinamento.
- **Corsi** — calendario multi-periodo e multi-campo, iscrizioni anche di ospiti, quote e pagamenti, registro presenze.
- **Tornei** — eliminazione diretta, gironi + eliminazione o campionato; tabelloni, gironi e calendari generati in automatico; punteggi tennis set per set con ritiri.
- **Arena** — sfide 1v1 o doppio con classifica a punti, livelli (Bronzo → Diamante) e streak.
- **Chat** — messaggi diretti e gruppi (`internal_messages`, `chat_groups`), non letti e Realtime.
- **Bacheca avvisi** e **Feedback** — comunicazioni dallo staff agli atleti e suggerimenti da atleti e maestri, con conversazione.
- **Notizie AI** — feed RSS configurabili → Edge Function con Gemini → bozze da approvare in dashboard, con fallback senza AI.
- **Email** — notifiche transazionali via Resend (prenotazioni create, modificate, eliminate; registrazioni), esiti in `email_logs`. Senza `RESEND_API_KEY` l'invio viene saltato senza errori.
- **Amministrazione** — utenti, staff, blocchi campo, codici invito, candidature, video-lezioni, log attività ed eventi di sicurezza.

### Numeri del progetto

- **119 pagine** (App Router), **68 API route** (93 handler) in `src/app/api`
- **Migrazioni SQL** `supabase/migrations/001–097` (prossima: `098`), RLS sulle tabelle applicative
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

| Comando                                | Descrizione                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                          | Dev server (Turbopack, oppure Webpack se Windows blocca il compilatore nativo) |
| `npm run build`                        | Build di produzione                                                            |
| `npm start`                            | Avvio build di produzione                                                      |
| `npm run lint`                         | ESLint                                                                         |
| `npm run format`                       | Prettier su ts/tsx/js/json/md                                                  |
| `npm test`                             | Test Jest                                                                      |
| `npm run test:watch` / `test:coverage` | Test in watch / con coverage                                                   |
| `npx tsc --noEmit`                     | Type check                                                                     |

Pre-commit: Husky + lint-staged (Prettier sui file staged), attivato automaticamente da `npm install`.

## Struttura cartelle

```
.
├── src/
│   ├── app/                    # App Router
│   │   ├── (pagine pubbliche)  # /, /login, /register, /news, /tornei, /live, /lavora-con-noi, legali
│   │   ├── auth/               # callback Supabase Auth, reset password
│   │   ├── dashboard/
│   │   │   ├── atleta/(main)/  # bookings, corsi, arena, tornei, videos, mail, avvisi, feedback, profile
│   │   │   ├── maestro/(main)/ # come atleta + area maestro (molte pagine riesportano quelle atleta)
│   │   │   └── admin/          # users, bookings, corsi, courts, tornei, news (+ ai), avvisi, feedback…
│   │   └── api/                # 68 route handler (REST)
│   ├── components/             # UI per area: admin, auth, avvisi, bookings, chat, dashboard,
│   │                           # feedback, landing, layout, live-tennis, maestro, news,
│   │                           # notifications, tournaments, ui
│   ├── lib/                    # Logica condivisa:
│   │   ├── auth/               # verifyAuth, routeAuth, clientSession, logout
│   │   ├── supabase/           # client browser, server (cookie), service role
│   │   ├── bookings/           # conflitti, orari, permessi, side effect, prenotazioni torneo
│   │   ├── email/              # client Resend, template, logging
│   │   ├── security/           # rate limiter, regole, sanitize-server, security events
│   │   ├── hooks/              # useNotifications, useUnreadChat, useWeather, useCourts…
│   │   ├── validation/         # schemi Zod
│   │   ├── logger/             # secure-logger (redazione dati sensibili)
│   │   └── …                   # arena, notifications, tournaments, ai-news, avvisi, feedback…
│   ├── __tests__/              # test Jest
│   └── middleware.ts           # CSRF + rate limiting + refresh sessione
├── supabase/
│   ├── migrations/             # 001–097 (prossima: 098)
│   ├── scripts/                # script una tantum necessari al setup da zero
│   ├── functions/genera-news/  # Edge Function notizie AI
│   └── schema.sql              # schema base iniziale
├── docs/                       # documentazione dettagliata (vedi sotto)
├── public/                     # asset statici
└── .env.example                # template variabili d'ambiente
```

## Deploy su Vercel

1. Importa il repository su Vercel (framework: **Next.js**, build command di default `next build`).
2. Configura le variabili d'ambiente nel progetto Vercel:

| Variabile                        | Obbligatoria | Note                                                                                        |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | ✅           | URL progetto Supabase                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | ✅           | Chiave anon (pubblica)                                                                      |
| `SUPABASE_URL`                   | ⚪           | URL lato server (default: `NEXT_PUBLIC_SUPABASE_URL`)                                       |
| `SUPABASE_SERVICE_ROLE_KEY`      | ✅           | **Solo server** — mai `NEXT_PUBLIC_`                                                        |
| `NEXT_PUBLIC_APP_URL`            | ✅           | URL pubblico del sito (link nelle email, redirect del reset password)                       |
| `NEXT_PUBLIC_SITE_URL`           | ✅           | Usato per la whitelist CSRF                                                                 |
| `RESEND_API_KEY`, `EMAIL_FROM`   | ⚪           | Senza, le email vengono saltate                                                             |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | ⚪           | Senza, le notizie AI usano solo RSS (vanno impostate anche nei secrets della Edge Function) |
| `LOG_LEVEL`                      | ⚪           | Livello minimo dei log (default `info` in produzione)                                       |

3. Applica le migrazioni Supabase (vedi setup) prima del deploy del codice che le richiede (in particolare la 096 per la chat).
4. Deploya la Edge Function: `supabase functions deploy genera-news`.

Header di sicurezza (CSP, HSTS, X-Frame-Options, Permissions-Policy) sono configurati in `next.config.ts`. Il rate limiter è in-memory: su serverless si azzera a ogni cold start e non è condiviso tra istanze. Guida completa in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Cron e job schedulati

- **Notizie AI**: gli orari di generazione sono configurati **nel database** (tabella `ai_news_cron`: ora, minuto, categoria, prompt custom) e gestiti dalla dashboard admin (`/dashboard/admin/news/ai/configurazione`). L'esecuzione avviene tramite la Edge Function Supabase `genera-news` (invocata con service role key), con supporto `pg_cron` lato database.
- **Non esistono cron Vercel**: il file `vercel.json` è stato rimosso perché puntava a un endpoint mai implementato.
- Job DB accessori: retention a 90 giorni di `security_events` (`purge_security_events()`, job pg_cron `purge-security-events`).

## Documentazione dettagliata

La documentazione completa è in [`docs/`](docs/README.md):

| Documento                                 | Contenuto                                                  |
| ----------------------------------------- | ---------------------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Stack, struttura, middleware, auth, client Supabase        |
| [DATABASE.md](docs/DATABASE.md)           | Tabelle, RLS, funzioni, trigger, migrazioni, setup da zero |
| [API.md](docs/API.md)                     | Tutte le API route con auth richiesta                      |
| [ROLES.md](docs/ROLES.md)                 | Sistema multi-ruolo e permessi                             |
| [FEATURES.md](docs/FEATURES.md)           | Funzionalità per modulo                                    |
| [ARENA.md](docs/ARENA.md)                 | Sistema sfide 1v1 e punteggi                               |
| [EMAIL.md](docs/EMAIL.md)                 | Sistema email e logging                                    |
| [AI-NEWS.md](docs/AI-NEWS.md)             | Pipeline notizie AI (RSS + Gemini)                         |
| [FRONTEND.md](docs/FRONTEND.md)           | Convenzioni frontend, mobile, accessibilità                |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Palette, tipografia, componenti UI                         |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)       | Deploy e configurazione                                    |
| [CAMERAS.md](docs/CAMERAS.md)             | Live view telecamere Tapo (go2rtc + Cloudflare Tunnel)     |

## Licenza

Progetto privato — tutti i diritti riservati.
