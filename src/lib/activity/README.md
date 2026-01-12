# Activity Logging

Sistema per tracciare tutte le azioni degli utenti sulla piattaforma GST Tennis Academy.

## Utilizzo Base

```typescript
import { logActivity } from "@/lib/activity/logActivity";

// In un componente React o funzione client-side
await logActivity({
  action: "booking.create",
  entityType: "booking",
  entityId: booking.id,
  metadata: {
    court: "Campo 1",
    date: "2026-01-10",
    time: "10:00-11:00"
  }
});
```

## Utilizzo in API Routes

```typescript
import { logActivityServer } from "@/lib/activity/logActivity";

export async function POST(request: NextRequest) {
  // ... your logic ...

  await logActivityServer({
    userId: user.id,
    action: "email.campaign.create",
    entityType: "email_campaign",
    entityId: campaign.id,
    ipAddress: request.headers.get("x-forwarded-for") || request.ip,
    userAgent: request.headers.get("user-agent") || undefined,
    metadata: {
      recipientCount: recipients.length,
      subject: campaign.subject
    }
  });
}
```

## Azioni Predefinite

### Utenti
- `user.register` - Registrazione nuovo utente
- `user.login` - Login
- `user.logout` - Logout
- `user.update_profile` - Aggiornamento profilo

### Prenotazioni
- `booking.create` - Creazione prenotazione
- `booking.update` - Modifica prenotazione
- `booking.cancel` - Cancellazione
- `booking.confirm` - Conferma da admin/gestore

### Tornei
- `tournament.create` - Creazione torneo
- `tournament.join` - Iscrizione torneo
- `tournament.leave` - Abbandono torneo
- `tournament.start` - Inizio torneo
- `tournament.complete` - Completamento torneo

### Email
- `email.send` - Invio email singola
- `email.campaign.create` - Creazione campagna
- `email.campaign.delete` - Eliminazione campagna

### Campi
- `court.block` - Blocco campo
- `court.unblock` - Sblocco campo

### Codici Invito
- `invite_code.create` - Creazione codice
- `invite_code.use` - Utilizzo codice

### Video Lezioni
- `video_lesson.create` - Creazione video
- `video_lesson.view` - Visualizzazione video

### Notifiche
- `notification.create` - Creazione notifica
- `notification.read` - Lettura notifica

## Visualizzazione Log

I log possono essere visualizzati nella pagina admin:
`/dashboard/admin/platform-logs`

Questa pagina permette di:
- Filtrare per tipo di azione
- Cercare per utente o dettagli
- Espandere per vedere metadata completi
- Visualizzare IP address e user agent
