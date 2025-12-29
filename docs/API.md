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

### Service Role Pattern (Admin APIs)

Admin endpoints use Supabase Service Role Key for bypassing RLS:
- `/api/admin/*` - Require service role authentication
- User must have `admin` or `gestore` role verified via profile table
- Service role key stored in `SUPABASE_SERVICE_ROLE_KEY` env variable

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
- `409`: Conflict (duplicate/capacity exceeded)
- `500`: Internal Server Error

---

## Endpoints

### Users

#### `GET /api/users`
Get list of users for booking/tournament enrollment. Used in BookingCalendar.

**Auth**: Required  
**Roles**: admin, gestore, maestro

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

**Notes**:
- Filters users to only include: atleta, coach, maestro, admin, gestore
- Case-insensitive role matching

---

### Admin

#### `GET /api/admin/users`
List all users with full profile data. Uses Service Role for RLS bypass.

**Auth**: Required (Service Role)  
**Roles**: admin, gestore

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
      "avatar_url": "https://...",
      "phone": "+39 123 456 7890",
      "created_at": "2024-01-15T10:00:00Z",
      "last_sign_in_at": "2024-12-28T09:00:00Z"
    }
  ]
}
```

**Errors**:
- `401`: Not authenticated
- `403`: Insufficient permissions (not admin/gestore)

#### `POST /api/admin/users`
Create new user account with Supabase Admin API.

**Auth**: Required (Service Role)  
**Roles**: admin, gestore

**Body**:
```json
{
  "email": "nuovo@example.com",
  "password": "password123",
  "full_name": "Nuovo Utente",
  "role": "atleta"
}
```

**Validations**:
- Email format must be valid
- Password minimum 6 characters
- Valid roles: `atleta`, `maestro`, `gestore`, `admin`
- Gestore cannot create admin users
- Email must be unique

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "nuovo@example.com",
    "role": "atleta"
  }
}
```

**Errors**:
- `400`: Validation error or email already exists
- `403`: Gestore trying to create admin

#### `PATCH /api/admin/users`
Update user role or profile.

**Auth**: Required (Service Role)  
**Roles**: admin, gestore

**Body**:
```json
{
  "userId": "uuid",
  "role": "coach",
  "full_name": "Mario Rossi Updated"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "role": "coach",
    "updated_at": "2024-12-29T10:00:00Z"
  }
}
```

#### `DELETE /api/admin/users`
Delete user account.

**Auth**: Required (Service Role)  
**Roles**: admin

**Body**:
```json
{
  "userId": "uuid"
}
```

**Response**:
```json
{
  "message": "Utente eliminato con successo"
}
```

#### `GET /api/admin/stats`
Get dashboard statistics for admin panel.

**Auth**: Required  
**Roles**: admin, gestore

**Response**:
```json
{
  "totalUsers": 150,
  "totalBookings": 1250,
  "todayBookings": 8,
  "totalTournaments": 12,
  "activeTournaments": 2
}
```

---

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

---

### Tournaments

#### `GET /api/tournaments`
List all tournaments with filters.

**Auth**: Optional (public endpoint)

**Query Parameters**:
- `id` (optional): Get specific tournament by ID
- `upcoming` (optional): `true` to get only upcoming tournaments
- `type` (optional): Filter by competition type (`torneo` or `campionato`)

**Response** (list):
```json
{
  "tournaments": [
    {
      "id": "uuid",
      "title": "Torneo Estivo 2024",
      "start_date": "2024-07-01T00:00:00Z",
      "end_date": "2024-07-07T00:00:00Z",
      "competition_type": "torneo",
      "format": "eliminazione_diretta",
      "status": "Aperto",
      "current_phase": "iscrizioni",
      "max_participants": 16,
      "created_at": "2024-06-01T10:00:00Z"
    }
  ]
}
```

