# Sistema Tornei Semplificato - Documentazione

## Panoramica

Il sistema gestisce 3 tipi di torneo in modo intuitivo:

1. **Eliminazione Diretta** - Tabellone classico ad eliminazione
2. **Girone + Eliminazione** - Fase a gironi seguita da eliminazione diretta
3. **Campionato** - Round-robin (tutti contro tutti)

## Architettura

### Database Schema

#### Tabella `tournaments`
```sql
- id: UUID
- title: VARCHAR
- tournament_type: VARCHAR ('eliminazione_diretta' | 'girone_eliminazione' | 'campionato')
- max_participants: INT
- num_groups: INT (per girone_eliminazione)
- teams_per_group: INT (per girone_eliminazione)
- teams_advancing: INT (quanti qualificati per girone)
- current_phase: VARCHAR ('iscrizioni' | 'gironi' | 'eliminazione' | 'completato')
- status: VARCHAR ('Aperto' | 'In Corso' | 'Concluso')
- start_date: TIMESTAMP
- end_date: TIMESTAMP
- category: VARCHAR
- surface_type: VARCHAR
- match_format: VARCHAR ('best_of_3' | 'best_of_5')
- entry_fee: DECIMAL
```

#### Tabella `tournament_groups`
```sql
- id: UUID
- tournament_id: UUID (FK)
- group_name: VARCHAR ('Girone A', 'Girone B', ecc.)
- group_order: INT
```

#### Tabella `tournament_participants`
```sql
- id: UUID
- tournament_id: UUID (FK)
- user_id: UUID (FK)
- group_id: UUID (FK, nullable)
- seed: INT (posizione seeding)
- group_position: INT (posizione finale nel girone)
- stats: JSONB {
    matches_played: INT,
    matches_won: INT,
    matches_lost: INT,
    sets_won: INT,
    sets_lost: INT,
    games_won: INT,
    games_lost: INT,
    points: INT
  }
```

#### Tabella `tournament_matches`
```sql
- id: UUID
- tournament_id: UUID (FK)
- phase: VARCHAR ('gironi' | 'eliminazione')
- round_name: VARCHAR
- round_number: INT
- match_number: INT
- player1_id: UUID (FK tournament_participants)
- player2_id: UUID (FK tournament_participants)
- player1_score: INT (set vinti)
- player2_score: INT (set vinti)
- score_details: JSONB (dettaglio set)
- winner_id: UUID (FK)
- status: VARCHAR ('programmata' | 'in_corso' | 'completata' | 'annullata')
- scheduled_at: TIMESTAMP
- court: VARCHAR
```

## API Endpoints

### 1. Creare un Torneo

**POST** `/api/tournaments/create`

```json
{
  "title": "Torneo Estivo 2025",
  "description": "Torneo open su terra battuta",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "tournament_type": "eliminazione_diretta",
  "max_participants": 16,
  "category": "Open",
  "surface_type": "terra",
  "match_format": "best_of_3",
  "entry_fee": 25.00
}
```

**Tipi di Torneo:**

#### Eliminazione Diretta
```json
{
  "tournament_type": "eliminazione_diretta",
  "max_participants": 16  // Deve essere 2, 4, 8, 16, 32, 64, 128
}
```

#### Girone + Eliminazione
```json
{
  "tournament_type": "girone_eliminazione",
  "max_participants": 16,
  "num_groups": 4,           // Numero gironi
  "teams_per_group": 4,      // Squadre per girone
  "teams_advancing": 2       // Qualificati per girone
}
```
*Nota: max_participants = num_groups × teams_per_group*

#### Campionato
```json
{
  "tournament_type": "campionato",
  "max_participants": 12     // Minimo 3
}
```

**Response:**
```json
{
  "tournament": { /* dati torneo */ },
  "message": "Torneo creato con successo"
}
```

### 2. Avviare un Torneo

**POST** `/api/tournaments/{id}/start`

