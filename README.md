# GST Tennis Academy

🎾 Piattaforma completa per la gestione di un'accademia di tennis con sistema di prenotazioni, tornei, corsi e comunicazione integrata.

## 📋 Indice

- [Caratteristiche](#caratteristiche)
- [Tecnologie](#tecnologie)
- [Prerequisiti](#prerequisiti)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [Utilizzo](#utilizzo)
- [Struttura del Progetto](#struttura-del-progetto)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contribuire](#contribuire)
- [Licenza](#licenza)

## ✨ Caratteristiche

### Sistema di Prenotazioni
- 📅 Calendario interattivo per prenotazione campi
- ⏰ Slot orari personalizzabili (08:00-22:00)
- 👥 Prenotazioni per lezioni singole o di gruppo
- ✅ Sistema di conferme a 3 livelli (utente, coach, gestore)
- 💳 Gestione pagamenti e storico prenotazioni

### Gestione Tornei
- 🏆 Tornei a gironi e a eliminazione diretta
- 📊 Punteggi tennis autentici (set, game, tie-break)
- 🥇 Classifiche e statistiche dettagliate
- 📱 Iscrizioni online con conferma automatica
- 📧 Notifiche email per match e risultati

### Profili Atleti Avanzati
- 📈 Statistiche tennis complete (aces, doppi falli, break point)
- 🎯 Tracking progressi con grafici
- 💯 Percentuale completamento profilo
- 🏅 Livelli skill (principiante → professionista)
- 📱 Informazioni emergenza e preferenze orarie

### Sistema Email Integrato
- 📨 11 template email HTML con branding GST
- 🔄 Automazione trigger per eventi (prenotazioni, tornei, lezioni)
- 📊 Dashboard analytics con metriche delivery/open/click
- ⏱️ Scheduler cron per reminder automatici
- 🚫 Gestione unsubscribe e preferenze utente

### Chat e Comunicazione
- 💬 Chat real-time con Supabase Realtime
- 🔔 Notifiche messaggi non letti
- 👥 Conversazioni tra utenti e staff
- 📎 Supporto allegati e emoji

### Bacheca Annunci
- 📢 Annunci prioritari per amministrazione
- 🤝 Bacheca partner per sponsor e collaborazioni
- 🔒 Visibilità controllata per ruolo utente
- 📅 Scadenza automatica annunci

### Sistema di Ruoli
- 👨‍💼 **Admin**: Controllo completo sistema
- 🏢 **Gestore**: Gestione operativa e prenotazioni
- 🎓 **Maestro**: Gestione corsi e lezioni
- 🎾 **Coach**: Conferma lezioni e disponibilità
- 👤 **Atleta**: Prenotazioni e partecipazione tornei

## 🛠 Tecnologie

### Frontend
- **Next.js 16.1.1** - React framework con App Router
- **React 19.2.3** - UI library
- **TypeScript 5.9.3** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Supabase** - PostgreSQL database con RLS
- **Supabase Realtime** - WebSocket per chat
- **Resend 6.6.0** - Email service provider

### Testing
- **Jest 30.2.0** - Testing framework
- **React Testing Library 15.0.7** - Component testing
- **@testing-library/jest-dom** - DOM matchers

### DevOps
- **Vercel** - Hosting e deployment
- **Vercel Cron** - Scheduled jobs
- **GitHub Actions** - CI/CD (optional)
- **ESLint + Prettier** - Code quality

## 📦 Prerequisiti

- **Node.js** 20.x o superiore
- **npm** 10.x o superiore
- **Account Supabase** (free tier disponibile)
- **Account Resend** per email (free tier: 100 email/giorno)
- **Git** per version control

## 🚀 Installazione

### 1. Clona il repository

```bash
git clone https://github.com/your-username/gst-tennis-academy.git
cd gst-tennis-academy
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura Supabase

1. Crea un nuovo progetto su [supabase.com](https://supabase.com)
2. Vai su SQL Editor e esegui i migration files in ordine:

```bash
supabase/migrations/001_create_tournaments_and_participants.sql
supabase/migrations/002_rls_policies_tournaments.sql
supabase/migrations/003_add_competition_types.sql
supabase/migrations/004_add_tennis_scoring.sql
supabase/migrations/005_add_chat_system.sql
supabase/migrations/006_add_announcements.sql
supabase/migrations/007_email_system.sql
supabase/migrations/008_profile_enhancements.sql
```

3. Copia le chiavi API da Settings > API

### 4. Configura variabili ambiente

Crea file `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com
EMAIL_REPLY_TO=info@your-domain.com
RESEND_WEBHOOK_SECRET=your-webhook-secret

# Vercel Cron
CRON_SECRET=your-random-secret-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## ⚙️ Configurazione

### Email Templates

I template email sono in `src/lib/email/templates/`. Personalizza:
- Colori branding (blu GST: #2f7de1)
- Logo e immagini
- Testi e messaggi

### Vercel Cron Jobs

Il file `vercel.json` configura i job schedulati:

```json
{
  "crons": [
    {
      "path": "/api/email/scheduler",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Schedule: Giornaliero alle 9:00 UTC (10:00 ora italiana).

### Webhook Resend

Configura webhook su Resend Dashboard:
- URL: `https://your-domain.com/api/webhooks/email`
- Eventi: email.sent, email.delivered, email.opened, email.clicked, email.bounced

## 📖 Utilizzo

### Creazione Primo Admin

```bash
npm run seed:test
```

Crea utenti test:
- admin@test.com (Admin)
- gestore@test.com (Gestore)
- maestro@test.com (Maestro)
- coach@test.com (Coach)
- atleta@test.com (Atleta)

Password: `password123`

### Dashboard Amministrazione

Accedi come admin e vai su `/dashboard/admin` per:
- Gestire utenti e ruoli
- Creare tornei e corsi
- Visualizzare statistiche prenotazioni
- Configurare hero content e sezioni homepage
- Monitorare email dashboard

### Gestione Tornei

1. Admin crea torneo (`/dashboard/admin/tornei`)
2. Atleti si iscrivono dalla pagina pubblica (`/tornei`)
3. Gestore conferma iscrizioni
4. Sistema genera gironi automaticamente
5. Coach/Admin inseriscono risultati match
6. Sistema calcola classifiche e avanza fasi

### Prenotazione Campi

1. Atleta va su `/bookings`
2. Seleziona data, campo e orario
3. Sceglie tipo: campo libero, lezione singola o gruppo
4. Sistema invia richiesta a coach (se lezione)
5. Coach conferma disponibilità
6. Gestore approva definitivamente
7. Email di conferma automatica

## 📁 Struttura del Progetto

```
gst-tennis-academy/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── bookings/      # Prenotazioni endpoints
│   │   │   ├── tournaments/   # Tornei + matches
│   │   │   ├── email/         # Email scheduler
│   │   │   └── webhooks/      # Resend webhooks
│   │   ├── dashboard/         # Dashboard per ruolo
│   │   │   ├── admin/        # Admin pages
│   │   │   ├── atleta/       # Athlete pages
│   │   │   ├── coach/        # Coach pages
│   │   │   ├── gestore/      # Manager pages
│   │   │   └── maestro/      # Teacher pages
│   │   ├── bookings/         # Prenotazioni page
│   │   ├── tornei/           # Tornei pubblici
│   │   └── profile/          # Profilo utente
│   ├── components/            # React components
│   │   ├── bookings/         # Booking calendar
│   │   ├── tournaments/      # Bracket, standings
│   │   ├── profile/          # ProfileEditor, AthleteStatsView
│   │   ├── email/            # EmailDashboard
│   │   ├── chat/             # ChatPanel, notifications
│   │   ├── announcements/    # Announcement boards
│   │   ├── layout/           # Navbar, Footer
│   │   └── landing/          # Homepage sections
│   └── lib/
│       ├── email/            # Email service + templates
│       ├── seo/              # Metadata + JSON-LD
│       ├── supabase/         # Supabase clients
│       └── roles.ts          # Role checking utils
├── supabase/
│   └── migrations/           # SQL migrations (8 files)
├── public/
│   ├── images/              # Logo, OG images
│   ├── robots.txt           # SEO robots
│   └── sitemap.xml          # SEO sitemap
├── jest.config.js           # Jest configuration
├── jest.setup.js            # Test globals + mocks
├── tailwind.config.ts       # Tailwind theming
├── tsconfig.json            # TypeScript config
├── vercel.json              # Vercel cron config
└── package.json             # Dependencies + scripts
```

## 🧪 Testing

### Esegui tutti i test

```bash
npm test
```

### Watch mode (sviluppo)

```bash
npm run test:watch
```

### Coverage report

```bash
npm run test:coverage
```

### Test Coverage (Baseline)
- **Branches**: 10%
- **Functions**: 10%
- **Lines**: 10%
- **Statements**: 10%

Test suite:
- 19 test passanti
- 4 component test files
- Mock completi per Supabase e Next.js

## 🚀 Deployment

### Vercel (Raccomandato)

1. **Push su GitHub**
   ```bash
   git add .
   git commit -m "feat: ready for deployment"
   git push origin main
   ```

2. **Connetti Vercel**
   - Vai su [vercel.com](https://vercel.com)
   - Importa progetto da GitHub
   - Configura variabili ambiente (copia da `.env.local`)

3. **Configura Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   RESEND_API_KEY
   EMAIL_FROM
   EMAIL_REPLY_TO
   RESEND_WEBHOOK_SECRET
   CRON_SECRET
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```

4. **Deploy**
   - Vercel auto-deploya su ogni push
   - Cron jobs attivi automaticamente
   - SSL certificate generato

### Build Locale

```bash
npm run build
npm start
```

Build output: `.next/`

## 🔒 Sicurezza

### Row Level Security (RLS)
Tutte le tabelle Supabase hanno policy RLS attive:
- Gli utenti vedono solo i propri dati
- Admin/gestore hanno accesso esteso
- Policy verificano `auth.uid()` e `role` da profiles

### API Routes
- Validazione input con Zod (da implementare)
- Rate limiting su endpoints sensibili
- CRON_SECRET per proteggere scheduler

### Autenticazione
- Supabase Auth con JWT
- Password hashing bcrypt
- Email verification (opzionale)

## 📊 Metriche Sistema

### Database
- 8 migration SQL
- 15+ tabelle con RLS
- 3 stored functions per calcoli
- 5+ trigger per auto-sync

### Email System
- 11 template HTML
- 4 categorie email (transactional, notifications, marketing, system)
- Tracking aperture/click
- Retry automatico (max 3 tentativi)

### Statistiche Tennis
- 30+ metriche per atleta
- Auto-sync da risultati tornei
- Calcoli automatici (win rate, differenziali)
- Storico completo partite

## 🤝 Contribuire

1. Fork il progetto
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit modifiche (`git commit -m 'feat: add amazing feature'`)
4. Push su branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

### Commit Convention
Usa [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nuove funzionalità
- `fix:` Bug fix
- `docs:` Documentazione
- `style:` Formattazione
- `refactor:` Refactoring codice
- `test:` Test
- `chore:` Manutenzione

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi file `LICENSE` per dettagli.

## 🙏 Ringraziamenti

- [Next.js](https://nextjs.org/) - Framework React
- [Supabase](https://supabase.com/) - Backend as a Service
- [Resend](https://resend.com/) - Email infrastructure
- [Vercel](https://vercel.com/) - Hosting e deployment
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Lucide](https://lucide.dev/) - Icon library

## 📞 Supporto

Per domande o supporto:
- 📧 Email: info@gst-tennis-academy.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/gst-tennis-academy/issues)
- 📖 Docs: [Wiki](https://github.com/your-username/gst-tennis-academy/wiki)

---

**Made with ❤️ and 🎾 by GST Tennis Academy**

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
