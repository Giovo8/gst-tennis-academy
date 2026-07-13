# ANALYSIS.md — Report di analisi completa (FASE 1)

> Report temporaneo generato il 2026-07-12. Da rivedere prima della riscrittura della documentazione (FASE 2).
> Nessun file di codice o documentazione è stato modificato.

---

## 1. Struttura del progetto

```
.
├── src/
│   ├── app/               # App Router: ~100+ pagine, 89 API route handler
│   ├── components/        # 14 aree di componenti (admin, arena, auth, bookings, chat, ...)
│   ├── lib/               # 18 moduli (auth, email, security, supabase, validation, ...)
│   └── middleware.ts      # CSRF protection + refresh sessione Supabase
├── supabase/
│   ├── migrations/        # 67 migrazioni SQL (001–067)
│   ├── scripts/           # utilities + fixes
│   └── schema.sql         # schema completo
├── docs/                  # 12 file di documentazione
├── public/                # asset statici
├── vercel.json            # 1 cron job (⚠️ endpoint inesistente, vedi §8)
└── config: next.config.ts, tsconfig.json, eslint.config.mjs, jest.config.js, postcss.config.mjs
```

### Stack reale (da package.json)
| Tecnologia | Versione |
|---|---|
| Next.js | ^16.2.6 (App Router, Turbopack) |
| React / React DOM | 19.2.3 |
| TypeScript | ^5.9.3 (**strict: false**) |
| Tailwind CSS | v4 (@tailwindcss/postcss) |
| @supabase/supabase-js | ^2.88.0 (+ @supabase/ssr ^0.8.0) |
| Zod | ^3.24.1 |
| Resend | ^6.9.3 |
| @google/generative-ai | ^0.24.1 (Gemini) |
| rss-parser | ^3.13.0 |
| framer-motion | ^12.40.0, lucide-react, sonner, date-fns |
| Jest | ^30.2.0 + Testing Library (242 test passing, 23 skipped) |

Script npm: `dev`, `build`, `start`, `lint`, `format`, `test`, `test:watch`, `test:coverage`. Pre-commit: Husky + lint-staged.

### Routing per area
- **Pubblica**: `/`, `/login`, `/register`, `/news`, `/news/[id]`, `/tornei`, `/tornei/[id]`, `/lavora-con-noi`, pagine legali, `/auth/reset-password`
- **Atleta**: `/dashboard/atleta/(main)/` → bookings, corsi, arena, tornei, videos, profile
- **Maestro**: `/dashboard/maestro/(main)/` → bookings, corsi, arena, tornei, videos, mail (redirect legacy `/dashboard/coach/*` → `/dashboard/maestro/*` in next.config)
- **Admin/Gestore**: `/dashboard/admin/` → users, corsi, courts, tornei, bookings, staff, video-lessons, news (+ AI config), arena, job-applications, invite-codes, statistiche, chat
- **Chat**: `/chat` + vista admin

### API routes (89 handler) — gruppi principali
auth/signup · bookings (CRUD, availability, confirm/reject, batch, participants) · tournaments (CRUD, bracket/groups, matches, state transitions, stats) · arena (challenges, players, stats, reset-season) · ai-news (config, genera, bozze, approva/modifica/scarta, fonti, cron, logs, cleanup) · chat (conversations, messages, chat-groups) · notifications · admin (users, stats, video-lessons) · news, video-lessons, services, events · upload (news-image, staff-image, certificate) · utilities (health, weather, social/instagram, invite-codes, vari logs)

### Middleware (`src/middleware.ts`)
1. **CSRF**: blocca POST/PUT/PATCH/DELETE verso `/api/*` con Origin non in whitelist (host corrente + `NEXT_PUBLIC_SITE_URL`); esclude `/api/webhooks/*`.
2. **Sessione Supabase**: refresh automatico token via @supabase/ssr.
3. **⚠️ NON fa controllo ruoli** sulle route `/dashboard/*` (vedi §9).

---

## 2. Database Supabase (67 migrazioni, ~60 tabelle)

### Domini funzionali
| Dominio | Tabelle principali |
|---|---|
| Utenti | `profiles` (role enum: atleta/maestro/gestore/admin), `user_presence`, `staff`, `recruitment_applications` |
| Prenotazioni | `bookings` (constraint no-overlap con btree_gist), `booking_participants` (max 4, trigger), `court_blocks`, `courts_settings` |
| Tornei | `tournaments` (JSONB rounds/groups), `tournament_participants`, `tournament_matches`, `tournament_groups` |
| Arena | `arena_challenges`, `arena_stats` (ranking, livelli Bronzo→Diamante, streak) |
| Corsi | `courses`, `course_enrollments`, `lesson_attendance`, `video_lessons`, `video_assignments` |
| Chat | `conversations`, `internal_messages`, `chat_groups`, `chat_group_members`, `message_reads`, `typing_indicators` |
| News/AI | `news` (stato bozza/pubblicata/scartata, ai_generated, fonte), `ai_news_config`, `ai_news_fonti`, `ai_news_cron`, `ai_news_generation_logs` |
| Pagamenti | `payments`, `subscription_credits` (crediti settimanali), `subscriptions` (legacy), `orders` |
| Contenuti | `services`, `products`, `events`, `event_registrations`, `hero_content`, `hero_images`, `homepage_sections`, `promo_banner_settings` |
| Sistema | `activity_log`, `email_logs`, `email_campaigns/settings/templates/unsubscribes`, `system_settings`, `invite_codes`, `invite_code_uses`, `notifications` |

