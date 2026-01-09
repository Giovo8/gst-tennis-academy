# Configurazione Email per GST Tennis Academy

## Setup Completato

Ho implementato un sistema completo per l'invio di email con cronologia:

### 1. Database
- **File SQL**: `supabase/CREATE_EMAIL_CAMPAIGNS_TABLE.sql`
- **Tabella**: `email_campaigns` con tutti i campi necessari
- **RLS**: Policy configurate per admin e gestore

### 2. API Route
- **File**: `src/app/api/send-email/route.ts`
- Gestisce l'invio delle email e il salvataggio nel database

### 3. Interfaccia Aggiornata
- **Pagina principale**: `/dashboard/admin/mail-marketing` - mostra "Cronologia Email Inviate"
- **Pagina invio**: `/dashboard/admin/mail-marketing/send` - form per inviare nuove email

## Configurazione Necessaria

### Passo 1: Esegui lo script SQL
Esegui il file `supabase/CREATE_EMAIL_CAMPAIGNS_TABLE.sql` nel SQL Editor di Supabase per creare la tabella.

### Passo 2: Configura le variabili d'ambiente
Aggiungi nel file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **IMPORTANTE**: La `SUPABASE_SERVICE_ROLE_KEY` va mantenuta segreta e usata solo server-side.

### Passo 3: Integra un servizio email (OBBLIGATORIO)

**Attualmente le email NON vengono inviate realmente**. L'API salva solo i dati nel database.

Per inviare email reali, devi integrare un servizio. Opzioni consigliate:

#### Opzione A: Resend (Consigliato - Semplice e Moderno)

1. Installa:
```bash
npm install resend
```

2. Registrati su https://resend.com e ottieni la API key

3. Aggiungi in `.env.local`:
```env
RESEND_API_KEY=re_your_api_key
```

4. Modifica `src/app/api/send-email/route.ts` alla linea 32-42:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Sostituisci il codice esistente con:
const emailPromises = recipientEmails.map(async (email: string) => {
  try {
    await resend.emails.send({
      from: 'GST Tennis Academy <noreply@tuodominio.com>',
      to: email,
      subject: subject,
      html: message.replace(/\n/g, '<br>'),
    });
    return { email, status: "sent" };
  } catch (error) {
    console.error(`Failed to send to ${email}:`, error);
    return { email, status: "failed" };
  }
});
```

#### Opzione B: SendGrid

1. Installa:
```bash
npm install @sendgrid/mail
```

2. Ottieni API key da https://sendgrid.com

3. Aggiungi in `.env.local`:
```env
SENDGRID_API_KEY=SG.your_api_key
```

4. Modifica `src/app/api/send-email/route.ts`:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Sostituisci il codice esistente:
const emailPromises = recipientEmails.map(async (email: string) => {
  try {
    await sgMail.send({
      from: 'noreply@tuodominio.com',
      to: email,
      subject: subject,
      html: message.replace(/\n/g, '<br>'),
    });
    return { email, status: "sent" };
  } catch (error) {
    console.error(`Failed to send to ${email}:`, error);
    return { email, status: "failed" };
  }
});
```

#### Opzione C: Nodemailer (Per server SMTP personale)

1. Installa:
```bash
npm install nodemailer
```

2. Configura in `.env.local`:
```env
SMTP_HOST=smtp.tuoservizio.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_password
```

## Testing

### Test locale (senza email reali)
1. Esegui lo script SQL
2. Compila il form su `/dashboard/admin/mail-marketing/send`
3. Controlla la console per vedere i log
4. Verifica che l'email appaia in "Cronologia Email Inviate"

### Test con email reali
1. Completa l'integrazione con un servizio email (vedi sopra)
2. Invia un'email di test a un tuo indirizzo
3. Verifica la ricezione

## Note Importanti

- ⚠️ **Le email NON vengono inviate fino a quando non integri un servizio email**
- 📊 Il sistema salva comunque tutto nel database per la cronologia
- 🔒 Usa sempre la service role key solo server-side
- ✉️ Per email in produzione, configura SPF, DKIM e DMARC per il tuo dominio

## Funzionalità

✅ Salvataggio cronologia email nel database
✅ Interfaccia per inviare email a tutti/ruolo/custom
✅ Template predefiniti (benvenuto, invito torneo, promemoria corso, etc.)
✅ Visualizzazione cronologia con data e numero destinatari
✅ Gestione errori e messaggi di successo
❌ Invio email reale (richiede integrazione servizio - vedi sopra)

## Prossimi Passi

1. Esegui `CREATE_EMAIL_CAMPAIGNS_TABLE.sql` su Supabase
2. Scegli e integra un servizio email
3. Testa l'invio
4. (Opzionale) Aggiungi tracking aperture/click
