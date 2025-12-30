# GST Tennis Academy

🎾 **Piattaforma completa per la gestione di un'accademia di tennis** con sistema di prenotazioni, tornei professionali, corsi, messaggistica e molto altro.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)](https://tailwindcss.com/)

---

## 📋 Indice

- [Caratteristiche Principali](#-caratteristiche-principali)
- [Documentazione](#-documentazione)
- [Quick Start](#-quick-start)
- [Tecnologie](#-tecnologie)
- [Struttura Progetto](#-struttura-progetto)
- [Testing](#-testing)
- [Deploy](#-deploy)
- [Contribuire](#-contribuire)
- [Licenza](#-licenza)

---

## ✨ Caratteristiche Principali

### 🎾 Sistema Tornei Professionale (v2.0)

**3 Tipi di Torneo**:
- **Eliminazione Diretta**: Bracket classico ad eliminazione
- **Girone + Eliminazione**: Fase a gironi seguita da knockout
- **Campionato**: Round-robin (tutti contro tutti)

**Features**:
- Wizard creazione intuitivo in 3 step
- Gestione partite con punteggi tennis autentici (set, game, tie-break)
- Classifiche e statistiche avanzate
- Dashboard specifiche per ogni ruolo
- Pagina classifiche pubblica con podio

### 📅 Sistema Prenotazioni

- Calendario interattivo per prenotazione campi
- Lezioni private e di gruppo
- Sistema conferme multi-livello
- Gestione crediti settimanali per abbonamenti
- Storico prenotazioni e statistiche

### 👥 Sistema Multi-Ruolo

- **Admin**: Controllo completo sistema
- **Gestore**: Gestione operativa
- **Maestro**: Gestione corsi e lezioni
- **Atleta**: Prenotazioni e iscrizione tornei

### 💬 Chat e Comunicazione

- Messaggistica in tempo reale
- Conversazioni 1-to-1 e di gruppo
- Notifiche messaggi non letti
- Supporto allegati

### 📧 Sistema Email

- 11 template email HTML con branding
- Automazione trigger per eventi
- Dashboard analytics con metriche
- Webhook tracking (aperture, click, bounce)

### 📚 Gestione Corsi

- Creazione e gestione corsi
- Sistema iscrizioni online
- Gestione capienza e liste d'attesa
- Conferme email automatiche

### 📰 News e Annunci

- Sistema news con categorie
- Annunci homepage
- Editor rich text
- Gestione pubblicazione/bozze

---

## 📖 Documentazione

La documentazione completa è disponibile nella cartella `docs/`:

| Documento | Descrizione |
|-----------|-------------|
| **[DATABASE.md](docs/DATABASE.md)** | Schema completo database, tabelle, RLS policies, migrazioni, funzioni helper |
| **[API.md](docs/API.md)** | Documentazione completa API endpoints con esempi |
| **[FEATURES.md](docs/FEATURES.md)** | Guida completa a tutte le funzionalità del sistema |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Guida setup, deployment, variabili ambiente, configurazione |

---

## 🚀 Quick Start

### 1. Clona Repository

```bash
git clone https://github.com/your-org/gst-tennis-academy.git
cd gst-tennis-academy
```

### 2. Installa Dipendenze

```bash
npm install
```

### 3. Configura Environment

Crea `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email
RESEND_API_KEY=re_your_api_key

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Setup Database

1. Vai su [Supabase Dashboard](https://app.supabase.com)
2. Crea nuovo progetto
3. Esegui migrazioni in **SQL Editor** (vedi [DATABASE.md](docs/DATABASE.md))

### 5. Avvia Development Server

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### 6. Crea Primo Admin

```sql
-- In Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

---

## 🛠 Tecnologie

### Frontend
- **Next.js 14** - React framework con App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Supabase** - PostgreSQL database + Auth + Storage
- **PostgreSQL 14+** - Database relazionale
- **Row Level Security** - Sicurezza a livello database

### Integrations
- **Resend** - Email transazionali
- **Vercel** - Hosting e deployment
- **Vercel Cron** - Scheduled jobs
- **Stripe** - Pagamenti (opzionale)

### Dev Tools
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality
- **TypeScript** - Type checking

---

## 📁 Struttura Progetto

```
gst-tennis-academy/
├── docs/                           # 📖 Documentazione
│   ├── DATABASE.md                # Schema database completo
│   ├── API.md                     # API endpoints
│   ├── FEATURES.md                # Guida funzionalità
│   └── DEPLOYMENT.md              # Guida deploy
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── admin/           # Admin endpoints
│   │   │   ├── tournaments/     # Tornei endpoints
│   │   │   ├── bookings/        # Prenotazioni
│   │   │   ├── courses/         # Corsi
│   │   │   ├── email/           # Email system
│   │   │   └── webhooks/        # Webhooks esterni
│   │   ├── dashboard/           # Dashboard per ruolo
│   │   │   ├── admin/
│   │   │   ├── gestore/
│   │   │   ├── maestro/
│   │   │   └── atleta/
│   │   ├── tornei/              # Tornei pubblici
│   │   ├── classifiche/         # Classifiche pubbliche
│   │   ├── bookings/            # Prenotazioni
│   │   ├── courses/             # Corsi
│   │   ├── news/                # News
│   │   └── profile/             # Profilo utente
│   ├── components/              # React components
│   │   ├── tournaments/         # Sistema tornei
│   │   ├── bookings/            # Sistema prenotazioni
│   │   ├── chat/                # Sistema chat
│   │   ├── email/               # Email dashboard
│   │   ├── profile/             # Profilo e stats
│   │   ├── auth/                # Autenticazione
│   │   └── layout/              # Layout components
│   ├── lib/                     # Utilities
│   │   ├── supabase/           # Supabase clients
│   │   ├── email/              # Email service
│   │   ├── seo/                # SEO utils
│   │   └── roles.ts            # Role checking
│   └── __tests__/              # Test files
├── supabase/                    # Database
│   ├── schema.sql              # Schema base
│   └── migrations/             # Migrazioni SQL
├── scripts/                     # Utility scripts
├── public/                      # Assets statici
└── vercel.json                 # Vercel config
```

---

## 🧪 Testing

### Test Automatici

```bash
# Esegui tutti i test
npm test

# Watch mode
npm run test:watch

# Con coverage
npm run test:coverage
```

**Test Coverage**:
- ✅ Flussi completi tornei (3 tipi)
- ✅ API endpoints
- ✅ Sistema scoring tennis
- ✅ Statistiche e report
- ✅ Controllo accessi ruoli

### Test Manuali

Consulta [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) per scenari di test dettagliati.

---

## 🚀 Deploy

### Vercel (Raccomandato)

1. **Push su GitHub**
   ```bash
   git push origin main
   ```

2. **Connetti Vercel**
   - Vai su [vercel.com](https://vercel.com)
   - Importa repository
   - Configura variabili ambiente

3. **Deploy Automatico**
   - Deploy automatico su ogni push
   - Preview deployments per PR
   - SSL automatico

Guida completa: [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🤝 Contribuire

Contributi benvenuti! Per iniziare:

1. Fork il progetto
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit modifiche (`git commit -m 'feat: add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

### Commit Convention

Usa [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nuove funzionalità
- `fix:` Bug fix
- `docs:` Documentazione
- `style:` Formattazione
- `refactor:` Refactoring
- `test:` Test
- `chore:` Manutenzione

---

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi file [LICENSE](LICENSE) per dettagli.

---

## 🙏 Ringraziamenti

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Resend](https://resend.com/) - Email infrastructure
- [Vercel](https://vercel.com/) - Hosting platform
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide](https://lucide.dev/) - Icon library

---

## 📞 Supporto

Per domande o supporto:

- 📧 Email: info@gst-tennis-academy.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/gst-tennis-academy/issues)
- 📖 Docs: [docs/](docs/)

---

**Made with ❤️ and 🎾 by GST Tennis Academy Team**