### RLS, funzioni, trigger
- RLS attiva su 50+ tabelle. Pattern: self-access (`auth.uid() = user_id`), role-based via helper `get_my_role()` (SECURITY DEFINER, evita ricorsione RLS), ibridi.
- Funzioni chiave: `get_my_role()`, `update_updated_at_column()` (25+ trigger), `check_booking_participants_limit()` (max 4), `consume_group_credit()` / `reset_weekly_credits()`, `update_arena_stats_on_challenge_complete()` (punteggio Arena), `cleanup_old_typing_indicators()`.
- Extensions: pgcrypto, btree_gist, pg_cron (opzionale), pg_net (opzionale).
- Enum: `user_role`, `booking_type`, `competition_type`, `competition_format`, `recruitment_role`.
- Storage: bucket `avatars` e `certificates`.
- Realtime: canali su bookings, notifications, messages, presence, typing.

### Schema drift
Nessun drift grave. Tabelle presenti nello schema ma con uso non riscontrato nel codice: `chat_rooms`, `programs`, `athlete_stats` (legacy → sostituita da `arena_stats`), `email_templates`/`email_settings` (solo config).

---

## 3. Autenticazione e ruoli

- **`verifyAuth()`** (`src/lib/auth/verifyAuth.ts`): verifica Bearer token + ruolo opzionale via `allowedRoles`. Tipizzato correttamente (`AuthSuccessResponse | AuthErrorResponse`) — la nota in memoria "ritorna Promise<any>" è **obsoleta**.
- Login/signup/reset: pagine `/login`, `/register`, `/auth/reset-password`; API `POST /api/auth/signup` (rate limited, Zod).
- **Protezione dashboard: solo client-side** via `AuthGuard.tsx` — i layout server non verificano il ruolo, il middleware nemmeno. RLS protegge i dati, ma l'UI può renderizzare brevemente per utenti col ruolo sbagliato.
- Service role key: usata solo server-side (`serverClient.ts`), mai esposta. Bypassa RLS: rischioso dove manca l'ownership check (vedi §9).

---

## 4. Integrazioni esterne

| Integrazione | Dove | Note |
|---|---|---|
| **Gemini** (`gemini-2.0-flash`) | `api/ai-news/cleanup` (traduzione EN→IT), `api/ai-news/genera` | Fallback se `GEMINI_API_KEY` assente; rate-limit rilevato via string match con fallback a parsing RSS locale; **nessun timeout** sulla chiamata SDK |
| **RSS** (rss-parser) | `api/ai-news/genera`, `api/ai-news/fonti/[id]/test` | Fonti configurabili in DB (`ai_news_fonti`); filtri regex anti-podcast/video; timeout fetch 10s; dedup su `fonte_url`; fallback immagini |
| **Resend** | `src/lib/email/*` | Template per booking created/confirm/cancel/reject + notifica registrazione a gestore; skip silenzioso se key assente; esiti loggati in `email_logs` |
| **Instagram oEmbed** (Meta) | `api/social/instagram` | Token opzionale, fallback scraping HTML (fragile); timeout 5s |
| **Open-Meteo** | `api/weather` | Dati meteo, rate limited |
| **Edge Function Supabase** | `functions/v1/genera-news` | Chiamata con service role key da ai-news/cron |

---

## 5. Variabili d'ambiente

### Usate nel codice
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `GEMINI_API_KEY`, `INSTAGRAM_OEMBED_TOKEN`, `FACEBOOK_APP_ACCESS_TOKEN`, `INSTAGRAM_POST_URLS`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `ENABLE_RATE_LIMITING`, `LOG_LEVEL`, `NODE_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `NEXT_PHASE`

### Incoerenze con `.env.example`
| Problema | Variabile |
|---|---|
| Usata nel codice ma **non documentata** | `GEMINI_API_KEY` ⚠️, `FACEBOOK_APP_ACCESS_TOKEN` |
| Documentata ma **mai usata** | `EMAIL_REPLY_TO`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SENTRY_DSN` |
| Schema Zod `env.ts` incompleto | mancano GEMINI/INSTAGRAM/FACEBOOK |

Nota: `.env.local` **non è tracciato in git** (`.gitignore` copre `.env*`) — verificato. Un agente aveva segnalato il contrario: falso positivo.

---

## 6. Codice morto / debito