**Response** (single with id):
```json
{
  "tournament": {
    "id": "uuid",
    "title": "Torneo Estivo 2024",
    "format": "eliminazione_diretta",
    "status": "In Corso"
  },
  "current_participants": 12
}
```

**Tournament Formats**:
- `eliminazione_diretta`: Single elimination bracket
- `round_robin`: Round-robin (everyone plays everyone)
- `girone_eliminazione`: Groups + knockout

**Competition Types**:
- `torneo`: Tournament (single event)
- `campionato`: Championship (league play)

#### `POST /api/tournaments`
Create new tournament.

**Auth**: Required  
**Roles**: admin, gestore

**Body**:
```json
{
  "title": "Torneo Autunnale 2024",
  "start_date": "2024-09-15",
  "end_date": "2024-09-22",
  "competition_type": "torneo",
  "format": "eliminazione_diretta",
  "max_participants": 16,
  "status": "Aperto"
}
```

**Validations**:
- `max_participants` for `eliminazione_diretta` must be power of 2 (2, 4, 8, 16, 32, 64, 128)
- `max_participants` for `round_robin` or `girone_eliminazione` must be >= 3
- `competition_type` must be `torneo` or `campionato`
- `format` must be valid format

**Response** (201):
```json
{
  "tournament": {
    "id": "uuid",
    "title": "Torneo Autunnale 2024",
    "status": "Aperto",
    "created_at": "2024-08-01T10:00:00Z"
  }
}
```

**Errors**:
- `400`: Invalid format or max_participants
- `403`: Insufficient permissions

#### `PUT /api/tournaments`
Update tournament details.

**Auth**: Required  
**Roles**: admin, gestore

**Query Parameters**:
- `id` (required): Tournament ID

**Body**:
```json
{
  "title": "Torneo Autunnale 2024 - Updated",
  "status": "Chiuso",
  "end_date": "2024-09-23"
}
```

**Response**:
```json
{
  "tournament": {
    "id": "uuid",
    "title": "Torneo Autunnale 2024 - Updated",
    "updated_at": "2024-12-29T10:00:00Z"
  }
}
```

#### `DELETE /api/tournaments`
Delete tournament.

**Auth**: Required  
**Roles**: admin, gestore

**Query Parameters**:
- `id` (required): Tournament ID

**Response**:
```json
{
  "message": "Torneo eliminato con successo"
}
```

#### `POST /api/tournaments/create`
Alias for POST /api/tournaments. Creates new tournament.

**Auth**: Required  
**Roles**: admin, gestore

(Same as POST /api/tournaments)

#### `POST /api/tournaments/[id]/start`
Start tournament and initialize based on format.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/start`

**Behavior**:
- `eliminazione_diretta`: Creates bracket
- `girone_eliminazione`: Assigns participants to groups
- `campionato`: Initializes standings

**Validations**:
- Tournament must be in `iscrizioni` phase
- Minimum participants: 2 for eliminazione_diretta, 3 for others
- Cannot start already started tournament

**Response**:
```json
{
  "message": "Torneo avviato con successo",
  "tournament": {
    "id": "uuid",
    "current_phase": "eliminazione",
    "status": "In Corso"
  }
}
```

**Errors**:
- `400`: Not enough participants or wrong phase
- `403`: Insufficient permissions
- `404`: Tournament not found

#### `POST /api/tournaments/[id]/generate-groups`
Generate groups for girone_eliminazione format.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/generate-groups`

**Requirements**:
- Tournament type must be `girone_eliminazione`
- Tournament must be in `gironi` phase
- Minimum 4 participants
- Groups not already generated

**Algorithm**:
- Snake draft distribution for fairness
- Groups named A, B, C, D, etc.
- Creates round-robin matches within each group

**Response**:
```json
{
  "message": "Gironi generati con successo",
  "groups": [
    {
      "id": "uuid",
      "group_name": "Girone A",
      "group_order": 1
    }
  ],
  "matches_created": 24
}
```

**Errors**:
- `400`: Wrong tournament type, phase, or not enough participants
- `404`: Tournament not found

