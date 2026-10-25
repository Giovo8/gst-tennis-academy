# Sistema Email

Le email transazionali sono inviate tramite **Resend**. Tutto il codice email risiede in `src/lib/email/` e viene eseguito **solo lato server**. Non esistono webhook Resend né scheduler: l'invio è sempre sincrono, innescato dalle API route al momento dell'evento.

## Configurazione

| Variabile        | Descrizione                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | API key Resend. **Se assente, l'invio viene saltato silenziosamente** (un solo warning a log, poi nessun errore) |
| `EMAIL_FROM`     | Mittente. Se non impostata: `GST Tennis Academy <onboarding@resend.dev>`                                         |

`RESEND_API_KEY` è un segreto: mai usare il prefisso `NEXT_PUBLIC_`. Entrambe le variabili sono lette tramite lo schema Zod di `src/lib/config/env.ts` (`env.resendApiKey`, `env.emailFrom`).

## Client Resend

`src/lib/email/resend-client.ts`:

- `getResendClient()` — **singleton** lazy: istanzia `Resend` una sola volta; ritorna `null` se `RESEND_API_KEY` manca (il warning "Email delivery is disabled" viene loggato una sola volta per processo). Ogni funzione di invio inizia con `if (!resend) return;` — da qui lo skip silenzioso.
- `getEmailFromAddress()` — mittente da `EMAIL_FROM` con fallback al dominio di test Resend.

## Moduli

| File                                     | Contenuto                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/email/resend-client.ts`         | Singleton client + mittente                                                                                                                                  |
| `src/lib/email/booking-notifications.ts` | Email prenotazioni (creazione, modifica, eliminazione)                                                                                                       |
| `src/lib/email/booking-email-copy.ts`    | Testi per tipo prenotazione (`campo`, `lezione`, `lezione_privata`, `lezione_gruppo`; etichetta anche per `torneo`) e azione (`created`/`updated`/`deleted`) |
| `src/lib/email/signup-notifications.ts`  | Notifica di nuova registrazione                                                                                                                              |
| `src/lib/email/email-utils.ts`           | `normalizeEmail()`, `escapeHtml()` (anti-XSS nei template), `getGestoreRecipients()` (tutti i profili con ruolo `gestore`)                                   |
| `src/lib/email/email-log.ts`             | Persistenza esiti in `email_logs`                                                                                                                            |

## Email inviate

Template HTML inline (header con logo, tabella dettagli, CTA verso la dashboard del destinatario) + versione testuale. Date e orari formattati in `it-IT`, timezone `Europe/Rome`. Tutti i valori dinamici passano da `escapeHtml()`.

| Funzione                              | Quando                                                                         | Destinatari                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `sendBookingCreatedEmailToGestore`    | Prenotazione confermata creata da un atleta (`POST /api/bookings`)             | Atleta + primo gestore (segreteria), con gli altri gestori e l'eventuale maestro (lezione privata) in CC |
| `sendBookingCreatedEmailToAthlete`    | Prenotazione creata da staff (gestore/admin/maestro) per conto dell'atleta     | Atleta/i (email di conferma)                                                                             |
| `sendBookingCreatedEmailToMaestro`    | Lezione privata creata dallo staff                                             | Maestro assegnato                                                                                        |
| `sendBookingUpdatedEmailToRecipients` | Prenotazione modificata o spostata (`PUT /api/bookings`, anche dalla timeline) | Atleti + segreteria (CC come sopra); evidenzia campo e orario precedenti se cambiati                     |
| `sendBookingDeletedEmailToRecipients` | Prenotazione eliminata (`DELETE /api/bookings`)                                | Atleti + segreteria (CC come sopra), con indicazione di chi ha eliminato                                 |
| `sendSignupEmailToGestori`            | Nuova registrazione (`POST /api/auth/signup`)                                  | Tutti i gestori; opzionalmente anche l'atleta stesso (`notifyAthlete`)                                   |

Note:

- Le lezioni private richieste da un atleta nascono `pending` e **non inviano email** finché non vengono confermate; conferma e rifiuto (`/api/bookings/confirm`, `/api/bookings/reject`) generano solo **notifiche in-app** (tabella `notifications`).
- L'orchestrazione (chi riceve cosa, risoluzione delle email dei partecipanti dai profili, nome del maestro) è in `src/lib/bookings/bookingService.ts`; i template HTML sono in `booking-notifications.ts`, con struttura simile ripetuta per ogni tipo di email.
- Ogni funzione è avvolta in try/catch e **non fa mai fallire** l'operazione principale (prenotazione/registrazione): gli errori vengono solo loggati con `secure-logger`.

## Logging degli esiti

`logEmailDispatch()` (`src/lib/email/email-log.ts`) registra ogni tentativo, riuscito o fallito:

1. Insert in **`email_logs`** con: destinatario (email, nome, user id), `subject`, `template_name` (`booking_created_{athlete,gestore,maestro}_notification`, `booking_updated_{athlete,recipients}_notification`, `booking_deleted_{athlete,recipients}_notification`, `user_registered_gestore_notification`), `status` (`sent`/`failed`), `provider` (`resend`), `provider_message_id`, `error_message`, `metadata` (bookingId, ruoli, campo, orari, CC).
2. Se l'insert fallisce, **fallback** sulla tabella legacy **`email_log`** (payload ridotto).
3. Se fallisce anche il fallback, errore a log — l'invio email non viene mai bloccato dal logging.

## Cosa NON esiste

- Webhook Resend (bounce/delivery tracking): la variabile `RESEND_WEBHOOK_SECRET` citata in vecchi file non è mai stata implementata.
- Scheduler/digest email: nessun cron di invio; la route `/api/email/scheduler` non esiste.
- Campagne email: le vecchie tabelle `email_campaigns`, `email_templates`, `email_settings` ed `email_unsubscribes` non sono mai state usate e vengono rimosse dalla migrazione 087.
