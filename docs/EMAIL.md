# Sistema Email

GST Tennis Academy invia email transazionali tramite **Resend** (`resend@6.9.3`). Tutte le
funzioni email risiedono in `src/lib/email/` e vengono eseguite **solo lato server**.

---

## Configurazione

Variabili d'ambiente:

| Variabile | Descrizione |
|-----------|-------------|
| `RESEND_API_KEY` | API key Resend. Se assente, l'invio email è disabilitato (warning a log) |
| `EMAIL_FROM` | Mittente. Default: `GST Tennis Academy <onboarding@resend.dev>` |

> ⚠️ `RESEND_API_KEY` è un segreto: **mai** usare il prefisso `NEXT_PUBLIC_`.

### Setup Resend

1. Crea un account su [resend.com](https://resend.com).
2. Verifica il tuo dominio (record DNS SPF/DKIM) per inviare da un indirizzo personalizzato.
3. Genera una API key e impostala in `RESEND_API_KEY`.
4. Imposta `EMAIL_FROM` con un mittente verificato sul dominio.

---

## Moduli (`src/lib/email/`)

| File | Responsabilità |
|------|----------------|
| `resend-client.ts` | `getResendClient()` (singleton lazy) e `getEmailFromAddress()` |
| `email-utils.ts` | `normalizeEmail()`, `escapeHtml()`, `getGestoreRecipients()` |
| `booking-notifications.ts` | Email di creazione/cancellazione prenotazione (atleta, maestro, gestore) |
| `booking-email-copy.ts` | Testi/oggetti localizzati per tipo di prenotazione |
| `signup-notifications.ts` | Email di benvenuto/verifica alla registrazione |
| `email-log.ts` | `logEmailDispatch()` — registra le email inviate per audit/retry |

---

## Notifiche automatiche

| Evento | Destinatari |
|--------|-------------|
| Nuova prenotazione | Atleta (conferma), maestro (se assegnato), gestori (notifica) |
| Cancellazione prenotazione | Tutte le parti coinvolte |
| Registrazione utente | Email di benvenuto all'utente; notifica ai gestori |
| Iscrizione torneo | Conferma all'atleta |
| Aggiornamenti sfida Arena | Parti coinvolte |
| Lezione privata | Notifica dedicata (`privateLessonNotifications`) |

Le copie email sono localizzate in italiano e differenziate per tipo di prenotazione
(`lezione_privata`, `lezione_gruppo`, `campo`) e per azione (creazione / cancellazione).

---

## Logging e tracciamento

- Ogni invio viene registrato nella tabella `email_logs` (vedi [DATABASE.md](DATABASE.md)) con
  stato, provider, message id e timestamp di apertura/click.
- L'endpoint `GET /api/email-logs` (admin) espone i log con stato di consegna.
- La funzione `get_email_stats(start, end)` fornisce statistiche aggregate.
- `is_user_unsubscribed(email, category)` rispetta le preferenze di disiscrizione
  (`email_unsubscribes`: `all` / `marketing` / `notifications`).

---

## Campagne (admin)

Dalla sezione `/dashboard/admin/mail-marketing` gli admin/gestori possono inviare campagne
email in blocco e consultarne lo storico.

---

## Job schedulato

`vercel.json` definisce un cron giornaliero alle **09:00 UTC** verso `/api/email/scheduler`,
protetto da `CRON_SECRET`, per l'invio delle email programmate. Vedi [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Best practice

- Usare `escapeHtml()` su tutti i contenuti dinamici inseriti nei template per prevenire XSS.
- Normalizzare gli indirizzi con `normalizeEmail()` prima dell'invio.
- Gestire l'assenza di `RESEND_API_KEY` senza bloccare il flusso applicativo (degradazione
  controllata).
- Rispettare sempre le preferenze di disiscrizione prima di inviare email marketing.