#### `POST /api/tournaments/[id]/generate-championship`
Generate championship calendar (round-robin for all participants).

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/generate-championship`

**Requirements**:
- Tournament type must be `campionato`
- Tournament in `registration` or `not_started` phase
- Minimum 2 participants
- Matches not already generated

**Response**:
```json
{
  "success": true,
  "message": "Calendario generato con successo",
  "tournament": {
    "id": "uuid",
    "phase": "in_progress"
  },
  "matches_created": 45
}
```

**Errors**:
- `400`: Wrong type, phase, or not enough participants
- `403`: Insufficient permissions

#### `POST /api/tournaments/[id]/knockout`
Advance tournament to knockout phase (after groups).

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/knockout`

**Requirements**:
- Tournament must be in group phase
- All group matches must be completed
- Extracts top 2 from each group

**Response**:
```json
{
  "message": "Fase eliminazione avviata",
  "qualified_participants": 8,
  "bracket_created": true
}
```

#### `GET /api/tournaments/[id]/group-matches`
Get all matches for tournament or specific group.

**Auth**: Optional

**URL**: `/api/tournaments/{tournamentId}/group-matches`

**Query Parameters**:
- `group_id` (optional): Filter by group
- `phase` (optional): Filter by phase (`gironi` or `eliminazione`)

**Response**:
```json
{
  "matches": [
    {
      "id": "uuid",
      "tournament_id": "uuid",
      "phase": "gironi",
      "round_number": 1,
      "match_number": 1,
      "player1_id": "uuid",
      "player2_id": "uuid",
      "player1_score": [6, 6],
      "player2_score": [4, 3],
      "winner_id": "uuid",
      "status": "completed",
      "scheduled_date": "2024-07-01"
    }
  ]
}
```

#### `POST /api/tournaments/[id]/group-matches`
Create group matches (usually called automatically).

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/group-matches`

**Body**:
```json
{
  "group_id": "uuid",
  "round_robin": true
}
```

**Response**:
```json
{
  "matches_created": 6,
  "message": "Partite create con successo"
}
```

#### `GET /api/tournaments/[id]/matches/[matchId]`
Get single match details with full tennis scoring.

**Auth**: Optional

**URL**: `/api/tournaments/{tournamentId}/matches/{matchId}`

**Response**:
```json
{
  "success": true,
  "match": {
    "id": "uuid",
    "tournament": {
      "title": "Torneo Estivo",
      "match_format": "best_of_3",
      "surface_type": "terra"
    },
    "player1": {
      "id": "uuid",
      "profiles": {
        "full_name": "Mario Rossi",
        "avatar_url": "https://..."
      }
    },
    "player2": {
      "id": "uuid",
      "profiles": {
        "full_name": "Luigi Bianchi"
      }
    },
    "sets": [
      {
        "player1_score": 6,
        "player2_score": 4,
        "player1_tiebreak": null,
        "player2_tiebreak": null
      }
    ],
    "winner_id": "uuid",
    "status": "completed"
  }
}
```

#### `PUT /api/tournaments/[id]/matches/[matchId]`
Update match score with tennis scoring validation.

**Auth**: Required  
**Roles**: admin, gestore, or match participants

**URL**: `/api/tournaments/{tournamentId}/matches/{matchId}`

**Body**:
```json
{
  "sets": [
    {
      "player1_score": 6,
      "player2_score": 4
    },
    {
      "player1_score": 7,
      "player2_score": 6,
      "player1_tiebreak": 7,
      "player2_tiebreak": 4
    }
  ]
}
```

**Tennis Scoring Validation**:
- Must win by 2 games (except 7-6 tiebreak)
- Minimum 6 games to win a set
- Determines winner based on `best_of` format (2 sets for best of 3, 3 sets for best of 5)

**Response**:
```json
{
  "success": true,
  "match": {
    "id": "uuid",
    "winner_id": "uuid",
    "status": "completed",
    "score_summary": "6-4, 7-6(7-4)"
  }
}
```

**Errors**:
- `400`: Invalid tennis scoring
- `403`: Not authorized to update this match

#### `PATCH /api/tournaments/[id]/matches/[matchId]`
Partial update of match (status, schedule).

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/matches/{matchId}`

