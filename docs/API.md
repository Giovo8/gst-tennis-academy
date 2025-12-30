# API Documentation - GST Tennis Academy

**Ultima revisione**: 30 Dicembre 2025  
**Versione API**: 2.0

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Autenticazione

Tutti gli endpoint protetti richiedono un token JWT Supabase nell'header Authorization:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

Ottenere il token tramite Supabase Auth:

```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

### Service Role Pattern (Admin APIs)

Endpoint admin usano la Service Role Key di Supabase per bypassare RLS:
- `/api/admin/*` - Richiedono autenticazione service role
- L'utente deve avere ruolo `admin` o `gestore` verificato tramite tabella profiles
- Service role key salvata in variabile ambiente `SUPABASE_SERVICE_ROLE_KEY`

## Formato Errori

Formato standard degli errori:

```json
{
  "error": "Descrizione errore",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request (errore validazione)
- `401`: Unauthorized (token mancante/invalido)
- `403`: Forbidden (permessi insufficienti)
- `404`: Not Found
- `409`: Conflict (duplicato/capacità superata)
- `500`: Internal Server Error

---

## Endpoints

## Utenti

### `GET /api/users`

Ottiene lista utenti per prenotazioni/iscrizioni tornei.

**Auth**: Richiesta  
**Ruoli**: admin, gestore, maestro

**Query Parameters**:
- `role` (opzionale): Filtra per ruolo

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "full_name": "Mario Rossi",
      "email": "mario@example.com",
      "role": "atleta"
    }
  ]
}
```

**Note**:
- Filtra utenti solo: atleta, coach, maestro, admin, gestore
- Ricerca case-insensitive

---

## Admin

### `GET /api/admin/users`

Lista tutti gli utenti con dati completi. Usa Service Role per bypass RLS.

**Auth**: Richiesta (Service Role)  
**Ruoli**: admin, gestore

**Query Parameters**:
- `role` (opzionale): Filtra per ruolo
- `search` (opzionale): Ricerca per nome/email

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Mario Rossi",
      "role": "atleta",
      "phone": "+39 123456789",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/admin/users`

Crea nuovo utente.

**Auth**: Richiesta (Service Role)  
**Ruoli**: admin, gestore

**Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "Nuovo Utente",
  "role": "atleta"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "full_name": "Nuovo Utente",
    "role": "atleta"
  }
}
```

### `PATCH /api/admin/users/:id`

Aggiorna utente esistente.

**Auth**: Richiesta (Service Role)  
**Ruoli**: admin, gestore

**Body**:
```json
{
  "full_name": "Nome Aggiornato",
  "role": "maestro",
  "phone": "+39 987654321"
}
```

### `DELETE /api/admin/users/:id`

Elimina utente.

**Auth**: Richiesta (Service Role)  
**Ruoli**: admin, gestore

**Response**:
```json
{
  "success": true
}
```

---

## Tornei

### `GET /api/tournaments`

Ottiene lista tornei.

**Auth**: Non richiesta  

**Query Parameters**:
- `status` (opzionale): Filtra per status ('Aperto', 'In Corso', 'Concluso', 'Annullato')
- `type` (opzionale): Filtra per tournament_type
- `limit` (opzionale): Limita risultati (default: tutti)

**Response**:
```json
{
  "tournaments": [
    {
      "id": "uuid",
      "title": "Torneo Open Gennaio 2025",
      "description": "Torneo ad eliminazione diretta",
      "tournament_type": "eliminazione_diretta",
      "max_participants": 16,
      "current_participants": 8,
      "status": "Aperto",
      "start_date": "2025-01-15T09:00:00Z",
      "end_date": "2025-01-20T18:00:00Z",
      "category": "Open",
      "level": "Intermedio",
      "surface_type": "terra",
      "entry_fee": 25.00,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/tournaments`

Crea nuovo torneo.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Body**:
```json
{
  "title": "Nuovo Torneo",
  "description": "Descrizione torneo",
  "tournament_type": "eliminazione_diretta",
  "max_participants": 16,
  "start_date": "2025-02-01T09:00:00Z",
  "end_date": "2025-02-05T18:00:00Z",
  "category": "Open",
  "level": "Avanzato",
  "surface_type": "terra",
  "match_format": "best_of_3",
  "entry_fee": 30.00,
  "prize_money": 500.00
}
```

**Per torneo con gironi**:
```json
{
  "title": "Torneo con Gironi",
  "tournament_type": "girone_eliminazione",
  "max_participants": 16,
  "num_groups": 4,
  "teams_per_group": 4,
  "teams_advancing": 2
}
```

**Response**:
```json
{
  "tournament": {
    "id": "uuid",
    "title": "Nuovo Torneo",
    "status": "Aperto",
    "current_phase": "iscrizioni"
  }
}
```

### `PUT /api/tournaments/:id`

Aggiorna torneo esistente.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Body**: Stessi campi di POST

### `DELETE /api/tournaments/:id`

Elimina torneo.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Response**:
```json
{
  "success": true
}
```

### `GET /api/tournaments/stats`

Ottiene statistiche generali tornei.

**Auth**: Non richiesta

**Response**:
```json
{
  "total": 45,
  "active": 5,
  "completed": 38,
  "upcoming": 2
}
```

---

## Partecipanti Tornei

### `GET /api/tournament_participants`

Ottiene partecipanti di un torneo.

**Auth**: Non richiesta

**Query Parameters**:
- `tournament_id` (richiesto): ID del torneo

**Response**:
```json
{
  "participants": [
    {
      "id": "uuid",
      "tournament_id": "uuid",
      "user_id": "uuid",
      "user": {
        "full_name": "Mario Rossi",
        "email": "mario@example.com"
      },
      "group_id": "uuid",
      "group": {
        "group_name": "Girone A"
      },
      "seed": 1,
      "stats": {
        "matches_played": 3,
        "matches_won": 2,
        "matches_lost": 1,
        "sets_won": 5,
        "sets_lost": 3,
        "points": 4
      },
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/tournament_participants`

Iscrivi utente a torneo (manuale da admin o auto-iscrizione).

**Auth**: Richiesta

**Body**:
```json
{
  "tournament_id": "uuid",
  "user_id": "uuid"
}
```

**Note**:
- Utenti possono iscriversi autonomamente (user_id = auth.uid())
- Admin/Gestore possono iscrivere qualsiasi utente
- Controlla capacità massima torneo
- Verifica che torneo sia nello stato 'Aperto'

**Response**:
```json
{
  "participant": {
    "id": "uuid",
    "tournament_id": "uuid",
    "user_id": "uuid"
  }
}
```

**Errori**:
- `409`: Torneo pieno
- `409`: Utente già iscritto
- `400`: Torneo non aperto alle iscrizioni

### `DELETE /api/tournament_participants`

Rimuovi partecipante da torneo.

**Auth**: Richiesta  
**Ruoli**: admin, gestore (o utente stesso se torneo in fase iscrizioni)

**Query Parameters**:
- `tournament_id` (richiesto): ID torneo
- `user_id` (richiesto): ID utente

**Response**:
```json
{
  "success": true
}
```

---

## Gestione Tornei - Operazioni Avanzate

### `POST /api/tournaments/:id/start`

Avvia torneo (cambia status da 'Aperto' a 'In Corso').

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Response**:
```json
{
  "tournament": {
    "id": "uuid",
    "status": "In Corso",
    "current_phase": "gironi"
  }
}
```

### `POST /api/tournaments/:id/generate-groups`

Genera gironi per torneo tipo 'girone_eliminazione'.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Note**:
- Crea `num_groups` gironi (Girone A, B, C, ...)
- Assegna partecipanti in modo bilanciato
- Imposta seed

**Response**:
```json
{
  "groups": [
    {
      "id": "uuid",
      "group_name": "Girone A",
      "participants": [
        {
          "id": "uuid",
          "user": {
            "full_name": "Mario Rossi"
          },
          "seed": 1
        }
      ]
    }
  ]
}
```

### `POST /api/tournaments/:id/group-matches`

Genera partite per fase a gironi.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Body**:
```json
{
  "matchesPerPlayer": 2
}
```

**Note**:
- Crea partite all-vs-all all'interno di ogni girone
- Round-robin se `matchesPerPlayer` non specificato (tutti contro tutti)

**Response**:
```json
{
  "matches": [
    {
      "id": "uuid",
      "phase": "gironi",
      "round_name": "Girone A - Giornata 1",
      "player1": { "full_name": "Mario Rossi" },
      "player2": { "full_name": "Luigi Bianchi" },
      "status": "programmata"
    }
  ]
}
```

### `POST /api/tournaments/:id/generate-bracket`

Genera tabellone eliminazione diretta.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Note**:
- Per torneo tipo 'eliminazione_diretta'
- Crea bracket completo (ottavi, quarti, semifinali, finale)
- Seeding automatico se disponibile

**Response**:
```json
{
  "bracket": {
    "rounds": [
      {
        "round_name": "Ottavi di Finale",
        "matches": [...]
      },
      {
        "round_name": "Quarti di Finale",
        "matches": [...]
      }
    ]
  }
}
```

### `POST /api/tournaments/:id/advance-from-groups`

Avanza migliori partecipanti dai gironi alla fase eliminazione.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Note**:
- Seleziona top `teams_advancing` per girone
- Cambia `current_phase` da 'gironi' a 'eliminazione'
- Pronto per generare bracket eliminazione

**Response**:
```json
{
  "advanced": [
    {
      "id": "uuid",
      "user": { "full_name": "Mario Rossi" },
      "group": { "group_name": "Girone A" },
      "group_position": 1
    }
  ]
}
```

### `GET /api/tournaments/:id/matches`

Ottiene tutte le partite di un torneo.

**Auth**: Non richiesta

**Query Parameters**:
- `phase` (opzionale): 'gironi' o 'eliminazione'
- `status` (opzionale): filtra per status partita

**Response**:
```json
{
  "matches": [
    {
      "id": "uuid",
      "phase": "eliminazione",
      "round_name": "Finale",
      "round_number": 4,
      "match_number": 1,
      "player1": {
        "id": "uuid",
        "user": { "full_name": "Mario Rossi" }
      },
      "player2": {
        "id": "uuid",
        "user": { "full_name": "Luigi Bianchi" }
      },
      "player1_score": 2,
      "player2_score": 1,
      "score_details": {
        "sets": [
          { "p1": 6, "p2": 4 },
          { "p1": 3, "p2": 6 },
          { "p1": 6, "p2": 3 }
        ]
      },
      "winner_id": "uuid",
      "status": "completata",
      "court": "Campo 1",
      "scheduled_at": "2025-01-20T15:00:00Z"
    }
  ]
}
```

### `PATCH /api/tournaments/:id/matches/:matchId`

Aggiorna risultato partita.

**Auth**: Richiesta  
**Ruoli**: admin, gestore, maestro

**Body**:
```json
{
  "player1_score": 2,
  "player2_score": 1,
  "score_details": {
    "sets": [
      { "p1": 6, "p2": 4 },
      { "p1": 3, "p6": 6 },
      { "p1": 6, "p2": 3 }
    ]
  },
  "winner_id": "uuid",
  "status": "completata"
}
```

**Note**:
- Trigger automatico aggiorna statistiche partecipanti
- Calcola punti in classifica gironi
- Aggiorna bracket eliminazione automaticamente

**Response**:
```json
{
  "match": {
    "id": "uuid",
    "player1_score": 2,
    "player2_score": 1,
    "status": "completata",
    "winner_id": "uuid"
  }
}
```

### `GET /api/tournaments/:id/groups`

Ottiene classifiche dei gironi.

**Auth**: Non richiesta

**Response**:
```json
{
  "groups": [
    {
      "id": "uuid",
      "group_name": "Girone A",
      "standings": [
        {
          "position": 1,
          "participant": {
            "id": "uuid",
            "user": { "full_name": "Mario Rossi" }
          },
          "stats": {
            "points": 6,
            "matches_played": 3,
            "matches_won": 3,
            "matches_lost": 0,
            "sets_won": 6,
            "sets_lost": 1,
            "set_difference": 5
          }
        }
      ]
    }
  ]
}
```

---

## Prenotazioni

### `GET /api/bookings`

Ottiene prenotazioni utente o di un periodo.

**Auth**: Richiesta

**Query Parameters**:
- `start_date` (opzionale): Data inizio (ISO 8601)
- `end_date` (opzionale): Data fine (ISO 8601)
- `court` (opzionale): Filtra per campo

**Response**:
```json
{
  "bookings": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "court": "Campo 1",
      "type": "campo",
      "start_time": "2025-01-15T14:00:00Z",
      "end_time": "2025-01-15T15:00:00Z",
      "user": {
        "full_name": "Mario Rossi"
      },
      "coach": {
        "full_name": "Paolo Verdi"
      }
    }
  ]
}
```

### `POST /api/bookings`

Crea nuova prenotazione.

**Auth**: Richiesta

**Body**:
```json
{
  "court": "Campo 1",
  "type": "campo",
  "start_time": "2025-01-15T14:00:00Z",
  "end_time": "2025-01-15T15:00:00Z",
  "coach_id": "uuid"
}
```

**Validation**:
- end_time > start_time
- Nessuna sovrapposizione su stesso campo (gestito da DB constraint)
- Durata minima/massima

**Response**:
```json
{
  "booking": {
    "id": "uuid",
    "court": "Campo 1",
    "start_time": "2025-01-15T14:00:00Z",
    "end_time": "2025-01-15T15:00:00Z"
  }
}
```

### `DELETE /api/bookings/:id`

Elimina prenotazione.

**Auth**: Richiesta  
**Permissions**: Proprietario o Admin/Gestore

**Response**:
```json
{
  "success": true
}
```

---

## Corsi

### `GET /api/courses`

Ottiene lista corsi attivi.

**Auth**: Non richiesta

**Query Parameters**:
- `active` (opzionale): true/false (default: true)
- `level` (opzionale): 'principiante', 'intermedio', 'avanzato'
- `age_group` (opzionale): 'bambini', 'junior', 'adulti', 'senior'

**Response**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Corso Base Tennis",
      "description": "Corso per principianti",
      "coach": {
        "full_name": "Paolo Verdi"
      },
      "start_date": "2025-02-01",
      "end_date": "2025-04-30",
      "schedule": "Lunedì e Mercoledì 18:00-19:00",
      "max_participants": 10,
      "current_participants": 7,
      "price": 150.00,
      "level": "principiante",
      "age_group": "adulti",
      "is_active": true
    }
  ]
}
```

### `POST /api/courses`

Crea nuovo corso.

**Auth**: Richiesta  
**Ruoli**: admin, gestore, maestro

**Body**:
```json
{
  "title": "Nuovo Corso",
  "description": "Descrizione corso",
  "coach_id": "uuid",
  "start_date": "2025-02-01",
  "end_date": "2025-04-30",
  "schedule": "Lun/Mer 18:00-19:00",
  "max_participants": 10,
  "price": 150.00,
  "level": "principiante",
  "age_group": "adulti"
}
```

---

## Iscrizioni Corsi

### `POST /api/enrollments`

Iscrive utente a un corso.

**Auth**: Richiesta

**Body**:
```json
{
  "course_id": "uuid"
}
```

**Validation**:
- Corso non pieno
- Utente non già iscritto
- Corso attivo

**Response**:
```json
{
  "enrollment": {
    "id": "uuid",
    "course_id": "uuid",
    "user_id": "uuid",
    "status": "pending",
    "payment_status": "pending"
  }
}
```

### `GET /api/enrollments`

Ottiene iscrizioni utente.

**Auth**: Richiesta

**Response**:
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "course": {
        "title": "Corso Base Tennis",
        "start_date": "2025-02-01"
      },
      "status": "confirmed",
      "payment_status": "paid",
      "enrolled_at": "2025-01-10T00:00:00Z"
    }
  ]
}
```

---

## News

### `GET /api/news`

Ottiene news pubblicate.

**Auth**: Non richiesta

**Query Parameters**:
- `category` (opzionale): Filtra per categoria
- `limit` (opzionale): Limita risultati (default: 10)

**Response**:
```json
{
  "news": [
    {
      "id": "uuid",
      "title": "Nuovo Torneo Open",
      "category": "Tornei",
      "summary": "Iscrizioni aperte per il torneo...",
      "image_url": "https://...",
      "date": "2025-01-15T00:00:00Z",
      "published": true
    }
  ]
}
```

### `POST /api/news`

Crea nuova news.

**Auth**: Richiesta  
**Ruoli**: admin, gestore

**Body**:
```json
{
  "title": "Nuova News",
  "category": "Generale",
  "summary": "Testo della news...",
  "image_url": "https://...",
  "published": true
}
```

---

## Messaggistica

### `GET /api/conversations`

Ottiene conversazioni utente.

**Auth**: Richiesta

**Response**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Chat con Paolo",
      "is_group": false,
      "last_message_preview": "Ciao, come stai?",
      "last_message_at": "2025-01-15T10:00:00Z",
      "unread_count": 2,
      "participants": [
        {
          "user": {
            "full_name": "Paolo Verdi"
          }
        }
      ]
    }
  ]
}
```

### `GET /api/conversations/:id/messages`

Ottiene messaggi di una conversazione.

**Auth**: Richiesta  
**Permissions**: Deve essere partecipante

**Query Parameters**:
- `limit` (opzionale): Numero messaggi (default: 50)
- `before` (opzionale): Messaggi prima di questo timestamp (pagination)

**Response**:
```json
{
  "messages": [
    {
      "id": "uuid",
      "sender": {
        "full_name": "Mario Rossi"
      },
      "content": "Ciao!",
      "message_type": "text",
      "created_at": "2025-01-15T10:00:00Z",
      "is_edited": false,
      "is_deleted": false
    }
  ]
}
```

### `POST /api/conversations/:id/messages`

Invia messaggio in conversazione.

**Auth**: Richiesta  
**Permissions**: Deve essere partecipante

**Body**:
```json
{
  "content": "Testo del messaggio",
  "message_type": "text"
}
```

**Response**:
```json
{
  "message": {
    "id": "uuid",
    "content": "Testo del messaggio",
    "created_at": "2025-01-15T10:05:00Z"
  }
}
```

---

## Email

### `POST /api/email/send`

Invia email usando template.

**Auth**: Richiesta (Service Role)  
**Ruoli**: admin, gestore

**Body**:
```json
{
  "to": "user@example.com",
  "template_name": "booking_confirmation",
  "data": {
    "user_name": "Mario Rossi",
    "court": "Campo 1",
    "date": "15/01/2025",
    "time": "14:00"
  }
}
```

**Response**:
```json
{
  "email_log_id": "uuid",
  "status": "sent"
}
```

---

## Staff

### `GET /api/staff`

Ottiene lista staff academy.

**Auth**: Non richiesta

**Response**:
```json
{
  "staff": [
    {
      "id": "uuid",
      "full_name": "Paolo Verdi",
      "role": "Maestro Principale",
      "bio": "15 anni di esperienza...",
      "image_url": "https://...",
      "email": "paolo@academy.com",
      "phone": "+39 123456789",
      "is_active": true
    }
  ]
}
```

---

## Subscriptions (Homepage)

### `GET /api/subscriptions`

Ottiene piani abbonamento.

**Auth**: Non richiesta

**Response**:
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "title": "Monosettimanale",
      "description": "1 ora di campo a settimana",
      "price": 25.00,
      "duration": "1 settimana",
      "features": ["1h campo/settimana", "Accesso wifi", "Parcheggio"],
      "is_active": true
    }
  ]
}
```

---

## Webhooks

### `POST /api/webhooks/email`

Webhook Resend per tracking eventi email.

**Auth**: Signature verification Resend

**Body**:
```json
{
  "type": "email.delivered",
  "data": {
    "email_id": "xxx",
    "to": "user@example.com"
  }
}
```

**Eventi supportati**:
- `email.sent`
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.failed`

---

## Rate Limiting

Non implementato attualmente. Considerare per produzione:
- Max 100 richieste/minuto per IP
- Max 1000 richieste/ora per utente autenticato

## CORS

Configurato per:
- Development: `http://localhost:3000`
- Production: Domain configurato in Vercel

---

**Fine Documentazione API**
