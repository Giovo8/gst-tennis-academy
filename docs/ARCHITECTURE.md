# Architettura

Panoramica tecnica di GST Tennis Academy: stack, struttura del progetto, middleware, autenticazione e autorizzazione, accesso ai dati e configurazioni notevoli.

## Stack

| Tecnologia                                                     | Uso                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| Next.js 16 (App Router)                                        | Framework full-stack; Turbopack in sviluppo                   |
| React 19, TypeScript (`strict: false`)                         | UI e linguaggio                                               |
| Tailwind CSS v4 (`@tailwindcss/postcss`)                       | Stile                                                         |
| `@supabase/supabase-js`, `@supabase/ssr`                       | Auth, PostgreSQL, Storage, Realtime; sessione via cookie      |
| Zod                                                            | Validazione dei body delle API                                |
| Resend                                                         | Email transazionali                                           |
| `@google/generative-ai`                                        | Traduzione nella bonifica notizie AI (`/api/ai-news/cleanup`) |
| `rss-parser`                                                   | Test dei feed RSS delle notizie AI                            |
| `recharts`                                                     | Grafici della dashboard maestro (caricati con `next/dynamic`) |
| `sharp`                                                        | Conversione in WebP delle immagini caricate                   |
| `lucide-react`, `sonner`, `date-fns`, `clsx`, `tailwind-merge` | Icone, toast, date, utility CSS                               |
| Jest + `@testing-library/jest-dom`                             | Test                                                          |

Le versioni esatte sono in `package.json`. La generazione delle notizie AI avviene nella Edge Function Supabase `genera-news` (Deno, Gemini via REST), non nel processo Next.js: vedi [AI-NEWS.md](AI-NEWS.md).

Non integrati: **Stripe** e **Sentry**. I pagamenti sono solo registrati nella tabella `payments`.

