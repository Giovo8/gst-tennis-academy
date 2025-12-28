# GST Tennis Academy - API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require Supabase JWT token in Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

Get token via Supabase Auth:
```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

## Error Responses

Standard error format:
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Endpoints

### Bookings

#### `GET /api/bookings`
Retrieve all bookings (filtered by user role).

**Auth**: Required  
**Roles**: All

**Query Parameters**:
- `date` (optional): Filter by date (YYYY-MM-DD)
- `status` (optional): Filter by status (`pending`, `confirmed`, `cancelled`)
- `athlete_id` (optional, admin/gestore): Filter by athlete

**Response**:
```json
{
  "bookings": [
    {
      "id": "uuid",
      "athlete_id": "uuid",
      "athlete_name": "Mario Rossi",
      "date": "2024-12-30",
      "time": "10:00",
      "court": "Campo 1",
      "type": "lezione_privata",
      "status": "confirmed",
      "coach_id": "uuid",
      "coach_name": "Luigi Bianchi",
      "coach_confirmed": true,
      "manager_confirmed": true,
      "created_at": "2024-12-28T10:00:00Z"
    }
  ]
}
```

#### `POST /api/bookings`
Create new booking.

**Auth**: Required  
**Roles**: atleta, coach, maestro, gestore, admin

**Body**:
```json
{
  "date": "2024-12-30",
  "time": "10:00",
  "court": "Campo 1",
  "type": "lezione_privata",
  "coach_id": "uuid",
  "notes": "Preferenza per allenamento servizio"
}
```

**Response** (201):
```json
{
  "booking": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-12-28T10:00:00Z"
  },
  "message": "Prenotazione creata. In attesa di conferma."
}
```

#### `PUT /api/bookings/:id`
Update booking status (confirm/cancel).

**Auth**: Required  
**Roles**: coach (own bookings), gestore, admin

**Body**:
```json
{
  "action": "confirm",
  "role": "coach"
}
```

**Actions**:
- `confirm`: Confirm booking (coach or manager)
- `cancel`: Cancel booking

**Response**:
```json
{
  "booking": {
    "id": "uuid",
    "status": "confirmed",
    "coach_confirmed": true,
    "manager_confirmed": true
  },
  "message": "Prenotazione confermata"
}
```

---

### Tournaments

#### `GET /api/tournaments`
List all tournaments.

**Auth**: Optional (public endpoint)

**Query Parameters**:
- `status` (optional): `upcoming`, `ongoing`, `completed`
- `limit` (optional): Number of results (default: 50)

**Response**:
```json
{
  "tournaments": [
    {
      "id": "uuid",
      "name": "Torneo Estivo 2024",
      "description": "Torneo aperto categoria Open",
      "start_date": "2024-07-01",
      "end_date": "2024-07-07",
      "type": "eliminazione_diretta",
      "status": "upcoming",
      "max_participants": 16,
      "current_participants": 8,
      "registration_deadline": "2024-06-25",
      "created_at": "2024-06-01T10:00:00Z"
    }
  ]
}
```

#### `GET /api/tournaments/:id`
Get tournament details with participants and matches.

**Auth**: Optional

**Response**:
```json
{
  "tournament": {
    "id": "uuid",
    "name": "Torneo Estivo 2024",
    "type": "eliminazione_diretta",
    "status": "ongoing",
    "current_phase": "semifinali"
  },
  "participants": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Mario Rossi",
      "status": "confirmed",
      "seed": 1,
      "group": null
    }
  ],
  "matches": [
    {
      "id": "uuid",
      "round": "semifinali",
      "player1_id": "uuid",
      "player1_name": "Mario Rossi",
      "player2_id": "uuid",
      "player2_name": "Luigi Bianchi",
      "score": "6-4, 6-3",
      "winner_id": "uuid",
      "completed": true,
      "scheduled_date": "2024-07-05"
    }
  ]
}
```

#### `POST /api/tournaments`
Create new tournament.

**Auth**: Required  
**Roles**: admin, gestore

**Body**:
```json
{
  "name": "Torneo Autunnale 2024",
  "description": "Torneo categoria Intermedio",
  "start_date": "2024-09-15",
  "end_date": "2024-09-22",
  "type": "gironi",
  "max_participants": 16,
  "registration_deadline": "2024-09-10",
  "entry_fee": 25.00,
  "prize": "Coppa + Abbonamento trimestrale"
}
```

**Types**:
- `gironi`: Group stage tournament
- `eliminazione_diretta`: Single elimination bracket

**Response** (201):
```json
{
  "tournament": {
    "id": "uuid",
    "name": "Torneo Autunnale 2024",
    "status": "upcoming",
    "created_at": "2024-08-01T10:00:00Z"
  }
}
```

#### `POST /api/tournaments/:id/participants`
Register for tournament.

**Auth**: Required  
**Roles**: atleta

**Body**:
```json
{
  "notes": "Prima partecipazione"
}
```

**Response** (201):
```json
{
  "participant": {
    "id": "uuid",
    "status": "pending",
    "message": "Iscrizione inviata. In attesa di conferma."
  }
}
```

#### `PUT /api/tournaments/:tournamentId/participants/:participantId`
Update participant status.

**Auth**: Required  
**Roles**: admin, gestore

**Body**:
```json
{
  "status": "confirmed",
  "seed": 1
}
```

**Statuses**:
- `pending`: Awaiting confirmation
- `confirmed`: Confirmed participant
- `rejected`: Registration rejected

**Response**:
```json
{
  "participant": {
    "id": "uuid",
    "status": "confirmed",
    "seed": 1
  }
}
```

#### `POST /api/tournaments/:id/matches`
Create or update match result.

**Auth**: Required  
**Roles**: admin, gestore, coach

**Body**:
```json
{
  "player1_id": "uuid",
  "player2_id": "uuid",
  "sets": [
    {
      "player1_games": 6,
      "player2_games": 4,
      "player1_tiebreak": null,
      "player2_tiebreak": null
    },
    {
      "player1_games": 6,
      "player2_games": 3,
      "player1_tiebreak": null,
      "player2_tiebreak": null
    }
  ],
  "winner_id": "uuid",
  "scheduled_date": "2024-07-05"
}
```

**Response** (201):
```json
{
  "match": {
    "id": "uuid",
    "score": "6-4, 6-3",
    "winner_id": "uuid",
    "completed": true
  },
  "stats_updated": true,
  "message": "Match result saved and athlete stats updated"
}
```

---

### Email

#### `GET /api/email/logs`
Get email delivery logs.

**Auth**: Required  
**Roles**: admin

**Query Parameters**:
- `limit` (optional): Number of records (default: 50, max: 200)
- `status` (optional): Filter by status (`sent`, `delivered`, `opened`, `clicked`, `bounced`, `failed`)
- `category` (optional): Filter by category (`transactional`, `notifications`, `marketing`, `system`)

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "recipient": "atleta@example.com",
      "subject": "Conferma Prenotazione Campo 1",
      "template_name": "booking-confirmation",
      "category": "transactional",
      "status": "delivered",
      "sent_at": "2024-12-28T10:00:00Z",
      "delivered_at": "2024-12-28T10:00:05Z",
      "opened_at": "2024-12-28T11:30:00Z",
      "clicked_at": null,
      "error_message": null
    }
  ],
  "stats": {
    "total": 150,
    "delivered": 145,
    "opened": 89,
    "clicked": 34,
    "bounced": 2,
    "failed": 3
  }
}
```

