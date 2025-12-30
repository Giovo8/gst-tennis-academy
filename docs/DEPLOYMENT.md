# Deployment Guide - GST Tennis Academy

**Ultima revisione**: 30 Dicembre 2025  
**Stack**: Next.js 14, Supabase, Vercel

## Requisiti

### Software

- **Node.js**: >= 18.17.0
- **npm**: >= 9.0.0
- **Git**: Per deploy automatico

### Servizi Esterni

- **Supabase**: Database PostgreSQL + Auth + Storage
- **Resend**: Email transazionali
- **Vercel** (consigliato): Hosting e deploy
- **Stripe** (opzionale): Pagamenti

---

## Setup Locale

### 1. Clone Repository

```bash
git clone https://github.com/your-org/gst-tennis-academy.git
cd gst-tennis-academy
```

### 2. Installa Dipendenze

```bash
npm install
```

### 3. Configura Variabili Ambiente

Crea file `.env.local` nella root del progetto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email
RESEND_API_KEY=re_your_api_key

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe (opzionale)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

### 4. Setup Database Supabase

#### 4.1 Crea Progetto Supabase

1. Vai su [supabase.com](https://supabase.com)
2. Crea nuovo progetto
3. Annota:
   - Project URL
   - Anon key
   - Service role key (Settings > API)

#### 4.2 Applica Schema Database

Vai in **SQL Editor** e esegui in ordine:

```bash
# 1. Schema base
supabase/schema.sql

# 2. Migrazioni in ordine
supabase/migrations/001_create_tournaments_and_participants.sql
supabase/migrations/002_rls_policies_tournaments.sql
supabase/migrations/003_add_competition_types.sql
supabase/migrations/004_tennis_tournament_system.sql
supabase/migrations/005_chat_messaging_system.sql
supabase/migrations/006_announcements_system.sql
supabase/migrations/007_email_system.sql
supabase/migrations/008_profile_enhancements.sql
supabase/migrations/010_simplified_tournament_system.sql
supabase/migrations/011_make_dates_optional.sql
supabase/migrations/012_tournament_matches_bracket_columns.sql
supabase/migrations/013_tennis_scoring_system.sql

# 3. Migrazioni aggiuntive
supabase/migrations/improve_roles_system.sql
supabase/migrations/create_courses_table.sql
supabase/migrations/add_news_table.sql
supabase/migrations/complete_migration.sql
```

**Nota**: Se ci sono errori di tabelle/colonne già esistenti, è normale. Le migrazioni sono idempotent.

#### 4.3 Verifica Setup

Controlla che tutte le tabelle siano create:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Dovresti vedere:
- profiles
- bookings
- tournaments
- tournament_participants
- tournament_groups
- tournament_matches
- conversations
- conversation_participants
- messages
- email_logs
- email_templates
- courses
- enrollments
- news
- payments
- (e altre...)

### 5. Setup Email Resend

1. Vai su [resend.com](https://resend.com)
2. Crea account
3. Verifica dominio (o usa sandbox per test)
4. Crea API Key
5. Aggiungi a `.env.local`

#### 5.1 Configura Webhook Email (Opzionale)

Per tracking email (opened, clicked, etc):

1. In Resend Dashboard > Webhooks
2. Crea nuovo webhook:
   - URL: `https://your-domain.com/api/webhooks/email`
   - Eventi: tutti (email.sent, email.delivered, etc.)
3. Annota signing secret

### 6. Crea Primo Admin

Dopo aver avviato l'app, registra un utente e poi promuovilo ad admin da SQL Editor:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

### 7. Avvia Development Server

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## Deploy su Vercel

### 1. Connetti Repository

1. Vai su [vercel.com](https://vercel.com)
2. Import Git Repository
3. Seleziona il repository GitHub

### 2. Configura Progetto

**Framework Preset**: Next.js

**Build Command**: 
```bash
npm run build
```

**Output Directory**: 
```
.next
```

**Install Command**:
```bash
npm install
```

### 3. Variabili Ambiente

Aggiungi tutte le variabili ambiente in **Settings > Environment Variables**:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=re_your_api_key

# Site URL (usa dominio Vercel)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Stripe (opzionale)
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

**Importante**: 
- Usa chiavi **production** per Stripe
- Usa dominio Supabase production
- Imposta `NEXT_PUBLIC_SITE_URL` con dominio corretto

### 4. Deploy

Clicca **Deploy**. Vercel:
- Installa dipendenze
- Builda progetto
- Deploya su CDN globale

### 5. Configura Dominio Custom (Opzionale)

1. Settings > Domains
2. Aggiungi dominio
3. Configura DNS:

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 6. Verifica Deploy

Testa:
- Homepage carica
- Login funziona
- Database connesso
- Email inviate (controlla spam)

---

## Configurazione Produzione

### Supabase Production Settings

#### 1. Database

**Connection Pooling**:
- Settings > Database > Connection Pooling
- Mode: Transaction
- Pool Size: 15-20

**Backup Automatici**:
- Già attivi di default
- Point-in-time recovery disponibile

#### 2. Auth

**Settings > Authentication**:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: 
  ```
  https://your-domain.com/**
  ```
- **Email Templates**: Personalizza template
- **Rate Limiting**: Abilita per sicurezza

**Providers**:
- Email/Password: Abilitato
- Email Confirmation: Consigliato per produzione

#### 3. Storage

**Bucket per Upload**:

```sql
-- Crea bucket per immagini
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Policy upload per utenti autenticati
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- Policy lettura pubblica
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');
```

### Sicurezza

#### 1. RLS Policies

Verifica che RLS sia abilitato su TUTTE le tabelle:

```sql
-- Controlla tabelle senza RLS
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND rowsecurity = true
);
```

#### 2. Service Role Key

**IMPORTANTE**: 
- Mai esporre in frontend
- Usa solo in API routes server-side
- Rotazione periodica consigliata

#### 3. Rate Limiting

Implementa rate limiting per API:

```typescript
// middleware.ts (esempio)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Implementa rate limiting logic
}
```

#### 4. CORS

Già configurato per Next.js API routes. Per modifiche:

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
        ],
      },
    ]
  },
}
```

### Performance

#### 1. Caching

**Supabase Edge Caching**:
```typescript
const { data } = await supabase
  .from('tournaments')
  .select('*')
  .eq('status', 'Aperto')
  