1. **`check_buttons.py` e `scan.py`** nella root — script di debug fuori posto in un progetto Next.js.
2. **`/api/email/scheduler`**: la directory esiste ma è **vuota**; `vercel.json` la richiama ogni giorno alle 9:00 UTC → 404 quotidiano (verificato).
3. `@deprecated`: `COURTS`/`DEFAULT_COURTS` in `src/lib/courts/constants.ts:11` (usare `getCourts()`).
4. ~22 componenti in `src/components` senza import rilevati (molti in `ui/`, es. `ui/Breadcrumbs.tsx`) — da verificare manualmente prima di rimuovere.
5. File .md fuori posto: `src/components/layout/__tests__/mobile-navbar.test.md`, `src/lib/activity/README.md`.
6. Tabelle DB probabilmente inutilizzate: `chat_rooms`, `programs`, `athlete_stats`, `subscriptions` (legacy).
7. API route senza chiamate frontend rilevate (potenzialmente cron-only o orfane): `/api/stats/admin`, `/api/stats/coach`, `/api/dashboard/stats`, `/api/court-blocks`, alcune route tornei avanzate. Da confermare.
8. ESLint (stato marzo 2026): ~461 no-unused-vars, ~442 no-explicit-any, ~176 no-img-element, ~66 exhaustive-deps.

---

## 7. Documentazione attuale vs realtà

File esistenti: `README.md`, `CHANGELOG.md`, `docs/` (README, ARCHITECTURE, DATABASE, API, FEATURES, ROLES, ARENA, EMAIL, FRONTEND, DESIGN_SYSTEM, DEPLOYMENT). **Non esistono**: CLAUDE.md, `.cursorrules`, `.github/copilot-instructions.md`, CONTRIBUTING.md.

| Affermazione nei doc | Realtà |
|---|---|
| "236 test passing" (README, ARCHITECTURE, DEPLOYMENT) | **242 passing, 23 skipped** |
| "~69 API route" (API.md, ARCHITECTURE, docs/README) | **89 route handler** |
| "62 migrazioni / 001→062" (DATABASE, DEPLOYMENT) | **67 migrazioni (001→067)** |
| "~50 tabelle" (DATABASE.md) | conteggio impreciso, da rifare in FASE 2 |
| "Stripe - Pagamenti (opzionale)" (README) | **Stripe non è integrato** (solo colonna `stripe_payment_id` e commento in .env.example) |
| Sentry (NEXT_PUBLIC_SENTRY_DSN in .env.example) | **Sentry non integrato** |

---

## 8. ⚠️ PROBLEMI DI CODICE/SICUREZZA (da NON correggere ora — fase successiva)

### Critici
1. **IDOR / privilege escalation — `POST /api/invite-codes/validate`**: accetta `user_id` + `profile_data` dal body e fa upsert del profilo con service role key (bypassa RLS) **senza verificare che il richiedente sia quel `user_id`**.

### Alti
2. **IDOR — `POST /api/notifications`**: qualunque utente autenticato può creare notifiche per qualsiasi `user_id`.
3. **Information disclosure — `GET /api/bookings/availability`**: nessuna autenticazione; espone bookings, court_blocks e corsi.
4. **Protezione ruoli solo client-side** sulle route `/dashboard/*`: né middleware né layout server verificano il ruolo (i dati restano protetti da RLS, ma l'UI si renderizza).
5. **Cron Vercel → endpoint inesistente**: `/api/email/scheduler` richiamato ogni giorno ma non implementato (404). Inoltre `CRON_SECRET` documentato ma mai verificato.

### Medi
6. Nessun rate limiting sui tentativi di login (brute-force possibile); rate limiter presente ma applicato solo a signup, weather, bookings POST.
7. `POST /api/tournaments/create`: validazione manuale invece di Zod, campi numerici non validati.
8. `GEMINI_API_KEY` non documentata in `.env.example`; chiamate Gemini senza timeout.
9. Rate limiter **in-memory**: inefficace su deploy multi-istanza (Vercel serverless) e perso ad ogni cold start.

### Bassi
10. CSP in next.config con `unsafe-inline` (TODO nel file).
11. Alcuni file usano `console.log` raw invece di secure-logger (es. tournaments/create).
12. `tsconfig.json` con `strict: false`.

---

## 9. Piano FASE 2 (dopo approvazione)

1. **README.md**: riscrittura completa (descrizione, stack con versioni reali, architettura, setup, struttura cartelle, deploy Vercel, cron) — senza Stripe/Sentry.
2. **docs/**: riscrittura dei 12 file con numeri corretti (89 route, 67 migrazioni, 242 test) e contenuti verificati; possibile consolidamento.
3. **Commenti fuorvianti**: correzione mirata senza toccare la logica.
4. **FASE 3**: creazione `CLAUDE.md` e `.github/copilot-instructions.md` (oggi assenti) con convenzioni, ruoli, comandi, cosa non toccare.

---

*Fine report — in attesa di approvazione per procedere con la FASE 2.*
