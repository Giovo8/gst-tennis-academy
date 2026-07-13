# Sistema Email

Le email transazionali sono inviate tramite **Resend**. Tutto il codice email risiede in `src/lib/email/` e viene eseguito **solo lato server**. Non esistono webhook Resend né scheduler: l'invio è sempre sincrono, innescato dalle API route al momento dell'evento.

## Configurazione

| Variabile | Descrizione |
|---|---|
| `RESEND_API_KEY` | API key Resend. **Se assente, l'invio viene saltato silenziosamente** (un solo warning a log, poi nessun errore) |
| `EMAIL_FROM` | Mittente. Se non impostata: `GST Tennis Academy <onboarding@resend.dev>` |

`RESEND_API_KEY` è un segreto: mai usare il prefisso `NEXT_PUBLIC_`. Entrambe le variabili sono lette tramite lo schema Zod di `src/lib/config/env.ts` (`env.resendApiKey`, `env.emailFrom`).

## Client Resend

`src/lib/email/resend-client.ts`:

- `getResendClient()` — **singleton** lazy: istanzia `Resend` una sola volta; ritorna `null` se `RESEND_API_KEY` manca (il warning "Email delivery is disabled" viene loggato una sola volta per processo). Ogni funzione di invio inizia con `if (!resend) return;` — da qui lo skip silenzioso.
- `getEmailFromAddress()` — mittente da `EMAIL_FROM` con fallback al dominio di test Resend.

## Moduli

| File | Contenuto |
|---|---|
| `src/lib/email/resend-client.ts` | Singleton client + mittente |
| `src/lib/email/booking-notifications.ts` | Email prenotazioni (creazione ed eliminazione) |
| `src/lib/email/booking-email-copy.ts` | Testi per tipo prenotazione (`campo`, `lezione`, `lezione_privata`, `lezione_gruppo`) e azione (`created`/`deleted`) |
| `src/lib/email/signup-notifications.ts` | Notifica di nuova registrazione |
| `src/lib/email/email-utils.ts` | `normalizeEmail()`, `escapeHtml()` (anti-XSS nei template), `getGestoreRecipients()` (tutti i profili con ruolo `gestore`) |
| `src/lib/email/email-log.ts` | Persistenza esiti in `email_logs` |

## Email inviate

Template HTML inline (header con logo, tabella dettagli, CTA verso la dashboard del destinatario) + versione testuale. Date e orari formattati in `it-IT`, timezone `Europe/Rome`. Tutti i valori dinamici passano da `escapeHtml()`.

| Funzione | Quando | Destinatari |
|---|---|---|
| `sendBookingCreatedEmailToGestore` | Prenotazione creata da un atleta (`bookingService.ts`, `POST /api/bookings`, `POST /api/bookings/batch`) | Atleta + primo gestore (segreteria), con gli altri gestori e l'eventuale maestro (lezione privata) in CC |
| `sendBookingCreatedEmailToAthlete` | Prenotazione creata da gestore/admin per conto dell'atleta | Atleta/i (email di conferma) |
| `sendBookingCreatedEmailToMaestro` | Lezione privata creata da gestore/admin | Maestro assegnato |
| `sendBookingDeletedEmailToRecipients` | Prenotazione eliminata/annullata | Atleta + segreteria (CC come sopra), con indicazione di chi ha eliminato |
| `sendSignupEmailToGestori` | Nuova registrazione (`POST /api/auth/signup`) | Tutti i gestori; opzionalmente anche l'atleta stesso (`notifyAthlete`) |

Note:

- La **conferma/rifiuto** di una prenotazione da parte di maestro/gestore (`/api/bookings/confirm`, `/api/bookings/reject`) genera solo **notifiche in-app** (tabella `notifications`), non email.
- Ogni funzione è avvolta in try/catch e **non fa mai fallire** l'operazione principale (prenotazione/registrazione): gli errori vengono solo loggati con `secure-logger`.

## Logging degli esiti

`logEmailDispatch()` (`src/lib/email/email-log.ts`) registra ogni tentativo, riuscito o fallito:

1. Insert in **`email_logs`** con: destinatario (email, nome, user id), `subject`, `template_name` (es. `booking_created_athlete_notification`, `booking_deleted_recipients_notification`, `signup_*`), `status` (`sent`/`failed`), `provider` (`resend`), `provider_message_id`, `error_message`, `metadata` (bookingId, ruoli, campo, orari, CC).
2. Se l'insert fallisce, **fallback** sulla tabella legacy **`email_log`** (payload ridotto).
3. Se fallisce anche il fallback, errore a log — l'invio email non viene mai bloccato dal logging.

## Cosa NON esiste

- Webhook Resend (bounce/delivery tracking): la variabile `RESEND_WEBHOOK_SECRET` citata in vecchi file non è mai stata implementata.
- Scheduler/digest email: nessun cron di invio; la route `/api/email/scheduler` non esiste.
- Campagne email: le tabelle `email_campaigns`/`email_templates`/`email_settings` esistono a DB ma non sono usate dal codice di invio.