Avvia il torneo e cambia la fase da 'iscrizioni' a quella appropriata.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Torneo avviato!",
  "tournament_type": "eliminazione_diretta",
  "next_step": "generate_bracket"
}
```

**Comportamento per tipo:**
- **eliminazione_diretta**: Passa a fase 'eliminazione'
- **girone_eliminazione**: Assegna partecipanti ai gironi, passa a fase 'gironi'
- **campionato**: Mantiene fase ma cambia status a 'In Corso'

### 3. Gestire le Partite dei Gironi

**GET** `/api/tournaments/{id}/group-matches?group_id={groupId}&phase=gironi`

Ottiene le partite di un girone.

**POST** `/api/tournaments/{id}/group-matches`

Genera automaticamente le partite round-robin per un girone.

```json
{
  "group_id": "uuid-girone"
}
```

Crea tutte le combinazioni (ogni partecipante contro tutti gli altri).

### 4. Aggiornare Risultato Partita

**PUT** `/api/tournaments/matches/{matchId}`

```json
{
  "player1_score": 2,
  "player2_score": 0,
  "score_details": {
    "sets": [
      { "p1": 6, "p2": 4 },
      { "p1": 6, "p2": 3 }
    ]
  },
  "winner_id": "uuid-vincitore",
  "status": "completata"
}
```

**Trigger Automatico:**
Quando una partita viene completata, il trigger `update_match_stats()` aggiorna automaticamente:
- Statistiche dei partecipanti (vittorie, sconfitte, set, games)
- Punti in classifica (2 per vittoria, 0 per sconfitta)

### 5. Ottenere i Gironi

**GET** `/api/tournaments/{id}/groups`

Response:
```json
{
  "groups": [
    {
      "id": "uuid",
      "group_name": "Girone A",
      "group_order": 1,
      "participants": [/* array partecipanti */]
    }
  ]
}
```

## Componenti Frontend

### 1. SimpleTournamentCreator

Form wizard in 3 step per creare tornei:

```tsx
import SimpleTournamentCreator from '@/components/tournaments/SimpleTournamentCreator';

<SimpleTournamentCreator onSuccess={() => router.push('/tornei')} />
```

**Features:**
- Step 1: Selezione tipo torneo (card visive)
- Step 2: Configurazione (numero partecipanti, gironi, ecc.)
- Step 3: Dettagli (nome, date, categoria, superficie)

### 2. TournamentManager

Componente unificato per gestire tutti i tipi di torneo:

```tsx
import TournamentManager from '@/components/tournaments/TournamentManager';

<TournamentManager tournament={tournament} isAdmin={true} />
```

**Features:**
- Visualizzazione tipo e stato torneo
- Bottone "Avvia Torneo" per admin
- Rendering automatico del componente giusto in base a tipo e fase
- Lista partecipanti

### 3. EliminationBracketView

Visualizza e gestisce il tabellone ad eliminazione:

```tsx
<EliminationBracketView
  tournamentId={id}
  maxParticipants={16}
  participants={participants}
  onMatchUpdate={reload}
/>
```

### 4. GroupStageView

Visualizza gironi con classifiche e partite:

```tsx
<GroupStageView
  tournamentId={id}
  groups={groups}
  participants={participants}
  teamsAdvancing={2}
  onMatchUpdate={reload}
