# Architettura

Panoramica dell'architettura tecnica di GST Tennis Academy.

---

## Stack tecnologico

### Framework e runtime

| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| Next.js | 16.2.6 | Framework React con App Router, API routes, middleware |
| React | 19.2.3 | Libreria UI |
| TypeScript | 5.9.3 | Type safety (modalità `strict` disabilitata in `tsconfig.json`) |
| Node.js | ≥ 20.19 | Runtime |

### Librerie principali

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| `@supabase/supabase-js` | 2.88.0 | Client Supabase |
| `@supabase/ssr` | 0.8.0 | Gestione sessione/auth lato server |
| `resend` | 6.9.3 | Invio email transazionali |
| `zod` | 3.24.1 | Validazione input e schemi |
| `date-fns` | 4.1.0 | Manipolazione date |
| `framer-motion` | 12.40.0 | Animazioni |
| `sonner` | 2.0.7 | Toast/notifiche UI |
| `lucide-react` | 0.562.0 | Icone |
| `isomorphic-dompurify` | 2.18.0 | Sanitizzazione XSS (server e client) |
| `clsx` + `tailwind-merge` | 2.1.1 / 3.4.0 | Composizione classi CSS |

### Styling, testing e tooling

- **Tailwind CSS 4** con `@tailwindcss/postcss`.
- **Jest 30** + Testing Library (`jsdom`) — **236 test** in `src/__tests__/`.
- **ESLint 9** (config Next.js), **Prettier 2**, **Husky 8** + **lint-staged 13** per gli hook pre-commit.
- Deploy su **Vercel** con cron support.

---

## Struttura del progetto

```
gst-tennis-academy/
├── docs/                       # Documentazione tecnica
├── public/                     # Asset statici (robots.txt, sitemap, immagini)
├── src/
│   ├── middleware.ts           # CSRF + refresh sessione su ogni richiesta
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API route handlers (~69 route)
│   │   ├── dashboard/          # Dashboard per ruolo (atleta, maestro, admin)
│   │   ├── tornei/             # Tornei pubblici
│   │   ├── classifiche/        # Classifiche pubbliche
│   │   ├── news/               # News pubbliche
│   │   ├── auth/, login/, register/   # Autenticazione
│   │   └── (pagine legali e statiche)
│   ├── components/             # Componenti React per dominio
│   │   ├── admin/ arena/ auth/ bookings/ chat/ dashboard/
│   │   ├── landing/ layout/ news/ notifications/ profile/
│   │   ├── theme/ tournaments/ ui/
│   ├── lib/                    # Logica applicativa e utility
│   │   ├── supabase/           # 3 client (browser, server, service role)
│   │   ├── auth/ roles.ts      # Autenticazione e ruoli
│   │   ├── bookings/ arena/ courts/ tournaments
│   │   ├── email/ notifications/ activity/ logger/
│   │   ├── validation/ security/ config/ constants/
│   │   ├── seo/ hooks/ utils/ types/
│   └── __tests__/              # Test Jest
├── supabase/
│   ├── schema.sql              # Schema base
│   └── migrations/             # Migrazioni 001 → 062
├── next.config.ts              # Config Next.js (header sicurezza, immagini, redirect)
├── jest.config.js              # Config testing
├── vercel.json                 # Cron job
└── package.json
```

---

## Client Supabase

L'applicazione usa **tre client distinti** in base al contesto di sicurezza:

| Client | File | Chiave | RLS | Uso |
|--------|------|--------|-----|-----|
| **Browser** | `src/lib/supabase/client.ts` | Anon key (pubblica) | ✅ Applicata | Componenti React lato client; rispetta la sessione utente (flusso PKCE) |
| **Server** | `src/lib/supabase/server.ts` | Anon key | ✅ Applicata | Route handler e server component; gestisce i cookie di sessione |
| **Service Role** | `src/lib/supabase/serverClient.ts` | Service role key (**segreta**) | ⚠️ **Bypassata** | Operazioni admin, cron, webhook; solo lato server, mai esposta al client |

> ⚠️ Il client service role bypassa tutte le policy RLS: usarlo esclusivamente in
> codice server-side per operazioni amministrative controllate.

---

## Middleware e sicurezza

`src/middleware.ts` viene eseguito su ogni richiesta e si occupa di:

- **Protezione CSRF**: valida l'`Origin` per tutte le richieste mutanti (POST/PUT/PATCH/DELETE)
  verso `/api/*`. Le route `/api/webhooks/*` sono esentate (richieste server-to-server).
  Origin non valido → `403 Forbidden`.
- **Refresh sessione**: rigenera i token di sessione Supabase mantenendoli aggiornati.

### Header di sicurezza (`next.config.ts`)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (max-age 1 anno)
- `Content-Security-Policy` (con `'unsafe-inline'` per gli stili; TODO: migrazione a CSP nonce-based)

### Difese applicative (`src/lib/security/`)

- **Sanitizzazione**: `sanitize-server.ts` (escaping HTML/SQL, email/URL/UUID lato server) e
  `sanitize.ts` (`sanitizeHtml()` con DOMPurify e whitelist di tag sicuri).
- **Rate limiting**: `rate-limiter.ts` con sliding window in memoria e limiti per endpoint
  (auth 5/15min, signup 3/ora, lettura API 100/min, email 10/ora).
- **Validazione**: schemi **Zod** in `src/lib/validation/schemas.ts` per ogni input utente.
- **Logging sicuro**: `src/lib/logger/secure-logger.ts` con redazione automatica dei campi sensibili.

---

## Variabili d'ambiente

Gestite in modo type-safe da `src/lib/config/env.ts` (validazione Zod con fallback).

### Obbligatorie

| Variabile | Descrizione |
|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase (pubblica) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anonima Supabase (pubblica) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave service role (**segreta, solo server**) |

### Opzionali / per funzionalità

| Variabile | Default | Uso |
|-----------|---------|-----|
| `SUPABASE_URL` | fallback su `NEXT_PUBLIC_SUPABASE_URL` | Override URL lato server |
| `NEXT_PUBLIC_APP_URL` | `https://www.gstacademy.it` (prod) | URL app per link/redirect |
| `NEXT_PUBLIC_SITE_URL` | fallback su `NEXT_PUBLIC_APP_URL` | Validazione origin CSRF |
| `RESEND_API_KEY` | — | API key email (email disabilitate se assente) |
| `EMAIL_FROM` | `GST Tennis Academy <onboarding@resend.dev>` | Mittente email |
| `CRON_SECRET` | — | Protezione endpoint cron `/api/email/scheduler` |
| `INSTAGRAM_OEMBED_TOKEN` / `FACEBOOK_APP_ACCESS_TOKEN` / `INSTAGRAM_POST_URLS` | — | Feed social homepage |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Verbosità log |
| `ENABLE_RATE_LIMITING` | `true` | Abilita rate limiting |
| `NODE_ENV` | `development` | Modalità ambiente |

> ⚠️ **Mai** usare il prefisso `NEXT_PUBLIC_` per `SUPABASE_SERVICE_ROLE_KEY`,
> `RESEND_API_KEY` o `CRON_SECRET`: sono segreti server-only.

---

## Script disponibili

```bash
npm run dev            # Server di sviluppo (http://localhost:3000)
npm run build          # Build di produzione
npm run start          # Avvio in produzione
npm run lint           # ESLint
npm run format         # Prettier
npm test               # Jest (236 test)
npm run test:watch     # Jest in watch mode
npm run test:coverage  # Report di copertura
```