// Cache header (solo per dati pubblici)
headers: { 'Cache-Control': 'public, max-age=60' }
```

#### 2. Database Indexes

Verifica che tutti gli indici siano creati (già nello schema):

```sql
-- Lista tutti gli indici
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

#### 3. Next.js Optimizations

```typescript
// next.config.ts
export default {
  images: {
    domains: ['your-project.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  swcMinify: true,
  compress: true,
}
```

---

## Monitoring e Logs

### Vercel

**Analytics**:
- Vercel Analytics (integrato)
- Web Vitals
- Traffic analytics

**Logs**:
- Runtime Logs: Vercel Dashboard > Deployments > Logs
- Function Logs: Per ogni API route

### Supabase

**Dashboard > Logs**:
- Postgres Logs
- API Logs
- Auth Logs

**Metrics**:
- Database size
- API requests
- Active connections

### Email Resend

**Dashboard**:
- Email sent/delivered/opened
- Bounce rate
- Webhook events

---

## Backup e Disaster Recovery

### Database Backup

#### Automatico (Supabase)
- Daily backups automatici
- 7 giorni retention (Pro plan)
- Point-in-time recovery

#### Manuale

```bash
# Usando supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Restore
supabase db reset
psql -h db.your-project.supabase.co -U postgres -d postgres -f backup.sql
```

### Codice

- Git repository (GitHub)
- Vercel automaticamente mantiene deploy history

### File/Immagini

- Supabase Storage ha backup automatici
- Download manuale se necessario

---

## Manutenzione

### Database Cleanup