/>
```

**Features:**
- Tab per ogni girone
- Classifica con posizioni evidenziate per qualificati
- Lista partite con possibilità di generarle
- Ordinamento automatico per punti > diff. set > diff. games

### 5. ChampionshipStandingsView

Classifica completa per campionati:

```tsx
<ChampionshipStandingsView participants={participants} />
```

**Features:**
- Podio visivo per i primi 3
- Tabella completa con statistiche
- Evidenziazione differenza set/games
- Sistema punteggio spiegato

## Workflow Completo

### Torneo ad Eliminazione Diretta

1. Admin crea torneo con `tournament_type: 'eliminazione_diretta'`
2. Partecipanti si iscrivono
3. Admin clicca "Avvia Torneo"
   - Fase diventa 'eliminazione'
4. Sistema/Admin genera bracket
5. Partite vengono giocate e risultati inseriti
6. Bracket si aggiorna automaticamente

### Torneo Girone + Eliminazione

1. Admin crea torneo con `tournament_type: 'girone_eliminazione'`
   - Specifica numero gironi, squadre per girone, qualificati
2. Partecipanti si iscrivono
3. Admin clicca "Avvia Torneo"
   - Sistema assegna automaticamente partecipanti ai gironi (bilanciato)
   - Fase diventa 'gironi'
4. Per ogni girone, admin genera le partite round-robin
5. Si giocano le partite dei gironi
   - Statistiche e classifiche si aggiornano automaticamente
6. Finiti i gironi, le prime N squadre per girone avanzano
7. Fase passa a 'eliminazione'
8. Si genera bracket con i qualificati
9. Si gioca la fase eliminatoria

### Campionato

1. Admin crea torneo con `tournament_type: 'campionato'`
2. Partecipanti si iscrivono
3. Admin clicca "Avvia Torneo"
   - Status diventa 'In Corso'
4. Si programmano le giornate (tutti contro tutti)
5. Si giocano le partite
   - Classifica si aggiorna automaticamente
6. Alla fine, vince chi ha più punti

## Sistema di Punteggio

- **Vittoria**: 2 punti
- **Sconfitta**: 0 punti

**Criteri di ordinamento in classifica:**
1. Punti totali
2. Differenza set (vinti - persi)
3. Differenza games (vinti - persi)

## Funzioni Database Utili

### `create_tournament_groups(p_tournament_id, p_num_groups)`
Crea automaticamente N gironi con nomi "Girone A", "Girone B", ecc.

### `assign_participants_to_groups(p_tournament_id)`
Assegna i partecipanti ai gironi in modo bilanciato (serpentina).

### `calculate_group_standings(p_group_id)`
Calcola la classifica di un girone ordinata per punti.

### Trigger `update_match_stats()`
Si attiva quando una partita viene completata e aggiorna automaticamente le statistiche dei partecipanti.

## Esempio Completo: Creare un Torneo

```typescript
// 1. Creare il torneo
const response = await fetch('/api/tournaments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Torneo Estivo 2025',
    tournament_type: 'girone_eliminazione',
    max_participants: 16,
    num_groups: 4,
    teams_per_group: 4,
    teams_advancing: 2,
    start_date: '2025-07-01',
    category: 'Open',
    surface_type: 'terra',
    match_format: 'best_of_3'
  })
});

const { tournament } = await response.json();

// 2. I partecipanti si iscrivono...

// 3. Avviare il torneo
await fetch(`/api/tournaments/${tournament.id}/start`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 4. Generare partite per ogni girone
for (const group of groups) {
  await fetch(`/api/tournaments/${tournament.id}/group-matches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ group_id: group.id })
  });
}

// 5. Aggiornare risultati
await fetch(`/api/tournaments/matches/${matchId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    player1_score: 2,
    player2_score: 0,
    winner_id: player1Id,
    status: 'completata'
  })
});
```

## Migrazione Database

Per applicare il nuovo sistema, esegui:

```sql
-- Esegui la migrazione
\i supabase/migrations/010_simplified_tournament_system.sql
```

Questo aggiunge:
- Colonne per `tournament_type`, `num_groups`, ecc.
- Tabelle `tournament_groups` e `tournament_matches`
- Funzioni helper e trigger automatici
- RLS policies

## Note Importanti

1. **Validazione Partecipanti**:
   - Eliminazione diretta: deve essere potenza di 2
   - Girone+Eliminazione: max_participants = num_groups × teams_per_group
   - Campionato: minimo 3 partecipanti

2. **Fasi del Torneo**:
   - `iscrizioni`: Accetta nuovi partecipanti
   - `gironi`: Fase a gironi in corso
   - `eliminazione`: Fase eliminatoria in corso
   - `completato`: Torneo terminato
   - `annullato`: Torneo cancellato

3. **Aggiornamento Automatico**:
   - Le statistiche si aggiornano automaticamente tramite trigger
   - Non serve calcolare manualmente punti/differenze

4. **Permessi**:
   - Solo `admin` e `gestore` possono creare/avviare tornei
   - `maestro` può anche aggiornare risultati
   - Tutti possono vedere tornei e partite

## Sviluppi Futuri

- [ ] Generazione automatica bracket eliminazione diretta
- [ ] Calendario automatico con date/orari
- [ ] Notifiche push per partite programmate
- [ ] Export risultati in PDF
- [ ] Statistiche avanzate (aces, doppi falli, ecc.)
- [ ] Sistema seeding intelligente
- [ ] Wildcard e bye automatici
