# Deployment

Guida al deploy di GST Tennis Academy su **Vercel** con database **Supabase**.

## Prerequisiti

- Node.js 20+
- Progetto Supabase attivo (Auth + PostgreSQL + Storage)
- Account Vercel
- Facoltativi: API key Resend (email) e Gemini (notizie AI)

## 1. Preparazione del database Supabase

1. **Nuovo progetto**: eseguire dallo SQL Editor schema base, migrazioni e script nell'ordine descritto in [DATABASE.md → Setup da zero](DATABASE.md#setup-da-zero). Il bucket `avatars` è incluso in quella sequenza; `certificates` è creato dalla migrazione 053.
2. **Progetto esistente**: applicare solo le migrazioni con numero maggiore dell'ultima già eseguita. Le migrazioni 087 e 088 sono distruttive (la 089 no): fare prima un backup e leggere le istruzioni nell'intestazione dei file.
3. Per il modulo notizie AI: abilitare le estensioni `pg_cron` e `pg_net` dal dashboard Supabase (Database → Extensions), se non già attive dalla migrazione 063.
4. Aggiungere alla publication realtime le tabelle elencate in [DATABASE.md → Realtime](DATABASE.md#realtime).

## 2. Edge Function `genera-news`

La generazione schedulata delle notizie AI è affidata alla Edge Function Supabase in `supabase/functions/genera-news/`:

```bash
supabase functions deploy genera-news
```

Flusso: le schedulazioni sono salvate nella tabella `ai_news_cron` (gestite da `/dashboard/admin/news`); la funzione DB `ai_news_sync_cron_job()` le registra su `pg_cron`, che all'orario configurato invoca via `pg_net` l'endpoint `https://<project>.supabase.co/functions/v1/genera-news` con la service role key.

**Non esistono cron Vercel**: il file `vercel.json` è stato rimosso (puntava a un endpoint mai implementato). Tutta la schedulazione vive lato Supabase.

## 3. Variabili d'ambiente

Le variabili sono le stesse di `.env.example` (root del repo), che è la fonte di verità: tutte quelle elencate sono effettivamente lette dal codice.

| Variabile                       | Obbligatoria | Uso                                                                                                               |
| ------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                      | —            | Impostata automaticamente da Vercel (`production`)                                                                |
| `NEXT_PUBLIC_APP_URL`           | Sì           | URL pubblico dell'app (link nelle email, metadati SEO)                                                            |
| `NEXT_PUBLIC_SITE_URL`          | Sì           | Whitelist CSRF `Origin` nel middleware                                                                            |
| `NEXT_PUBLIC_SUPABASE_URL`      | Sì           | URL progetto Supabase (esposta al client)                                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sì           | Chiave anon (esposta al client)                                                                                   |
| `SUPABASE_URL`                  | No           | URL progetto lato server (default: `NEXT_PUBLIC_SUPABASE_URL`)                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Sì           | **Solo server** (`src/lib/supabase/serverClient.ts`): bypassa la RLS. Mai con prefisso `NEXT_PUBLIC_`             |
| `RESEND_API_KEY`                | No           | Email transazionali; se assente l'invio è saltato senza errori                                                    |
| `EMAIL_FROM`                    | No           | Mittente email, es. `GST Tennis Academy <noreply@dominio.com>`                                                    |
| `GEMINI_API_KEY`                | No           | Notizie AI; se assente la generazione usa solo il parsing RSS. Va impostata anche nei secrets della Edge Function |
| `GEMINI_MODEL`                  | No           | Modello Gemini da usare (default nel codice)                                                                      |
| `ENABLE_RATE_LIMITING`          | No           | Abilita il rate limiting in-memory (default consigliato: `true`)                                                  |
| `LOG_LEVEL`                     | No           | `debug` / `info` / `warn` / `error` (default `info`)                                                              |

Configurarle in Vercel → Project → Settings → Environment Variables (ambienti Production/Preview/Development a seconda delle esigenze).

## 4. Deploy su Vercel

1. Importare il repository (framework rilevato: **Next.js**).
2. Build command standard: `next build` (nessuna personalizzazione; `npm install` come install command di default).
3. Configurare le variabili d'ambiente (sopra) **prima** del primo deploy: il client Supabase server-side fallisce all'avvio se mancano l'URL Supabase o `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Le API route girano come serverless functions; il middleware (CSRF + sessione) gira su edge/Node secondo il default di Next.js.

### Dopo il deploy

- Verificare `https://<dominio>/api/health` → `{ "status": "ok" }`.
- Aggiornare `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SITE_URL` con il dominio di produzione (il CSRF check confronta l'header `Origin` con questi valori e con l'host corrente).
- In Supabase → Authentication → URL Configuration, impostare Site URL e redirect URL (es. `https://<dominio>/auth/reset-password`).

## Note operative

### Rate limiter in-memory su serverless

`src/lib/security/rate-limiter.ts` tiene i contatori **in memoria di processo**. Su Vercel serverless questo significa:

- i contatori si azzerano a ogni cold start;
- non sono condivisi tra istanze parallele, quindi il limite effettivo è per-istanza e non globale.

`ENABLE_RATE_LIMITING=true` resta consigliato come mitigazione di base; per un limite affidabile servirebbe uno store esterno (es. Redis/Upstash), oggi non integrato.

### Header di sicurezza

Definiti in `next.config.ts` e applicati a tutte le route: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS e Content-Security-Policy (attualmente con `unsafe-inline` negli script; TODO nel file per migrare a CSP con nonce). Non serve configurazione aggiuntiva su Vercel.

### Email

Gli invii Resend sono tracciati nella tabella `email_logs`; se `RESEND_API_KEY` non è configurata, l'app funziona normalmente saltando gli invii.

### Job database

- `purge_security_events()` è schedulata dalla migrazione 082 (job pg_cron `purge-security-events`, ogni notte alle 03:30) per la retention a 90 giorni di `security_events`.
- I job delle notizie AI sono creati e aggiornati da `ai_news_sync_cron_job()` quando si salva una schedulazione in dashboard.