## Struttura del progetto

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing pubblica (ISR, revalidate 60 s)
│   │   ├── login/ register/ news/ tornei/ live/ lavora-con-noi/ privacy/ terms/ cookie-policy/
│   │   ├── auth/                 # callback (route Supabase Auth) e reset-password
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # smistamento verso la dashboard del ruolo
│   │   │   ├── atleta/(main)/    # bookings, corsi, arena, tornei, videos, mail, avvisi, feedback, profile, notifications
│   │   │   ├── maestro/(main)/   # come atleta (molte pagine riesportano quelle atleta) + maestro/ ("Area Maestro")
│   │   │   └── admin/            # users, bookings, corsi, courts, tornei, news (+ ai), staff, avvisi, feedback, chat, …
│   │   └── api/                  # route handler REST (vedi API.md)
│   ├── components/               # admin, auth, avvisi, bookings, chat, dashboard, feedback, landing,
│   │                             # layout, live-tennis, maestro, news, notifications, tournaments, ui
│   ├── lib/
│   │   ├── auth/                 # verifyAuth (Bearer), routeAuth (cookie), clientSession, logout
│   │   ├── supabase/             # client.ts, server.ts, serverClient.ts (vedi sotto)
│   │   ├── bookings/             # conflitti con corsi, orari, permessi, side effect (email/notifiche), prenotazioni torneo
│   │   ├── courses/              # calendario dei corsi: date delle lezioni, campo e orario per data
│   │   ├── arena/                # servizio sfide, costanti, helper di presentazione e punteggio
│   │   ├── tournaments/          # punteggio tennis, struttura, calendario del campionato
│   │   ├── email/                # client Resend, template, log su email_logs
│   │   ├── notifications/        # notifyAdmins/notifyAthletes, notifiche chat raggruppate, link
│   │   ├── security/             # rate limiter in memoria, regole per path, sanitize-server, security events
│   │   ├── hooks/                # useNotifications, useUnreadChat, useWeather, useBookableTournaments, useCourts
│   │   ├── validation/           # schemi Zod (schemas.ts)
│   │   ├── logger/               # secure-logger (redazione dei dati sensibili)
│   │   └── activity/ ai-news/ avvisi/ config/ constants/ courts/ feedback/ images/ landing/
│   │       live-tennis/ news/ seo/ utils/ roles.ts toast.ts utils.ts
│   ├── __tests__/                # test Jest
│   └── middleware.ts             # CSRF + rate limiting + refresh sessione
├── supabase/
│   ├── migrations/               # migrazioni SQL numerate + archive/
│   ├── functions/genera-news/    # Edge Function per la generazione notizie AI
│   ├── scripts/                  # script una tantum necessari al setup da zero
│   └── schema.sql                # schema base iniziale
├── scripts/next.mjs              # avvia next con Webpack se Windows blocca il compilatore nativo
├── docs/                         # documentazione (indice nel README)
├── public/                       # asset statici (logo, immagini landing, robots.txt, sitemap.xml)
├── next.config.ts                # security headers, immagini, redirect
└── .env.example                  # variabili d'ambiente lette dal codice
```

## Middleware (`src/middleware.ts`)

Gira su tutte le richieste tranne gli asset statici (il matcher esclude `_next/static`, `_next/image`, la favicon e le immagini). In ordine:

1. **Protezione CSRF** — per `POST/PUT/PATCH/DELETE` verso `/api/*` (esclusi `/api/webhooks/*`): se l'header `Origin` è presente e non coincide con l'host corrente (http/https) o con `NEXT_PUBLIC_SITE_URL`, risposta **403** e evento `csrf.origin_rifiutata` in `security_events`. Le richieste senza `Origin` (server-to-server) passano.
2. **Rate limiting** — su tutte le `/api/*`, con la regola del path in `src/lib/security/rateLimitRules.ts` e il contatore per IP + bucket. Oltre il limite: **429** con `Retry-After`. Dettagli in [API.md](API.md#note-trasversali).
3. **Refresh della sessione** — solo per le pagine (le API escono prima: si autenticano col Bearer token). `supabase.auth.getClaims()` verifica il JWT in locale e va in rete solo per rinnovare un token scaduto, riscrivendo i cookie.

Il middleware **non controlla i ruoli**: la protezione delle pagine è client-side, quella dei dati è nelle API e nella RLS.

## Autenticazione e autorizzazione

Supabase Auth con quattro ruoli (`atleta | maestro | gestore | admin`, enum `user_role` in `profiles.role`). Tre livelli di difesa.

### 1. API route

| Helper                           | File                         | Come autentica                                                                  | Uso                                                                                                                                                                                              |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `verifyAuth(req, allowedRoles?)` | `src/lib/auth/verifyAuth.ts` | Header `Authorization: Bearer <token>` (`getUser(token)`) + ruolo da `profiles` | Route chiamate con `fetch` e header esplicito. Ritorna `{ success: true, data: { user, profile } }` oppure `{ success: false, response }` (401 token mancante/non valido, 403 ruolo non ammesso) |
| `getRouteAuth()`                 | `src/lib/auth/routeAuth.ts`  | Cookie di sessione (`createClient()` di `server.ts`)                            | Route chiamate dal browser senza header. Ritorna `{ user, role }` o `null`; si combina con `isAdmin(role)`, `unauthorized()`, `forbidden()`                                                      |
| `requireAdminOrGestore()`        | `src/lib/ai-news/auth.ts`    | Come `getRouteAuth`                                                             | Wrapper per le route `/api/ai-news/*`                                                                                                                                                            |

```ts
const auth = await verifyAuth(request, ['admin', 'gestore']);
if (!auth.success) return auth.response;
const { user, profile } = auth.data;
```

Tutte le negazioni (token mancante o non valido, ruolo insufficiente, sessione assente) vengono registrate in `security_events`. Il dettaglio per singola route è in [API.md](API.md).

### 2. Pagine dashboard

La protezione delle pagine `/dashboard/*` è **solo client-side**: i layout (`AthleteLayout`, `MaestroAthleteLayout`, `AdminLayout`, montati dai `layout.tsx` delle tre aree) reindirizzano chi non ha sessione o ha un ruolo non ammesso, e alcune pagine aggiungono `AuthGuard` (`src/components/auth/AuthGuard.tsx`, con ruolo memorizzato per sessione). Per fluidità i layout mostrano subito la pagina e controllano il ruolo in parallelo: i dati restano protetti da API e RLS, ma l'interfaccia può comparire per un istante a un utente con ruolo sbagliato prima del redirect.

`/dashboard` (senza ruolo) smista verso la dashboard corretta con `getDestinationForRole()` (`src/lib/roles.ts`).

### 3. Row Level Security (RLS)

Ultima linea di difesa sui dati: policy self-access (`auth.uid() = user_id`) e role-based tramite `get_my_role()` (SECURITY DEFINER, evita la ricorsione su `profiles`). Alcune tabelle recenti (`feedback`, `feedback_risposte`, `avvisi`) hanno la RLS attiva **senza policy**: sono raggiungibili solo dalle API con service role. Dettagli in [DATABASE.md](DATABASE.md).

## Client Supabase

| File / funzione                     | Client                                             | Chiave           | Contesto                                                                                                                              |
| ----------------------------------- | -------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/supabase/client.ts`        | `createBrowserClient` (@supabase/ssr, flusso PKCE) | anon             | Browser: sessione nei cookie, leggibile anche dai route handler. Singleton                                                            |
| `src/lib/supabase/server.ts`        | `createServerClient` (@supabase/ssr)               | anon             | Server: sessione dell'utente dai cookie (`getRouteAuth`)                                                                              |
| `src/lib/supabase/serverClient.ts`  | `createClient` (supabase-js)                       | **service role** | Solo server: **bypassa la RLS**. Singleton usato da quasi tutte le API route, che devono fare i propri controlli di ruolo e ownership |
| `src/lib/landing/getLandingData.ts` | `createClient` senza sessione                      | anon             | Lettura lato server di news e staff per la home (stesse policy di un visitatore anonimo, compatibile con l'ISR)                       |

**Utente corrente lato client**: `getSessionUser()` (`src/lib/auth/clientSession.ts`) legge la sessione locale senza chiamate di rete; `supabase.auth.getUser()` interrogherebbe il server Auth a ogni chiamata. Lato server restano obbligatori `getUser()` / `verifyAuth`.

## Accesso ai dati

La maggior parte delle **letture** (e molte scritture di dominio: corsi, presenze, blocchi campo, video-lezioni, staff, codici invito…) avviene **direttamente dalle pagine** con il client browser, protetta dalla RLS. Le API esistono dove serve logica server: service role, controlli di conflitto, email, notifiche ad altri utenti, upload, integrazioni esterne. Per questo una pagina che legge una tabella non ha necessariamente una route corrispondente.

## Realtime

Supabase Realtime (`postgres_changes`) è usato per:

| Tabella             | Dove                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `notifications`     | `useNotifications`, `NotificationsDropdown` (filtro `user_id`)       |
| `internal_messages` | `ChatView` (nuovi messaggi), `useUnreadChat` (pallino "Chat" in nav) |
| `bookings`          | Dashboard admin (aggiornamento della timeline, con debounce)         |

Le tabelle devono essere nella publication `supabase_realtime` (vedi [DATABASE.md](DATABASE.md#realtime)).

## Configurazioni notevoli

### `next.config.ts`

- **Security headers** su tutte le route: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microfono e geolocalizzazione disattivati), HSTS e una **Content-Security-Policy** con `script-src 'self' 'unsafe-inline'` (più `'unsafe-eval'` solo in sviluppo; TODO nel file per passare a una CSP con nonce), `connect-src` limitato a Supabase e Open-Meteo, `frame-src` a YouTube nocookie, `frame-ancestors 'none'`.
- **Immagini**: `remotePatterns` volutamente vuoto (l'endpoint `/_next/image` è pubblico e ogni URL nuovo consuma quota di trasformazioni). Le immagini remote sono servite con `unoptimized` (`ui/NewsImage`, `ui/Avatar`), già ottimizzate in WebP al caricamento. Formato servito: solo WebP.
- **Redirect** permanente legacy: `/dashboard/coach/*` → `/dashboard/maestro/*`.

### `tsconfig.json`

`strict: false` e `noImplicitAny: false`: type-checking permissivo (debito tecnico noto). Alias `@/*` → `./src/*`. Le cartelle `__tests__` e `supabase/functions` sono escluse dal check del build; i test si possono verificare a parte con un tsconfig temporaneo che le includa.

### `jest.config.js`

`next/jest`, ambiente `jsdom`, alias `@/*`; i test sono compilati con il compilatore TypeScript (`jest.transform.js`) e non con SWC, che Windows può bloccare. Soglia di coverage globale al 10%. I test coprono soprattutto la logica pura di `src/lib/` (conflitti, orari, punteggi tennis, ruoli, notifiche, rate limiting) più alcune route con Supabase simulato; `tournament-flows.test.ts` gira solo con credenziali Supabase reali.

### Qualità del codice

- ESLint 9 (`eslint-config-next`) + Prettier; hook pre-commit Husky + lint-staged (Prettier sui file staged), attivo dopo `npm install`.
- Debito ESLint noto: circa 230 errori e 90 warning, quasi tutti `no-explicit-any` e regole del React Compiler (`react-hooks/immutability`, `set-state-in-effect`, `exhaustive-deps`) sparse nelle pagine più grandi, più alcuni `<img>` e `window.location`. Non bloccano il build; vanno ridotti file per file quando si toccano.
- Next.js 16 segnala in build che la convenzione `middleware.ts` è deprecata a favore di `proxy.ts`: la migrazione (rinomina del file e della funzione esportata) va fatta con attenzione, perché il middleware contiene CSRF e rate limiting.
- Logger (`src/lib/logger/secure-logger.ts`): JSON strutturato in produzione, redazione automatica di campi come password, token, cookie; livello minimo da `LOG_LEVEL`.