**Body**:
```json
{
  "status": "in_progress",
  "scheduled_date": "2024-07-05"
}
```

**Response**:
```json
{
  "success": true,
  "match": {
    "id": "uuid",
    "status": "in_progress"
  }
}
```

#### `DELETE /api/tournaments/[id]/matches/[matchId]`
Delete match.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/tournaments/{tournamentId}/matches/{matchId}`

**Response**:
```json
{
  "success": true,
  "message": "Match eliminato"
}
```

#### `GET /api/tournaments/stats`
Get tournament statistics summary.

**Auth**: Optional

**Response**:
```json
{
  "total": 15,
  "active": 2,
  "completed": 10,
  "upcoming": 3,
  "totalParticipants": 180,
  "totalMatches": 456,
  "completedMatches": 420,
  "byType": {
    "torneo": 12,
    "campionato": 3
  }
}
```

---

---

### Tournament Participants

#### `GET /api/tournament_participants`
Get tournament participants with filters.

**Auth**: Optional

**Query Parameters**:
- `user_id` (optional): Filter by user
- `tournament_id` (optional): Filter by tournament

**Response**:
```json
{
  "participants": [
    {
      "id": "uuid",
      "tournament_id": "uuid",
      "user_id": "uuid",
      "seed": 1,
      "status": "accepted",
      "group_position": null,
      "stats": {},
      "created_at": "2024-06-15T10:00:00Z",
      "profiles": {
        "id": "uuid",
        "full_name": "Mario Rossi",
        "email": "mario@example.com"
      }
    }
  ]
}
```

#### `POST /api/tournament_participants`
Register user for tournament.

**Auth**: Required  
**Roles**: Any authenticated user (for self), gestore/admin (for others), maestro (for athletes only)

**Body**:
```json
{
  "user_id": "uuid",
  "tournament_id": "uuid"
}
```

**Permissions**:
- Users can register themselves
- `gestore` and `admin` can register anyone
- `maestro` can only register users with `atleta` role

**Validations**:
- Tournament must have available capacity
- User not already registered

**Response** (201):
```json
{
  "participant": {
    "id": "uuid",
    "user_id": "uuid",
    "tournament_id": "uuid",
    "status": "accepted"
  }
}
```

**Errors**:
- `403`: Insufficient permissions
- `404`: Tournament or user not found
- `409`: Tournament is full

#### `DELETE /api/tournament_participants`
Remove participant from tournament.

**Auth**: Required  
**Roles**: admin, gestore, or self (before tournament starts)

**Query Parameters** or **Body**:
```json
{
  "id": "uuid"
}
```

**Response**:
```json
{
  "message": "Partecipante rimosso con successo"
}
```

---

### Announcements

#### `GET /api/announcements`
Get published announcements with filters.

**Auth**: Optional (visibility-based filtering)

**Query Parameters**:
- `type` (optional): Filter by announcement_type
- `visibility` (optional): Filter by visibility
- `priority` (optional): Filter by priority
- `limit` (optional): Max results (default: 50)
- `include_expired` (optional): Include expired announcements (default: false)

**Response**:
```json
{
  "announcements": [
    {
      "id": "uuid",
      "title": "Torneo Estivo Aperto",
      "content": "Iscrizioni aperte fino al 20 giugno...",
      "announcement_type": "tournament",
      "priority": "high",
      "expiry_date": "2024-06-20T23:59:59Z",
      "visibility": "public",
      "is_published": true,
      "is_pinned": true,
      "view_count": 145,
      "image_url": "https://...",
      "link_url": "/tornei/123",
      "link_text": "Iscriviti ora",
      "created_at": "2024-06-01T10:00:00Z",
      "profiles": {
        "id": "uuid",
        "full_name": "Admin GST",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

**Announcement Types**:
- `general`: General announcements
- `tournament`: Tournament-related
- `event`: Events
- `maintenance`: System maintenance
- `news`: News updates

**Visibility Levels**:
- `public`: Everyone can see
- `members`: Only authenticated users
- `staff`: Only staff (coach, maestro, gestore, admin)
- `admin`: Only admin/gestore

**Priority**:
- `low`, `normal`, `high`, `urgent`

#### `POST /api/announcements`
Create new announcement.

**Auth**: Required  
**Roles**: admin, gestore

**Body**:
```json
{
  "title": "Nuovo Annuncio",
  "content": "Contenuto dell'annuncio...",
  "announcement_type": "general",
  "priority": "normal",
  "visibility": "public",
  "is_published": true,
  "is_pinned": false,
  "expiry_date": "2024-12-31T23:59:59Z",
  "image_url": "https://...",
  "link_url": "/path",
  "link_text": "Leggi di più"
}
```

**Response** (201):
```json
{
  "announcement": {
    "id": "uuid",
    "title": "Nuovo Annuncio",
    "created_at": "2024-12-29T10:00:00Z"
  }
}
```

#### `PUT /api/announcements/[id]`
Update announcement.

**Auth**: Required  
**Roles**: admin, gestore, or author

**URL**: `/api/announcements/{id}`

**Body**: Same as POST

**Response**:
```json
{
  "announcement": {
    "id": "uuid",
    "updated_at": "2024-12-29T10:05:00Z"
  }
}
```

#### `DELETE /api/announcements/[id]`
Delete announcement.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/announcements/{id}`

**Response**:
```json
{
  "message": "Annuncio eliminato"
}
```

---

### Messages & Conversations

#### `GET /api/conversations`
Get all conversations for current user.

**Auth**: Required  
**Roles**: All

**Response**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Chat con Coach Luigi",
      "is_group": false,
      "created_by": "uuid",
      "created_at": "2024-12-01T10:00:00Z",
      "last_message_at": "2024-12-28T15:30:00Z",
      "last_message_preview": "Ci vediamo domani alle 10",
      "unread_count": 2,
      "participants": [
        {
          "user_id": "uuid",
          "full_name": "Luigi Bianchi",
          "avatar_url": "https://...",
          "role": "coach"
        }
      ]
    }
  ]
}
```

#### `POST /api/conversations`
Create new conversation (1-on-1 or group).

**Auth**: Required  
**Roles**: All

**Body**:
```json
{
  "participant_ids": ["uuid1", "uuid2"],
  "title": "Chat Gruppo Torneo",
  "is_group": false
}
```

**Response** (201):
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Chat Gruppo Torneo",
    "created_at": "2024-12-29T10:00:00Z"
  }
}
```

#### `GET /api/messages`
Get messages for a conversation.

**Auth**: Required  
**Roles**: Conversation participants only

**Query Parameters**:
- `conversation_id` (required): Conversation ID
- `limit` (optional): Messages per page (default: 50)
- `before` (optional): Get messages before this timestamp

**Response**:
```json
{
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender_name": "Mario Rossi",
      "sender_avatar": "https://...",
      "content": "Buongiorno, è disponibile per una lezione?",
      "message_type": "text",
      "created_at": "2024-12-28T10:00:00Z",
      "read_at": null,
      "edited_at": null
    }
  ]
}
```

#### `POST /api/messages`
Send new message.

**Auth**: Required  
**Roles**: Conversation participants only

**Body**:
```json
{
  "conversation_id": "uuid",
  "content": "Grazie, ci vediamo domani!",
  "message_type": "text",
  "attachment_url": null,
  "reply_to_message_id": null
}
```

**Message Types**:
- `text`: Plain text message
- `image`: Image attachment
- `file`: File attachment
- `system`: System-generated message

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

**Errors**:
- `403`: Not a participant of the conversation

#### `PATCH /api/messages/[id]`
Mark message as read or edit content.

**Auth**: Required  
**Roles**: Recipient (mark read), Sender (edit)

**URL**: `/api/messages/{messageId}`

**Body**:
```json
{
  "read": true
}
```
or
```json
{
  "content": "Updated message content"
}
```

**Response**:
```json
{
  "message": {
    "id": "uuid",
    "read_at": "2024-12-29T10:00:00Z"
  }
}
```

---

### News & CMS

#### `GET /api/news`
Get published news articles.

**Auth**: Optional

**Query Parameters**:
- `all` (optional): `true` to include unpublished (admin only)

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Vittoria nel Torneo Regionale",
    "category": "risultati",
    "summary": "I nostri atleti conquistano il podio...",
    "content": "Full article content...",
    "image_url": "https://...",
    "date": "2024-12-15T00:00:00Z",
    "published": true,
    "created_at": "2024-12-15T10:00:00Z"
  }
]
```

