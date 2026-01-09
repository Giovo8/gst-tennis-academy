# GST Tennis Academy - Documentazione

Documentazione tecnica e guide per il progetto GST Tennis Academy.

## 📚 Indice Documentazione

### 🎯 Guide Principali

#### Setup & Deployment
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Guida al deployment in produzione
- [**EMAIL_SETUP.md**](./EMAIL_SETUP.md) - Configurazione email con Resend
- [**RESEND_SETUP.md**](./RESEND_SETUP.md) - Setup dettagliato Resend API
- [**DATABASE.md**](./DATABASE.md) - Schema database e struttura

#### Features & Funzionalità
- [**FEATURES.md**](./FEATURES.md) - Lista completa features implementate
- [**ARENA.md**](./ARENA.md) - Sistema Arena Challenge
- [**ARENA_MAESTRO.md**](./ARENA_MAESTRO.md) - Arena per maestri
- [**ARENA_TENNIS_RULES.md**](./ARENA_TENNIS_RULES.md) - Regole tennis arena
- [**API.md**](./API.md) - Documentazione API endpoints

#### Design & Frontend
- [**DESIGN_SYSTEM.md**](./DESIGN_SYSTEM.md) - Design system e componenti UI
- [**FRONTEND_BEST_PRACTICES.md**](./FRONTEND_BEST_PRACTICES.md) - Best practices frontend
- [**MOBILE_OPTIMIZATION_SUMMARY.md**](./MOBILE_OPTIMIZATION_SUMMARY.md) - Ottimizzazioni mobile
- [**HOMEPAGE.md**](./HOMEPAGE.md) - Struttura homepage

#### Email & Marketing
- [**EMAIL_TEMPLATES_BEST_PRACTICES.md**](./EMAIL_TEMPLATES_BEST_PRACTICES.md) - Best practices template email

### 📁 Struttura Progetto

```
docs/
├── README.md                              # Questo file
├── archive/                              # Documentazione storica
│   ├── ARENA_COUNTER_PROPOSAL.md
│   ├── PROMO_BANNER_ADMIN.md
│   ├── TORNEI_CLICCABILI.md
│   ├── PRENOTAZIONI_MULTIPLE.md
│   └── BLOCCO_CAMPI_REAL_TIME.md
└── [guide principali]                    # Vedi sopra
```

## 🚀 Quick Start

### Per sviluppatori nuovi al progetto
1. Leggi [FEATURES.md](./FEATURES.md) per panoramica generale
2. Consulta [DATABASE.md](./DATABASE.md) per schema dati
3. Segui [DEPLOYMENT.md](./DEPLOYMENT.md) per setup ambiente
4. Vedi [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) per componenti UI

### Per deployment
1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Setup ambiente produzione
2. [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Configurazione email
3. [DATABASE.md](./DATABASE.md) - Setup database Supabase

### Per sviluppo frontend
1. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Componenti e stili
2. [FRONTEND_BEST_PRACTICES.md](./FRONTEND_BEST_PRACTICES.md) - Convenzioni codice
3. [MOBILE_OPTIMIZATION_SUMMARY.md](./MOBILE_OPTIMIZATION_SUMMARY.md) - Mobile responsive

### Per API & Backend
1. [API.md](./API.md) - Endpoints disponibili
2. [DATABASE.md](./DATABASE.md) - Schema e relazioni
3. [../supabase/README.md](../supabase/README.md) - Scripts SQL

## 🎮 Features Principali

### Sistema Arena
Sistema di sfide tra giocatori con ranking ELO:
- [ARENA.md](./ARENA.md) - Panoramica generale
- [ARENA_MAESTRO.md](./ARENA_MAESTRO.md) - Versione per maestri
- [ARENA_TENNIS_RULES.md](./ARENA_TENNIS_RULES.md) - Regole complete

### Tornei
Sistema gestione tornei multi-formato:
- Eliminazione diretta
- Girone + Eliminazione
- Campionato
- Vedi [FEATURES.md](./FEATURES.md) sezione Tornei

### Prenotazioni
Sistema prenotazione campi con:
- Conferma manager
- Blocco campi
- Calendario real-time
- Vedi [FEATURES.md](./FEATURES.md) sezione Prenotazioni

### Email & Notifiche
Sistema email transazionali:
- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Setup
- [EMAIL_TEMPLATES_BEST_PRACTICES.md](./EMAIL_TEMPLATES_BEST_PRACTICES.md) - Template

## 📖 Convenzioni

### Documentazione
- File in **UPPERCASE** per guide principali
- File in **lowercase** per documentazione secondaria
- Formato Markdown con intestazioni H1-H6
- Includere sempre indice per documenti >100 righe

### Codice
- Vedere [FRONTEND_BEST_PRACTICES.md](./FRONTEND_BEST_PRACTICES.md)
- TypeScript strict mode
- Componenti funzionali React
- Tailwind CSS per styling

### Database
- Vedere [DATABASE.md](./DATABASE.md)
- Migrations sequenziali numeriche
- RLS policies per security
- Vedere [../supabase/README.md](../supabase/README.md)

## 🔄 Aggiornamenti

### Quando aggiungere nuova documentazione
1. Nuova feature → Creare o aggiornare file in `docs/`
2. API changes → Aggiornare `API.md`
3. Schema changes → Aggiornare `DATABASE.md`
4. UI changes → Aggiornare `DESIGN_SYSTEM.md`

### Workflow
1. Creare/aggiornare file doc
2. Aggiungere link in questo README
3. Update `FEATURES.md` se nuova feature
4. Commit con messaggio descrittivo

## 📞 Supporto

Per domande o problemi:
1. Consultare documentazione pertinente
2. Verificare `FEATURES.md` per funzionalità esistenti
3. Controllare `../supabase/README.md` per script database

## 🗂️ Archivio

Documentazione storica o obsoleta in `archive/`:
- Feature deprecate
- Proposte non implementate
- Vecchie versioni sostituire

Non eliminare archivio - utile per riferimento storico.
