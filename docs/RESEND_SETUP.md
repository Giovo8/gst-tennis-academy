# Configurazione Resend per Email

## Setup Completo con Resend (Consigliato da Vercel)

Resend è il servizio email più integrato con Vercel e Supabase. **3.000 email/mese gratis**.

### ✅ Passo 1: Installa Resend (GIÀ FATTO)
```bash
npm install resend
```

### ✅ Passo 2: Crea account Resend

1. Vai su https://resend.com
2. Registrati con GitHub o email
3. Verrai portato alla dashboard

### ✅ Passo 3: Ottieni API Key

1. Nella dashboard, vai su **API Keys**
2. Clicca **Create API Key**
3. Nome: `GST Tennis Academy`
4. Permessi: **Sending access**
5. Copia la chiave (inizia con `re_`)

### ✅ Passo 4: Configura Variabili d'Ambiente

Crea o aggiorna `.env.local`:

```env
# Supabase (già esistenti)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend (NUOVA)
RESEND_API_KEY=re_your_api_key_here
```

### ✅ Passo 5: Configura Dominio Email (Opzionale ma Consigliato)

Per produzione, usa il tuo dominio invece di quello di test:

1. In Resend, vai su **Domains**
2. Clicca **Add Domain**
3. Inserisci: `gsttennisacademy.com` (o il tuo dominio)
4. Aggiungi i record DNS forniti al tuo provider:
   - Record SPF
   - Record DKIM
   - Record DMARC
5. Verifica il dominio

Una volta verificato, aggiorna in `src/app/api/send-email/route.ts` la riga 34:
```typescript
from: "GST Tennis Academy <noreply@gsttennisacademy.com>",
```

**Durante lo sviluppo**: Resend ti dà un dominio di test `onboarding@resend.dev` che funziona subito.

### ✅ Passo 6: Deploy su Vercel

1. Aggiungi le variabili d'ambiente su Vercel:
   - Dashboard → Settings → Environment Variables
   - Aggiungi `RESEND_API_KEY`
   - Aggiungi `SUPABASE_SERVICE_ROLE_KEY`

2. Redeploy l'app

## 🧪 Test

### Test in Locale

1. Assicurati che `.env.local` contenga `RESEND_API_KEY`
2. Riavvia il server Next.js: `npm run dev`
3. Vai su `/dashboard/admin/mail-marketing/send`
4. Invia un'email di test al tuo indirizzo
5. Controlla la tua inbox

### Test su Vercel

Dopo il deploy, fai lo stesso test dalla dashboard di produzione.

## 📊 Monitoring

Nella dashboard di Resend puoi vedere:
- Email inviate
- Email consegnate
- Email aperte (se abiliti tracking)
- Email con bounce
- Log dettagliati per debugging

## 🎯 Limiti Piano Gratuito

- ✅ 3.000 email/mese
- ✅ 100 email/giorno
- ✅ 1 dominio verificato
- ✅ API illimitate
- ✅ Supporto email

Se superi i limiti:
- **Hobby**: $20/mese → 50.000 email
- **Pro**: $80/mese → 300.000 email

## ⚡ Vantaggi vs Alternative

| Servizio | Costo | Email Gratis | Setup | Integrazione Vercel |
|----------|-------|--------------|-------|---------------------|
| **Resend** | $0-20 | 3.000/mese | ⭐⭐⭐⭐⭐ | ✅ Nativa |
| SendGrid | $0-20 | 100/giorno | ⭐⭐⭐ | ⚠️ Manuale |
| Mailgun | $0-35 | 5.000/mese | ⭐⭐⭐ | ⚠️ Manuale |
| Amazon SES | Pay-as-go | - | ⭐⭐ | ⚠️ Complesso |

## 🚀 Prossimi Step

1. ✅ **Esegui SQL**: `CREATE_EMAIL_CAMPAIGNS_TABLE.sql` su Supabase
2. ✅ **Configura Resend**: Ottieni API key
3. ✅ **Testa localmente**: Invia email di prova
4. 📧 **Verifica dominio**: Per produzione
5. 🚀 **Deploy**: Su Vercel con variabili d'ambiente

## ❓ Troubleshooting

### "API key not found"
- Verifica che `.env.local` contenga `RESEND_API_KEY`
- Riavvia il server dev

### "Invalid from address"
- Con piano gratuito usa: `onboarding@resend.dev`
- Oppure verifica il tuo dominio

### Email non arriva
- Controlla spam/promozioni
- Verifica log in dashboard Resend
- Controlla console browser per errori API

## 📝 Note

- ✅ Il codice è già configurato per usare Resend
- ✅ Il template HTML è già incluso
- ✅ La cronologia si salva automaticamente nel database
- ⚠️ Ricorda di non committare `.env.local` nel repository