#### `POST /api/news`
Create news article.

**Auth**: Required  
**Roles**: admin, gestore

**Body**:
```json
{
  "title": "Nuova Stagione 2025",
  "category": "annunci",
  "summary": "Inizia la nuova stagione...",
  "content": "Full content here...",
  "image_url": "https://...",
  "published": true
}
```

**Response** (201):
```json
{
  "news": {
    "id": "uuid",
    "title": "Nuova Stagione 2025",
    "created_at": "2024-12-29T10:00:00Z"
  }
}
```

#### `PUT /api/news/[id]`
Update news article.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/news/{id}`

**Body**: Same as POST

**Response**:
```json
{
  "news": {
    "id": "uuid",
    "updated_at": "2024-12-29T10:05:00Z"
  }
}
```

#### `DELETE /api/news/[id]`
Delete news article.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/news/{id}`

**Response**:
```json
{
  "message": "Articolo eliminato"
}
```

#### `GET /api/hero-content`
Get hero section content for homepage.

**Auth**: Optional

**Response**:
```json
{
  "hero_content": {
    "id": "uuid",
    "title": "Benvenuti alla GST Tennis Academy",
    "subtitle": "Eccellenza nel tennis dal 1995",
    "cta_text": "Scopri di più",
    "cta_link": "/about"
  }
}
```