#### `POST /api/email/scheduler`
Trigger email scheduler (cron job).

**Auth**: Required (CRON_SECRET header)  
**Roles**: System

**Headers**:
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response**:
```json
{
  "message": "Scheduler executed successfully",
  "emails_sent": 12,
  "details": {
    "booking_reminders": 8,
    "tournament_notifications": 4
  }
}
```

#### `POST /api/webhooks/email`
Resend webhook endpoint (handles email events).

**Auth**: Required (Resend webhook signature)  
**Roles**: System

**Headers**:
```
svix-id: msg_xxxxx
svix-timestamp: 1234567890
svix-signature: v1,xxxxx
```

**Body** (example):
```json
{
  "type": "email.delivered",
  "created_at": "2024-12-28T10:00:00Z",
  "data": {
    "email_id": "xxxxx",
    "to": "atleta@example.com",
    "subject": "Conferma Prenotazione"
  }
}
```

**Response**:
```json
{
  "received": true
}
```

---

### Courses

#### `GET /api/courses`
List all courses.

**Auth**: Optional

**Response**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Corso Principianti",
      "description": "Corso base per chi inizia",
      "level": "principiante",
      "duration": "8 settimane",
      "price": 200.00,
      "max_students": 8,
      "current_students": 5,
      "schedule": "Martedì e Giovedì 18:00-19:00",
      "start_date": "2024-10-01"
    }
  ]
}
```

#### `POST /api/enrollments`
Enroll in course.

**Auth**: Required  
**Roles**: atleta

**Body**:
```json
{
  "course_id": "uuid",
  "notes": "Nessuna esperienza precedente"
}
```

**Response** (201):
```json
{
  "enrollment": {
    "id": "uuid",
    "status": "pending",
    "message": "Iscrizione inviata. Ti contatteremo presto."
  }
}
```

---

### Messages (Chat)

#### `GET /api/messages`
Get conversations and messages.

**Auth**: Required  
**Roles**: All

**Query Parameters**:
- `conversation_id` (optional): Specific conversation
- `limit` (optional): Messages per page (default: 50)

**Response**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "participant_ids": ["uuid1", "uuid2"],
      "participant_names": ["Mario Rossi", "Coach Luigi"],
      "last_message": "Ci vediamo domani alle 10",
      "last_message_at": "2024-12-28T15:30:00Z",
      "unread_count": 2
    }
  ],
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender_name": "Mario Rossi",
      "content": "Buongiorno, è disponibile per una lezione?",
      "created_at": "2024-12-28T10:00:00Z",
      "read": false
    }
  ]
}
```

