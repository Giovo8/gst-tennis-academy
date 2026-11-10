# GST Tennis Academy

Piattaforma web per la gestione di un'accademia di tennis: prenotazione di campi e lezioni, corsi con presenze, tornei, sfide competitive (Arena), chat interna con gruppi, bacheca avvisi, feedback, notizie generate con AI e area amministrativa multi-ruolo.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) · Resend (email) · Google Gemini (notizie AI). Deploy su Vercel.

> **Stripe** e **Sentry** non sono integrati: i pagamenti sono solo registrati a mano nella tabella `payments`.

## Ruoli

| Ruolo     | Cosa fa                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `atleta`  | Prenota campi e lezioni, segue corsi e tornei, partecipa all'Arena, chat e Bacheca   |
| `maestro` | Come l'atleta, più lezioni private da confermare, corsi, presenze e video-lezioni    |
| `gestore` | Gestione operativa della struttura (equivale ad admin nella maggior parte delle API) |
| `admin`   | Accesso completo: utenti, campi, tornei, news/AI, avvisi, log                        |

La registrazione pubblica è **solo su invito**: il ruolo viene dal codice invito.

## Setup locale

Servono Node.js 20+ e un progetto [Supabase](https://supabase.com). Facoltative le chiavi [Resend](https://resend.com) (senza, le email vengono saltate) e [Gemini](https://ai.google.dev) (senza, le notizie AI usano solo i feed RSS).

```bash
npm install
cp .env.example .env.local   # compila con le chiavi del tuo progetto Supabase
npm run dev
```

Il database si prepara dallo SQL Editor di Supabase, nell'ordine descritto in [docs/DATABASE.md → Setup da zero](docs/DATABASE.md#setup-da-zero).

## Comandi

| Comando                                | Descrizione                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                          | Dev server (Turbopack, oppure Webpack se Windows blocca il compilatore nativo) |
| `npm run build` / `npm start`          | Build di produzione e avvio                                                    |
| `npm run lint`                         | ESLint                                                                         |
| `npm run format`                       | Prettier                                                                       |
| `npm test`                             | Test Jest                                                                      |
| `npm run test:watch` / `test:coverage` | Test in watch / con coverage                                                   |
| `npx tsc --noEmit`                     | Type check                                                                     |

Il pre-commit (Husky + lint-staged) formatta con Prettier i file in staging; si attiva da solo con `npm install`.

## Struttura

```
src/
├── app/            # pagine App Router, dashboard per ruolo (atleta, maestro, admin), API in app/api/
├── components/     # componenti per area (bookings, tournaments, dashboard, landing, ui…)
├── lib/            # logica condivisa: auth, supabase, bookings, courses, email, security, validation…
├── __tests__/      # test Jest
└── middleware.ts   # CSRF + rate limiting + refresh della sessione
supabase/
├── migrations/     # migrazioni SQL numerate, applicate a mano dallo SQL Editor
├── scripts/        # script una tantum necessari al setup da zero
├── functions/      # Edge Function genera-news (notizie AI)
└── schema.sql      # schema base iniziale
docs/               # documentazione
```

## Documentazione

| Documento                               | Contenuto                                                         |
| --------------------------------------- | ----------------------------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Struttura, middleware, autenticazione, client Supabase, realtime  |
| [FEATURES.md](docs/FEATURES.md)         | Funzionalità per modulo                                           |
| [ROLES.md](docs/ROLES.md)               | Ruoli e pagine di ogni area                                       |
| [API.md](docs/API.md)                   | Tutte le API route con metodi e autenticazione richiesta          |
| [DATABASE.md](docs/DATABASE.md)         | Tabelle, RLS, funzioni, migrazioni, setup da zero                 |
| [FRONTEND.md](docs/FRONTEND.md)         | Convenzioni frontend, design system, mobile, prestazioni          |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Deploy su Vercel, variabili d'ambiente, Edge Function, job nel DB |
| [ARENA.md](docs/ARENA.md)               | Sfide 1v1: punteggi, livelli, streak                              |
| [EMAIL.md](docs/EMAIL.md)               | Email transazionali e log                                         |
| [AI-NEWS.md](docs/AI-NEWS.md)           | Notizie AI: fonti RSS, Gemini, bozze, cron su Supabase            |

Storico delle modifiche in [CHANGELOG.md](CHANGELOG.md); istruzioni per gli agenti AI in [CLAUDE.md](CLAUDE.md).

## Licenza

Progetto privato — tutti i diritti riservati.
