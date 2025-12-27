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
   - `supabase/schema.sql` (crea schema base con profili, prenotazioni, servizi, prodotti, corsi, eventi)
   - `supabase/FIX_COMPLETO_RLS.sql` (configura Row Level Security policies)
   - `supabase/migrations/complete_migration.sql` (aggiunge tabelle staff, hero_images, hero_content, subscriptions, programs, homepage_sections)

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
- `profiles`: Utenti con ruoli (atleta, maestro, gestore, admin)
- `bookings`: Prenotazioni campi e lezioni con sistema doppia conferma
- `subscription_credits`: Sistema crediti settimanali per abbonamenti
- `services`: Servizi offerti dall'accademia
- `products`: Catalogo prodotti shop
- `orders`: Ordini e-commerce
- `courses`: Corsi e sezioni homepage dinamiche
- `enrollments`: Iscrizioni ai corsi
- `events`: Eventi e tornei
- `event_registrations`: Iscrizioni agli eventi
- `news`: Sistema notizie e blog
- `staff`: Membri dello staff visualizzati in homepage
- `hero_images`: Carousel immagini sezione hero
- `hero_content`: Contenuti testuali sezione hero (titoli, statistiche, CTA)
- `subscriptions`: Piani abbonamento disponibili
- `programs`: Programmi di allenamento
- `homepage_sections`: Ordine e visibilità delle sezioni homepage
- `recruitment_applications`: Candidature lavoro
- `notifications`: Sistema notifiche utenti
- `messages`: Messaggistica interna
- `payments`: Storico pagamenti

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

## 💳 Modalità Mock Stripe

Quando `STRIPE_MOCK=1` l'endpoint `POST /api/stripe/checkout` restituirà un URL mock che punta a `/shop/success?session_id=MOCK_<timestamp>` per testare il flusso di checkout. Puoi simulare eventi webhook con una POST a `/api/stripe/simulate`:

```bash
curl -X POST http://localhost:3000/api/stripe/simulate \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","session":{"id":"MOCK_123","amount_total":9900,"currency":"eur","customer_details":{"email":"test@example.com"},"metadata":{}}}'
```

## 📱 Instagram oEmbed (opzionale)

Il progetto può recuperare embed di post Instagram lato server tramite l'endpoint `instagram_oembed` della Facebook Graph API. Per abilitarlo:

1. Crea una Facebook App su https://developers.facebook.com/apps e aggiungi il prodotto **Instagram oEmbed**
2. Ottieni un App Access Token combinando `APP_ID|APP_SECRET` o usando Graph API Explorer
3. Imposta `INSTAGRAM_OEMBED_TOKEN` nel tuo `.env.local`
4. Aggiungi i post che vuoi mostrare in `INSTAGRAM_POST_URLS`:

```env
INSTAGRAM_POST_URLS=https://www.instagram.com/p/CXabc123/,https://www.instagram.com/p/CYdef456/
```

**Note:**
- L'endpoint server `GET /api/social/instagram` chiamerà l'endpoint oEmbed per ogni URL e restituirà lo snippet HTML
- Per richiedere un singolo post dal client, chiama `/api/social/instagram?url=<POST_URL>`
- Se `INSTAGRAM_OEMBED_TOKEN` non è impostato, il feed mostrerà un link al profilo e placeholder

## 🧪 Test e Seed

### Seed account di test

Puoi creare account di test (atleti, maestri, admin) usando la Supabase Service Role Key. Imposta queste variabili in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Quindi esegui:

```bash
npm run seed:test
```

Verranno creati account di esempio (email come `athlete1@gst.example`) con righe corrispondenti nella tabella `profiles`. Usa solo per testing locale/dev.

### Script seed generico (prodotti, corsi, eventi, utenti demo)

Per popolare il database con dati demo:

```bash
npx tsx scripts/seed_demo.ts
```

Richiede la Supabase Service Role Key.

### Eseguire test API e dashboard

Per eseguire i test (Vitest):

```bash
npm run test
```