#### `POST /api/messages`
Send new message.

**Auth**: Required  
**Roles**: All

**Body**:
```json
{
  "recipient_id": "uuid",
  "content": "Grazie, ci vediamo domani!"
}
```

**Response** (201):
```json
{
  "message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "created_at": "2024-12-28T10:05:00Z"
  }
}
```

---

### Admin

#### `GET /api/admin/users`
List all users with roles.

**Auth**: Required  
**Roles**: admin

**Query Parameters**:
- `role` (optional): Filter by role
- `search` (optional): Search by name/email

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "atleta@example.com",
      "full_name": "Mario Rossi",
      "role": "atleta",
      "created_at": "2024-01-15T10:00:00Z",
      "last_sign_in": "2024-12-28T09:00:00Z",
      "profile_completion": 85
    }
  ]
}
```

#### `PUT /api/admin/users/:id`
Update user role.

**Auth**: Required  
**Roles**: admin

**Body**:
```json
{
  "role": "coach"
}
```

**Roles**:
- `atleta`
- `coach`
- `maestro`
- `gestore`
- `admin`

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "role": "coach",
    "updated_at": "2024-12-28T10:00:00Z"
  }
}
```

---

## Rate Limiting

Current limits (may be adjusted):
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Admin: Unlimited

Exceeded limit returns `429 Too Many Requests`.

---

## Webhooks

### Email Events (Resend)
**URL**: `/api/webhooks/email`  
**Method**: POST  
**Auth**: Resend signature verification

Events:
- `email.sent`: Email sent to provider
- `email.delivered`: Email delivered to inbox
- `email.opened`: Email opened by recipient
- `email.clicked`: Link clicked in email
- `email.bounced`: Email bounced
- `email.complained`: Spam complaint

---

## Testing

### Using cURL

```bash
# Get tournaments (public)
curl https://your-domain.com/api/tournaments

# Create booking (authenticated)
curl -X POST https://your-domain.com/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-12-30","time":"10:00","court":"Campo 1","type":"campo_libero"}'

# Admin: List users
curl https://your-domain.com/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Using Postman

Import collection: `docs/postman_collection.json` (to be created)

---

## Versioning

Current Version: **v1**

Future breaking changes will be versioned: `/api/v2/...`

---

*Last Updated: 2024-12-28*  
*GST Tennis Academy API Documentation*
