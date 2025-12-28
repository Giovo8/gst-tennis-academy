# Production Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Variables ✓
Verifica che tutte le variabili siano configurate su Vercel/hosting:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Resend
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@your-domain.com
EMAIL_REPLY_TO=info@your-domain.com
RESEND_WEBHOOK_SECRET=whsec_xxxxx

# Cron
CRON_SECRET=your-secure-random-string

# App
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

**Test**: Verifica che ogni variabile sia presente senza typo.

### 2. Database Migrations ✓
Esegui tutte le migration su Supabase production in ordine:

```sql
-- 1. Tournaments foundation
supabase/migrations/001_create_tournaments_and_participants.sql

-- 2. RLS policies for tournaments
supabase/migrations/002_rls_policies_tournaments.sql

-- 3. Competition types
supabase/migrations/003_add_competition_types.sql

-- 4. Tennis scoring (sets, games, tie-breaks)
supabase/migrations/004_add_tennis_scoring.sql

-- 5. Chat system
supabase/migrations/005_add_chat_system.sql

-- 6. Announcements
supabase/migrations/006_add_announcements.sql

-- 7. Email system
supabase/migrations/007_email_system.sql

-- 8. Profile enhancements
supabase/migrations/008_profile_enhancements.sql
```

**Verifica**: Controlla che tutte le tabelle siano create:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: profiles, bookings, tournaments, tournament_participants, matches, courses, enrollments, events, gallery, hero_content, hero_images, homepage_sections, news, orders, products, programs, services, social_links, staff, subscriptions, messages, conversations, announcements, email_logs, email_templates, athlete_stats

### 3. Row Level Security (RLS) ✓
Verifica che tutte le policy RLS siano attive:

```sql
-- Check RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
```

**Expected**: Nessuna tabella con rowsecurity=false (tutte devono essere true).

**Test manuale**: 
1. Login come atleta → verifica accesso solo ai propri dati
2. Login come admin → verifica accesso completo
3. Logout → verifica accesso pubblico limitato

### 4. Resend Configuration ✓

#### A. Domain Verification
1. Vai su Resend Dashboard → Domains
2. Aggiungi dominio personalizzato (es. mail.your-domain.com)
3. Configura DNS records:
   - SPF: `v=spf1 include:resend.com ~all`
   - DKIM: Copia record fornito da Resend
   - DMARC: `v=DMARC1; p=none;`
4. Verifica stato: "Verified" ✓

#### B. Webhook Setup
1. Resend Dashboard → Webhooks → Add Webhook
2. URL: `https://your-domain.com/api/webhooks/email`
3. Eventi selezionati:
   - ✓ email.sent
   - ✓ email.delivered
   - ✓ email.opened
   - ✓ email.clicked
   - ✓ email.bounced
   - ✓ email.complained
4. Secret: Salva in `RESEND_WEBHOOK_SECRET`
5. Test: Invia email di test e verifica log su `/api/webhooks/email`

### 5. Vercel Cron Jobs ✓

**File**: `vercel.json`
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

**Verifica**:
1. Vercel Dashboard → Project → Settings → Cron Jobs
2. Conferma che il cron sia listato: `/api/email/scheduler` @ `0 9 * * *`
3. Test manuale: `curl -X POST https://your-domain.com/api/email/scheduler -H "Authorization: Bearer YOUR_CRON_SECRET"`

### 6. Build Test Locale ✓

```bash
# Clean install
rm -rf node_modules .next
npm install

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Test build locally
npm start
```

**Aspettato**: Build success senza errori TypeScript o lint.

## Deployment Steps

### Step 1: GitHub Push

```bash
git add .
git commit -m "chore: production deployment ready - Phase 35 complete"
git push origin main
```

### Step 2: Vercel Deploy

1. **Automatic**: Vercel auto-deploya su push a main
2. **Manual**: Vercel Dashboard → Deployments → Deploy

Monitor deployment:
- Build logs: Verifica nessun errore
- Preview URL: Testa deployment prima di promuovere
- Production: Promuovi se tutto ok

### Step 3: Post-Deploy Verification

#### A. Health Check Endpoints
```bash
# Homepage
curl https://your-domain.com/

# API routes
curl https://your-domain.com/api/health

# Protected routes (should redirect to login)
curl -I https://your-domain.com/dashboard
```

#### B. Database Connectivity
1. Login come admin
2. Vai su `/dashboard/admin`
3. Verifica caricamento dati utenti
4. Crea torneo test → Conferma scrittura DB

#### C. Email System Test
1. Registra nuovo utente con email reale
2. Verifica ricezione email conferma registrazione
3. Crea prenotazione → Verifica email conferma booking
4. Dashboard admin → Email Logs → Verifica log presente

#### D. Real-time Chat Test
1. Apri 2 browser/tabs con utenti diversi
2. Invia messaggio da user A
3. Verifica ricezione istantanea su user B
4. Controlla notifiche unread count