```sql
-- Elimina prenotazioni vecchie (oltre 6 mesi)
DELETE FROM bookings 
WHERE end_time < NOW() - INTERVAL '6 months';

-- Elimina email logs vecchi (oltre 3 mesi)
DELETE FROM email_logs 
WHERE created_at < NOW() - INTERVAL '3 months';

-- Archivia tornei conclusi vecchi
UPDATE tournaments 
SET status = 'Annullato' 
WHERE status = 'Concluso' 
AND end_date < NOW() - INTERVAL '1 year';
```

### Reset Crediti Settimanali

**Cron Job** (da configurare in Supabase o Vercel Cron):

```sql
-- Ogni Lunedì alle 00:00
SELECT reset_weekly_credits();
```

**Vercel Cron**:

```typescript
// app/api/cron/reset-credits/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Reset crediti
  const { error } = await supabaseAdmin.rpc('reset_weekly_credits')
  
  if (error) {
    return Response.json({ error }, { status: 500 })
  }

  return Response.json({ success: true })
}
```

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/reset-credits",
      "schedule": "0 0 * * 1"
    }
  ]
}
```

---

## Troubleshooting

### Problemi Comuni

#### 1. Errore "Invalid JWT"

**Causa**: Token scaduto o non valido

**Soluzione**:
```typescript
// Refresh session
const { data: { session } } = await supabase.auth.refreshSession()
```

#### 2. RLS Policy Error

**Causa**: Policy RLS blocca operazione

**Soluzione**:
- Usa Service Role per operazioni admin
- Verifica policy con SQL query
- Check ruolo utente

#### 3. Email non inviate

**Causa**: 
- API key non valida
- Dominio non verificato (Resend)
- Rate limit superato

**Soluzione**:
- Controlla Resend dashboard
- Verifica variabili ambiente
- Check email logs in database

#### 4. Deploy Failed

**Causa**: Build error

**Soluzione**:
- Check logs Vercel
- Verifica dipendenze
- Test build locale: `npm run build`

#### 5. Database Connection Error

**Causa**: Connection pooling esaurito

**Soluzione**:
- Aumenta pool size in Supabase
- Ottimizza query
- Chiudi connessioni non usate

---

## Scaling

### Database

**Supabase Pro** (consigliato per produzione):
- Database dedicato
- 8GB RAM
- 100GB storage
- Connection pooling avanzato
- Daily backups con 30 giorni retention

**Ottimizzazioni**:
- Indici ottimizzati (già presenti)
- Query optimization
- Partitioning tabelle grandi (se necessario)

### API

**Vercel**:
- Scale automatico
- Edge Functions per bassa latenza
- Rate limiting per protezione

### Storage

**Supabase Storage**:
- CDN globale incluso
- Resize immagini on-the-fly
- 100GB inclusi (Pro plan)

---

## Checklist Pre-Launch

### Sicurezza
- [ ] RLS abilitato su tutte le tabelle
- [ ] Service role key configurata e sicura
- [ ] Auth email verification abilitata
- [ ] Rate limiting implementato
- [ ] HTTPS forzato

### Performance
- [ ] Tutti gli indici database creati
- [ ] Caching configurato
- [ ] Immagini ottimizzate
- [ ] Build production testato

### Funzionalità
- [ ] Login/registrazione funzionante
- [ ] Prenotazioni testate
- [ ] Tornei creazione/gestione testati
- [ ] Email inviate correttamente
- [ ] Pagamenti (se implementati) testati

### Monitoring
- [ ] Vercel Analytics abilitato
- [ ] Supabase logs configurati
- [ ] Error tracking (Sentry opzionale)
- [ ] Backup automatici verificati

### Contenuto
- [ ] Primo admin creato
- [ ] Campi/servizi configurati
- [ ] Email templates personalizzati
- [ ] Homepage sections configurate
- [ ] Privacy policy e termini servizio

---

## Contatti e Supporto

- **Supabase Support**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Resend Support**: [resend.com/docs](https://resend.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

**Fine Guida Deployment**