Puoi impostare `TEST_BASE_URL` (default: http://localhost:3000) e, per i test dashboard admin, `TEST_ADMIN_COOKIE` (cookie di sessione valido per un utente admin).

## 🔌 Dipendenze opzionali

Per abilitare Stripe e Sentry, installa i pacchetti opzionali:

```bash
npm install stripe @sentry/nextjs
```

Dopo l'installazione di Stripe, la route `POST /api/stripe/checkout` creerà sessioni di checkout reali.

### Webhook Stripe

Per ricevere notifiche di pagamento (es. `checkout.session.completed`) configura `STRIPE_WEBHOOK_SECRET` e aggiungi un endpoint (es. `/api/stripe/webhook`). La route verifica la firma e processa la conferma del pagamento.

## 🛠️ Comandi utili

```bash
npm run dev      # Avvia server di sviluppo
npm run build    # Build di produzione
npm run start    # Avvia build di produzione
npm run lint     # Esegui ESLint
npm run format   # Formatta codice con Prettier
npm run test     # Esegui test con Vitest
```

## 📚 API Endpoints (panoramica)

- `GET/POST/PUT/DELETE /api/bookings` — Gestione prenotazioni
- `GET/POST/PUT/DELETE /api/courses` — Gestione corsi
- `GET/POST/PUT/DELETE /api/enrollments` — Iscrizioni ai corsi
- `GET/POST/PUT/DELETE /api/events` — Eventi
- `GET/POST/PUT/DELETE /api/services` — Servizi
- `GET/POST/PUT/DELETE /api/programs` — Programmi
- `GET/POST/PUT/DELETE /api/subscriptions` — Abbonamenti
- `GET/POST/PUT/DELETE /api/staff` — Staff
- `GET/POST/PATCH /api/hero-content` — Contenuti sezione hero
- `GET/POST/PUT/DELETE /api/hero-images` — Immagini hero carousel
- `GET/POST/PUT/DELETE /api/homepage-sections` — Ordine sezioni homepage
- `GET/POST/PUT/DELETE /api/news` — News e blog
- `GET/POST /api/products` — Prodotti
- `POST /api/stripe/checkout` — Crea Stripe checkout session (o mock se `STRIPE_MOCK=1`)
- `POST /api/stripe/webhook` — Receiver webhook Stripe (verifica firma)
- `POST /api/stripe/simulate` — Simula eventi webhook Stripe (testing locale)
- `GET /api/social/instagram` — Recupera embed Instagram

## 🔐 Autenticazione

- L'autenticazione è implementata con Supabase Auth
- Client Supabase: `src/lib/supabase/client.ts`
- Server Client: `src/lib/supabase/serverClient.ts` (usa `SUPABASE_SERVICE_ROLE_KEY`)
- Le pagine di registrazione e profilo sono in `src/app/register` e `src/app/profile`
- Le pagine dashboard protette usano il componente `AuthGuard`: `src/components/auth/AuthGuard.tsx`

## 🎨 Formattazione & Lint

Il progetto include configurazioni base per `prettier` ed `eslint`. Esegui `npm run lint` per verificare il codice.

## 📖 Learn More

Questo è un progetto [Next.js](https://nextjs.org) creato con [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Per saperne di più su Next.js:

- [Next.js Documentation](https://nextjs.org/docs) - Caratteristiche e API di Next.js
- [Learn Next.js](https://nextjs.org/learn) - Tutorial interattivo Next.js

Dai un'occhiata al [repository GitHub di Next.js](https://github.com/vercel/next.js) - feedback e contributi sono benvenuti!

## 🚀 Deploy su Vercel

Il modo più semplice per fare il deploy della tua app Next.js è usare la [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) dai creatori di Next.js.

Consulta la [documentazione sul deployment di Next.js](https://nextjs.org/docs/app/building-your-application/deploying) per maggiori dettagli.

## ⚙️ Environment & Setup

Copia `.env.example` in `.env.local` e compila i valori richiesti prima di eseguire localmente.

**Chiavi richieste (minimo):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (es. `http://localhost:3000`)

**Chiavi opzionali (per integrazioni):**

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MOCK` (imposta a `1` per modalità mock)
- `NEXT_PUBLIC_SENTRY_DSN`
- `INSTAGRAM_OEMBED_TOKEN`
- `INSTAGRAM_POST_URLS` (lista separata da virgole di URL post Instagram)