#### `PUT /api/hero-content`
Update hero section content.

**Auth**: Required  
**Roles**: admin, gestore

**Body**:
```json
{
  "title": "Updated Title",
  "subtitle": "Updated Subtitle",
  "cta_text": "Nuova CTA",
  "cta_link": "/new-link"
}
```

**Response**:
```json
{
  "hero_content": {
    "id": "uuid",
    "updated_at": "2024-12-29T10:00:00Z"
  }
}
```

#### `GET /api/homepage-sections`
Get all homepage sections configuration.

**Auth**: Optional

**Response**:
```json
{
  "sections": [
    {
      "id": "uuid",
      "section_name": "tornei",
      "title": "Tornei e Competizioni",
      "description": "Partecipa ai nostri tornei",
      "is_visible": true,
      "display_order": 1
    }
  ]
}
```

#### `PUT /api/homepage-sections/[id]`
Update homepage section.

**Auth**: Required  
**Roles**: admin, gestore

**URL**: `/api/homepage-sections/{id}`

**Body**:
```json
{
  "title": "Updated Section Title",
  "is_visible": false,
  "display_order": 2
}
```

**Response**:
```json
{
  "section": {
    "id": "uuid",
    "updated_at": "2024-12-29T10:00:00Z"
  }
}
```

---
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
  "section": {
    "id": "uuid",
    "updated_at": "2024-12-29T10:00:00Z"
  }
}
```

---

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

#### `PUT /api/bookings/[id]`
Update booking status (confirm/cancel).

**Auth**: Required  
**Roles**: coach (own bookings), gestore, admin

**URL**: `/api/bookings/{id}`

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

### Courses & Enrollments

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

### Email System

#### `GET /api/email/logs`
Get email delivery logs (admin only).

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

**Events**:
- `email.sent`: Email sent to provider
- `email.delivered`: Email delivered to inbox
- `email.opened`: Email opened by recipient
- `email.clicked`: Link clicked in email
- `email.bounced`: Email bounced
- `email.complained`: Spam complaint

**Response**:
```json
{
  "received": true
}
```

---

## Common Patterns

### Authentication Flow
1. User logs in via Supabase Auth
2. Get JWT token from session
3. Pass token in Authorization header: `Bearer {token}`
4. Backend verifies token and checks user profile/role

### Service Role Access (Admin APIs)
```typescript
// Server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Verify user has admin/gestore role
const { data: { user } } = await supabaseAdmin.auth.getUser(token);
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (!profile || !["admin", "gestore"].includes(profile.role)) {
  return error403;
}
```

### Tournament Flow
1. **Create Tournament**: `POST /api/tournaments`
2. **Register Participants**: `POST /api/tournament_participants`
3. **Start Tournament**: `POST /api/tournaments/{id}/start`
   - For `girone_eliminazione`: Generates groups
   - For `eliminazione_diretta`: Generates bracket
   - For `campionato`: Initializes standings
4. **Update Match Results**: `PUT /api/tournaments/{id}/matches/{matchId}`
5. **Advance Phase**: `POST /api/tournaments/{id}/knockout` (if applicable)

### Error Handling
All endpoints return consistent error format:
```typescript
{
  error: string;      // Human-readable message
  code?: string;      // Machine-readable code (optional)
  details?: object;   // Additional context (optional)
}
```

---

## Testing

### Using cURL

```bash
# Get tournaments (public)
curl https://your-domain.com/api/tournaments

