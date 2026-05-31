# Deployment

Guida all'installazione locale, configurazione del database e deploy in produzione su Vercel.

---

## Prerequisiti

- **Node.js** ≥ 20.19
- Un progetto **Supabase** (PostgreSQL + Auth + Storage)
- (Opzionale) Account **Resend** per le email
- (Opzionale) Account **Vercel** per il deploy

---

## Setup locale

### 1. Clona e installa

```bash
git clone <repo-url>
cd gst-tennis-academy
npm install
```

### 2. Configura l'ambiente

Crea `.env.local`:

```env
# Supabase (obbligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # SEGRETO, solo server

# Site
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email (opzionale)
RESEND_API_KEY=re_xxx
EMAIL_FROM=GST Tennis Academy <noreply@tuodominio.it>

# Cron (per /api/email/scheduler)
CRON_SECRET=<stringa-casuale-sicura>
```

> ⚠️ **Mai** prefissare con `NEXT_PUBLIC_` i segreti: `SUPABASE_SERVICE_ROLE_KEY`,
> `RESEND_API_KEY`, `CRON_SECRET`. L'elenco completo delle variabili è in
> [ARCHITECTURE.md](ARCHITECTURE.md#variabili-dambiente).

### 3. Setup database

1. Apri il progetto su [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**.
2. Esegui le migrazioni in `supabase/migrations/` in **ordine numerico** (001 → 062).
3. Verifica la creazione delle funzioni helper (`get_my_role()`, `handle_new_user()`).
4. Verifica i bucket storage (`chat-attachments`, `certificates`).

L'elenco completo delle migrazioni è in [DATABASE.md](DATABASE.md#elenco-migrazioni).

### 4. Avvia

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

### 5. Crea il primo admin

```sql
-- In Supabase SQL Editor
UPDATE profiles SET role = 'admin' WHERE email = 'tua-email@example.com';
```

---

## Testing

```bash
npm test                # Esegue i 236 test (Jest)
npm run test:coverage   # Report di copertura
```

---

## Deploy su Vercel

1. **Push su GitHub** del repository.
2. Su [vercel.com](https://vercel.com), importa il repository.
3. Configura le **variabili d'ambiente** (le stesse di `.env.local`, con gli URL di produzione).
4. Deploy: automatico su ogni push, con preview deployment per le PR e SSL automatico.

### Header di sicurezza

`next.config.ts` imposta automaticamente: `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, HSTS e Content-Security-Policy.

### Ottimizzazione immagini

Domini remoti consentiti: `unsplash.com`, `cdn.sanity.io`, `*.supabase.co`. Formati: AVIF, WebP.

---

## Cron job

`vercel.json` definisce un job schedulato:

```json
{
  "crons": [
    { "path": "/api/email/scheduler", "schedule": "0 9 * * *" }
  ]
}
```

- Esegue `/api/email/scheduler` ogni giorno alle **09:00 UTC**.
- L'endpoint è protetto da `CRON_SECRET`: impostare la variabile su Vercel.

> Funzioni database come `reset_weekly_credits()` e `cleanup_old_typing_indicators()` vanno
> schedulate separatamente tramite **Supabase scheduled jobs / pg_cron**.

---

## Checklist di produzione

- [ ] Variabili d'ambiente impostate su Vercel (incluso `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).
- [ ] Tutte le migrazioni applicate in ordine sul database di produzione.
- [ ] Dominio email verificato su Resend e `EMAIL_FROM` configurato.
- [ ] Bucket storage creati e relative policy verificate.
- [ ] Primo account admin creato.
- [ ] `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` impostati sul dominio di produzione (CSRF).
- [ ] `npm run build` e `npm test` superati.