## Monitoring Setup

### 1. Error Tracking - Sentry (Optional)

```bash
npm install --save @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Config**: `.env.production`
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

**Test**: Trigger error e verifica su Sentry Dashboard.

### 2. Analytics - Vercel Analytics

1. Vercel Dashboard → Project → Analytics → Enable
2. Aggiungi in `src/app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Monitor**: Pageviews, unique visitors, top pages, performance metrics.

### 3. Performance Monitoring

```bash
# Lighthouse CI
npm install -g @lhci/cli

lhci autorun --collect.url=https://your-domain.com
```

**Target Scores**:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

## Critical User Flow Testing

### Flow 1: User Registration → First Booking
1. ✓ Registrazione con email valida
2. ✓ Conferma email ricevuta
3. ✓ Login con credenziali
4. ✓ Navigazione a `/bookings`
5. ✓ Selezione data, campo, orario
6. ✓ Submit prenotazione
7. ✓ Email conferma booking ricevuta
8. ✓ Prenotazione visibile in `/dashboard/atleta`

### Flow 2: Admin Tournament Creation
1. ✓ Login come admin
2. ✓ `/dashboard/admin/tornei` → Nuovo Torneo
3. ✓ Compilazione form (nome, date, tipo)
4. ✓ Submit → Torneo creato
5. ✓ Atleta si iscrive da `/tornei/[id]`
6. ✓ Admin conferma iscrizione
7. ✓ Sistema genera gironi
8. ✓ Inserimento risultati match
9. ✓ Classifiche aggiornate in tempo reale

### Flow 3: Coach Lesson Confirmation
1. ✓ Atleta prenota lezione privata
2. ✓ Coach riceve notifica email
3. ✓ Coach login → `/dashboard/coach`
4. ✓ Conferma/Rifiuta lezione
5. ✓ Se confermata → Gestore approva
6. ✓ Email finale conferma ad atleta
7. ✓ Lezione compare in calendario `/bookings`

### Flow 4: Profile Enhancement & Stats
1. ✓ Atleta completa profilo `/profile`
2. ✓ Completion percentage aumenta
3. ✓ Partecipa a torneo
4. ✓ Risultati inseriti (vittoria/sconfitta)
5. ✓ Stats auto-sincronizzate
6. ✓ Dashboard stats aggiornate `/profile`
7. ✓ Metriche corrette (win rate, aces, etc.)

## Rollback Plan

### Immediate Rollback (Vercel)
1. Vercel Dashboard → Deployments
2. Trova ultimo deployment stabile
3. Ellipsis menu → "Promote to Production"
4. Conferma → Rollback istantaneo

### Database Rollback (se necessario)
```sql
-- Backup current state
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

-- Drop problematic migration
DROP TABLE IF EXISTS table_name CASCADE;

-- Revert changes manually o restore backup
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup_previous.sql
```

## Post-Deployment Tasks

### Week 1: Monitoring
- [ ] Check Sentry errors daily
- [ ] Monitor Vercel Analytics traffic
- [ ] Review email delivery rates (Resend Dashboard)
- [ ] Check database performance (Supabase Dashboard)
- [ ] Review user feedback/support requests

### Week 2: Performance
- [ ] Run Lighthouse audits
- [ ] Check Core Web Vitals (Vercel Speed Insights)
- [ ] Optimize slow API routes (check Vercel Functions logs)
- [ ] Review database query performance (pg_stat_statements)

### Month 1: Optimization
- [ ] A/B test landing page CTAs
- [ ] Review email open rates → optimize subject lines
- [ ] Analyze bounce rates → improve UX
- [ ] Scale Supabase plan if needed (check usage)
- [ ] Implement caching strategy for static content

## Emergency Contacts

- **Supabase Support**: support@supabase.com (Dashboard Support tab)
- **Resend Support**: support@resend.com
- **Vercel Support**: https://vercel.com/support
- **Database Admin**: [Your DBA contact]
- **Technical Lead**: [Your tech lead contact]

## Final Checklist

- [ ] All environment variables configured
- [ ] Database migrations executed and verified
- [ ] RLS policies active on all tables
- [ ] Resend domain verified and webhook configured
- [ ] Vercel cron jobs active
- [ ] Build passes with no TypeScript/lint errors
- [ ] All 19 tests passing
- [ ] Health check endpoints responsive
- [ ] Email delivery working (test email sent/received)
- [ ] Real-time chat functional
- [ ] Critical user flows tested end-to-end
- [ ] Monitoring tools configured (Sentry/Analytics)
- [ ] Rollback plan documented and tested
- [ ] Team notified of deployment

---

**Deployment Completed**: _____________ (Date/Time)  
**Deployed By**: _____________  
**Production URL**: https://your-domain.com  
**Status**: ✅ Live

---

*Last Updated: 2024-12-28*  
*GST Tennis Academy - Phase 35 Complete*
