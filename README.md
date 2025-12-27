# GST Tennis Academy 🎾

Piattaforma completa per la gestione di un'accademia di tennis con sistema di prenotazioni, gestione utenti e ruoli multipli.

## 🚀 Funzionalità Principali

### 👥 Sistema Ruoli
- **Atleti**: Prenotazione campi e lezioni private
- **Maestri**: Conferma/rifiuta lezioni private assegnate
- **Gestori**: Approvazione finale prenotazioni dopo conferma maestro
- **Admin**: Gestione completa utenti, ruoli e sistema

### 📅 Sistema Prenotazioni
- **Calendario interattivo** con slot orari (8:00-22:00)
- **3 tipi di prenotazioni**:
  - Campo libero (conferma automatica)
  - Lezione privata (richiede conferma maestro + gestore)
  - Lezione di gruppo
- **Sistema doppia conferma** per lezioni private
- **Gestione conflitti** slot orari
- **Storico prenotazioni** con filtri

### 🎨 UI/UX
- Design moderno con Tailwind CSS
- Navbar dinamica con info ruolo utente
- Dashboard personalizzate per ogni ruolo
- Responsive mobile-first
- Dark theme professionale

## 🛠️ Stack Tecnologico

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Database**: PostgreSQL con Row Level Security

## 📦 Installazione

```bash
# Installa dipendenze
npm install

# Copia file environment
cp .env.example .env.local
```

Configura `.env.local` con le tue credenziali Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🗄️ Setup Database

1. Vai su Supabase → SQL Editor
2. Esegui in ordine:
   - `supabase/RESET_FINALE.sql` (crea schema completo)
   - `supabase/FIX_RLS_DEFINITIVO.sql` (configura RLS policies)
   - `supabase/AGGIUNGI_CONFERME.sql` (aggiunge sistema conferme)

3. Crea utenti test da Authentication → Users:
   - admin@gst.it (password: Password123!)
   - maestro@test.it (password: Password123!)
   - atleta@test.it (password: Password123!)

## 🚀 Avvio Applicazione

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

## 📋 Struttura Database

### Tabelle Principali
- `profiles`: Utenti con ruoli
- `bookings`: Prenotazioni con sistema conferme
- `products`: Catalogo prodotti shop (solo visualizzazione)
- `services`: Servizi offerti
- `courses`: Corsi di tennis
- `enrollments`: Iscrizioni ai corsi
- `events`: Eventi e tornei

## 🔐 Flusso Prenotazioni

1. **Atleta** crea prenotazione:
   - Campo → Conferma automatica
   - Lezione privata → Status "pending"

2. **Maestro** (solo lezioni private):
   - Riceve notifica
   - Conferma o rifiuta
   - Status → "confirmed_by_coach"

3. **Gestore**:
   - Vede tutte le prenotazioni
   - Approva dopo conferma maestro
   - Status → "confirmed"

## 🎯 Prossimi Sviluppi

- [ ] Sistema notifiche email
- [ ] Export report PDF
- [ ] Dashboard con grafici statistici
- [ ] App mobile (React Native)
- [ ] Integrazione pagamenti Stripe
- [ ] Sistema messaggistica interna

When `STRIPE_MOCK=1` the existing `POST /api/stripe/checkout` will return a mock `url` pointing to `/shop/success?session_id=MOCK_<timestamp>` so you can test the client redirect flow. You can also simulate webhook events by POSTing to `/api/stripe/simulate` with the event payload:

```bash
curl -X POST http://localhost:3000/api/stripe/simulate -H "Content-Type: application/json" -d '{"type":"checkout.session.completed","session":{"id":"MOCK_123","amount_total":9900,"currency":"eur","customer_details":{"email":"test@example.com"},"metadata":{}}}'
```

### Instagram oEmbed (optional)

This project can fetch Instagram post embeds server-side via the Facebook Graph API `instagram_oembed` endpoint. To enable:

1. Create a Facebook App at https://developers.facebook.com/apps and add the **Instagram oEmbed** product (or enable the appropriate API access).
2. Obtain an App Access Token by combining your `APP_ID` and `APP_SECRET` as `APP_ID|APP_SECRET` or using the Graph API Explorer to generate a token.
3. Set `INSTAGRAM_OEMBED_TOKEN` in your `.env.local` to the app access token.
4. Add the posts you want to display to `INSTAGRAM_POST_URLS`, example:

```env
INSTAGRAM_POST_URLS=https://www.instagram.com/p/CXabc123/,https://www.instagram.com/p/CYdef456/
```

Notes:
- The server endpoint `GET /api/social/instagram` will call the oEmbed endpoint for each URL and return the HTML embed snippet.
- If you prefer to request a single post from the client, call `/api/social/instagram?url=<POST_URL>`.
- If `INSTAGRAM_OEMBED_TOKEN` is not set, the feed will fall back to a profile link and placeholders.

### Seed test accounts (optional)

You can create a handful of test accounts (athletes, coaches, admin) using the Supabase Service Role Key. Set these env vars in `.env.local`:


```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

#### Generic seed script (products, courses, events, demo users)

To populate the database with demo products, courses, events, and users, run:

```bash
npx tsx scripts/seed_demo.ts
```

This will insert generic demo data for local/dev testing. Requires the Supabase Service Role Key.

#### Run API and dashboard tests

To run API and dashboard tests (Vitest):

```bash
npm run test
```

You can set `TEST_BASE_URL` (default: http://localhost:3000) and, for admin dashboard tests, `TEST_ADMIN_COOKIE` (a valid session cookie for an admin user).

### Optional dependencies

To enable Stripe and Sentry install the optional packages:

```bash
npm install stripe @sentry/nextjs
```

After installing Stripe the route `POST /api/stripe/checkout` will create real checkout sessions.

### Webhook Stripe

For receiving payment notifications (e.g. `checkout.session.completed`) configure `STRIPE_WEBHOOK_SECRET` and add an endpoint at (e.g.) `/api/stripe/webhook`. The route verifies the signature and processes the payment confirmation.

## API Endpoints (high level)

- `GET/POST/PUT/DELETE /api/bookings` — bookings management
- `GET/POST/PUT/DELETE /api/courses` — courses
- `GET/POST/PUT/DELETE /api/enrollments` — enrollments (course registrations)
- `GET/POST/PUT/DELETE /api/events` — events
- `GET/POST/PUT/DELETE /api/services` — services
- `GET /api/products` — product listing (server reads `products` table)
- `POST /api/stripe/checkout` — create Stripe checkout session (or mock session if `STRIPE_MOCK=1`)
- `POST /api/stripe/webhook` — stripe webhook receiver (verifies signature)
- `POST /api/stripe/simulate` — simulate Stripe webhook events locally (for testing)

## Formatting & Lint

Project includes basic `prettier` and `eslint` configs. Install dev tools locally and run `npm run lint`.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment & Setup

Copy `.env.example` to `.env.local` and fill the required values before running locally.

Required keys (minimum):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)

Optional keys (used for integrations):

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SENTRY_DSN`
- `INSTAGRAM_OEMBED_TOKEN` (see below)
- `INSTAGRAM_POST_URLS` (comma-separated list of Instagram post URLs)

Run the dev server:

```bash
npm install
npm run dev
```

For deployment, set the same env vars on your hosting provider (Vercel, etc.).

### Instagram oEmbed (optional)

This project can fetch Instagram post embeds server-side via the Facebook Graph API `instagram_oembed` endpoint. To enable:

1. Create a Facebook App at https://developers.facebook.com/apps and add the **Instagram oEmbed** product (or enable the appropriate API access).
2. Obtain an App Access Token by combining your `APP_ID` and `APP_SECRET` as `APP_ID|APP_SECRET` or using the Graph API Explorer to generate a token.
3. Set `INSTAGRAM_OEMBED_TOKEN` in your `.env.local` to the app access token.
4. Add the posts you want to display to `INSTAGRAM_POST_URLS`, example:

```env
INSTAGRAM_POST_URLS=https://www.instagram.com/p/CXabc123/,https://www.instagram.com/p/CYdef456/
```

Notes:
- The server endpoint `GET /api/social/instagram` will call the oEmbed endpoint for each URL and return the HTML embed snippet.
- If you prefer to request a single post from the client, call `/api/social/instagram?url=<POST_URL>`.
- If `INSTAGRAM_OEMBED_TOKEN` is not set, the feed will fall back to a profile link and placeholders.

### Seed test accounts (optional)

You can create a handful of test accounts (athletes, coaches, admin) using the Supabase Service Role Key. Set these env vars in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Then run:

```bash
npm run seed:test
```

This will create example accounts (emails like `athlete1@gst.example`) and corresponding rows in the `profiles` table. Use these only for local/dev testing.

### Dipendenze opzionali

Per attivare Stripe and Sentry installare le dipendenze opzionali:

```bash
npm install stripe @sentry/nextjs
```

Dopo l'installazione la route `POST /api/stripe/checkout` creerà sessioni reali di checkout.

### Webhook Stripe

Per ricevere notifiche di pagamento (es. `checkout.session.completed`) configurare `STRIPE_WEBHOOK_SECRET` e aggiungere un endpoint al provider (es. `/api/stripe/webhook`). La route verifica la firma e processa la conferma del pagamento.

Altri comandi utili:

```bash
npm run format
npm run test
```
- Authentication is implemented with Supabase. The client is in `src/lib/supabase/client.ts` and server client in `src/lib/supabase/serverClient.ts` (usa `SUPABASE_SERVICE_ROLE_KEY`).
- Registration and profile pages are in `src/app/register` and `src/app/profile` and use Supabase signup and `profiles` table.
- Protected dashboard pages are wrapped with a client `AuthGuard` component: `src/components/auth/AuthGuard.tsx`.

## API Endpoints

- `POST /api/bookings` — crea una prenotazione (usa `SUPABASE_SERVICE_ROLE_KEY`). Body JSON: `user_id, coach_id, starts_at, ends_at, note`.
- `POST /api/stripe/checkout` — stub per integrazione Stripe; implementare reale integrazione server-side quando si aggiunge la dipendenza `stripe`.

## Formatting & Lint

Project includes basic `prettier` and `eslint` configs. Install dev tools locally and run `npm run lint`.