# Create tournament (authenticated)
curl -X POST https://your-domain.com/api/tournaments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Tournament",
    "start_date": "2024-12-30",
    "competition_type": "torneo",
    "format": "eliminazione_diretta",
    "max_participants": 8,
    "status": "Aperto"
  }'

# Start tournament (admin)
curl -X POST https://your-domain.com/api/tournaments/{id}/start \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# Update match score
curl -X PUT https://your-domain.com/api/tournaments/{id}/matches/{matchId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sets": [
      {"player1_score": 6, "player2_score": 4},
      {"player1_score": 6, "player2_score": 3}
    ]
  }'

# Admin: List users
curl https://your-domain.com/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# Get tournament stats
curl https://your-domain.com/api/tournaments/stats
```

### Using Postman

Import collection: `docs/postman_collection.json` (to be created)

### Using JavaScript/TypeScript

```typescript
// Get tournaments
const response = await fetch('/api/tournaments?upcoming=true');
const { tournaments } = await response.json();

// Create participant (authenticated)
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

const response = await fetch('/api/tournament_participants', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'user-uuid',
    tournament_id: 'tournament-uuid'
  })
});

const result = await response.json();
```

---

## Versioning

Current Version: **v1**

Future breaking changes will be versioned: `/api/v2/...`

All endpoints currently use implicit v1 (no version prefix required).

---

## Environment Variables

Required environment variables for API functionality:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend)
RESEND_API_KEY=your-resend-key
RESEND_WEBHOOK_SECRET=your-webhook-secret

# Cron Jobs
CRON_SECRET=your-cron-secret

# Optional
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Security Notes

1. **Never expose Service Role Key** to client-side code
2. **Always validate user roles** server-side before sensitive operations
3. **Use RLS policies** in Supabase for data-level security
4. **Validate input** on all POST/PUT/PATCH endpoints
5. **Rate limit** public endpoints to prevent abuse
6. **Log sensitive operations** (user creation, deletions, role changes)

---

*Last Updated: 2024-12-29*  
*GST Tennis Academy API Documentation v1.0*

