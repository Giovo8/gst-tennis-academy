# Arena - Setup e Integrazione

## 🎯 Panoramica

La sezione **Arena** permette agli atleti di:
- Sfidarsi tra loro in partite 1v1
- Scalare una classifica basata su punti e vittorie
- Visualizzare profili e statistiche degli avversari
- Prenotare campi direttamente per le sfide accettate
- Comunicare tramite la chat interna

---

## 📋 Setup Database

### 1. Esegui lo script SQL

Apri **Supabase SQL Editor** e esegui il file:
```
supabase/CREATE_ARENA_CHALLENGES.sql
```

Questo creerà:
- **arena_challenges**: Tabella per le sfide tra giocatori
- **arena_stats**: Tabella per statistiche e ranking
- **Trigger automatici**: Aggiornamento stats quando una sfida è completata
- **RLS Policies**: Sicurezza a livello di riga
- **Indexes**: Per performance ottimali

### 2. Verifica le tabelle

Dopo l'esecuzione, verifica che siano state create:

```sql
-- Verifica arena_challenges
SELECT * FROM arena_challenges LIMIT 5;

-- Verifica arena_stats  
SELECT * FROM arena_stats LIMIT 5;

-- Verifica che stats esistano per tutti gli atleti
SELECT COUNT(*) FROM arena_stats;
```

---

## 🔧 Funzionalità Implementate

### 1. Sistema di Sfide

**Creare una sfida:**
- L'atleta può sfidare qualsiasi altro atleta dalla classifica
- Può aggiungere un messaggio opzionale
- L'avversario riceve una notifica nella chat interna

**Stati delle sfide:**
- `pending`: In attesa di risposta
- `accepted`: Accettata dall'avversario
- `declined`: Rifiutata
- `completed`: Completata con vincitore
- `cancelled`: Annullata

**Flusso:**
1. Atleta A sfida Atleta B
2. Atleta B riceve notifica
3. Atleta B accetta/rifiuta
4. Se accettata: possono prenotare un campo
5. Dopo la partita: registrano il risultato
6. Stats aggiornate automaticamente

### 2. Sistema di Punti e Livelli

**Livelli disponibili:**
- **Bronzo**: 0-799 punti
- **Argento**: 800-1499 punti
- **Oro**: 1500-1999 punti
- **Platino**: 2000-2499 punti
- **Diamante**: 2500+ punti

**Guadagno punti:**
- Vittoria: +50 punti
- Sconfitta: -20 punti (minimo 0)

**Ranking:**
- Calcolato automaticamente in base a:
  1. Punti totali
  2. Numero di vittorie
  3. Win rate

### 3. Integrazione con Prenotazioni

Quando una sfida è accettata:
- Pulsante "Prenota Campo" disponibile
- Reindirizza a `/dashboard/atleta/bookings/new?challenge_id=XXX`
- La prenotazione viene collegata alla sfida
- Dettagli campo/orario visualizzati nella sfida

### 4. Integrazione con Chat

Ogni sfida ha pulsanti per:
- Inviare messaggio all'avversario
- Ricevere notifiche automatiche per:
  - Nuova sfida ricevuta
  - Sfida accettata/rifiutata
  - Sfida completata

### 5. Visualizzazione Profili

Modal con informazioni giocatore:
- Avatar e nome
- Livello e ranking
- Statistiche (punti, vittorie, sconfitte, win rate)
- Bio (se presente)
- Azioni: Sfida / Messaggio

---

## 📡 API Endpoints

### `/api/arena/challenges`

**GET**: Recupera sfide
```typescript
// Tutte le sfide di un utente
GET /api/arena/challenges?user_id=UUID

// Filtra per stato
GET /api/arena/challenges?user_id=UUID&status=pending
```

**POST**: Crea nuova sfida
```typescript
POST /api/arena/challenges
Body: {
  challenger_id: string;
  opponent_id: string;
  message?: string;
}
```

**PATCH**: Aggiorna sfida
```typescript
PATCH /api/arena/challenges
Body: {
  challenge_id: string;
  status: "accepted" | "declined" | "completed";
  winner_id?: string;
  score?: string;
  booking_id?: string;
}
```

**DELETE**: Cancella sfida
```typescript
DELETE /api/arena/challenges?challenge_id=UUID
```

### `/api/arena/stats`

**GET**: Recupera statistiche
```typescript
// Stats specifico utente
GET /api/arena/stats?user_id=UUID

// Classifica (top 10)
GET /api/arena/stats?limit=10
```

**POST**: Aggiorna stats (Admin only)
```typescript
POST /api/arena/stats
Body: {
  user_id: string;
  points?: number;
  wins?: number;
  // ... altri campi
}
```

---

## 🧩 Componenti

### `ChallengeModal`
Modal per lanciare una sfida
- Props: `isOpen`, `onClose`, `opponent`, `onChallengeCreated`
- Features: Validazione, messaggio opzionale, feedback errori

### `PlayerProfileModal`
Modal per visualizzare profilo giocatore
- Props: `isOpen`, `onClose`, `player`, `onChallenge`, `onMessage`
- Features: Stats complete, livello, azioni rapide

### `ArenaPage` (Principale)
Dashboard completa Arena
- Stats personali
- Sfide attive
- Classifica top 10
- Azioni rapide

---

## 🔄 Aggiornamenti Automatici

### Trigger `update_arena_stats_on_challenge_complete`

Quando una sfida è completata:
1. ✅ Aggiorna `total_matches` per entrambi
2. ✅ Aggiorna `wins`/`losses`
3. ✅ Ricalcola `win_rate`
4. ✅ Aggiorna `current_streak` e `longest_win_streak`
5. ✅ Assegna/rimuove punti
6. ✅ Aggiorna livello in base ai punti
7. ✅ Ricalcola ranking globale

---

## 🚀 Prossimi Sviluppi

### Da implementare:
- [ ] Pagina "Trova Avversari" con filtri (livello, disponibilità)
- [ ] Pagina statistiche dettagliate personali
- [ ] Classifica completa paginata
- [ ] Storico delle sfide completate
- [ ] Tornei Arena (mini-tornei a eliminazione)
- [ ] Achievements e badge
- [ ] Grafici statistiche nel tempo

---

## 🧪 Test

### Test manuali da effettuare:

1. **Creazione sfida:**
   - Lancia sfida a un giocatore
   - Verifica notifica ricevuta
   - Controlla stato "pending"

2. **Accetta sfida:**
   - Come avversario, accetta sfida
   - Verifica notifica al challenger
   - Controlla che appaia "Prenota Campo"

3. **Prenota campo per sfida:**
   - Click su "Prenota Campo"
   - Completa prenotazione
   - Verifica che challenge_id sia passato

4. **Completa sfida:**
   - Registra risultato (winner_id + score)
   - Verifica aggiornamento stats automatico
   - Controlla ranking aggiornato

5. **Visualizza profilo:**
   - Click su giocatore in classifica
   - Verifica stats corrette
   - Testa azioni (sfida/messaggio)

---

## 📝 Note Importanti

- ⚠️ Le stats vengono aggiornate **solo** quando una sfida è marcata come `completed` con un `winner_id`
- ⚠️ Il ranking si ricalcola automaticamente per **tutti** i giocatori ad ogni completamento
- ⚠️ I punti non possono scendere sotto 0
- ⚠️ Ogni utente atleta ha automaticamente una entry in `arena_stats` (creata tramite INSERT on conflict)

---

## 🐛 Troubleshooting

### Le stats non si aggiornano
```sql
-- Verifica che il trigger esista
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_arena_stats';

-- Riapplica il trigger se necessario
-- (Esegui di nuovo CREATE_ARENA_CHALLENGES.sql)
```

### Ranking non corretto
```sql
-- Ricalcola manualmente
WITH ranked_users AS (
  SELECT 
    user_id,
    ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, win_rate DESC) as new_ranking
  FROM public.arena_stats
)
UPDATE public.arena_stats s
SET ranking = r.new_ranking
FROM ranked_users r
WHERE s.user_id = r.user_id;
```

### Stats mancanti per un utente
```sql
-- Crea manualmente
INSERT INTO public.arena_stats (user_id)
VALUES ('USER_UUID_HERE')
ON CONFLICT (user_id) DO NOTHING;
```

---

## ✅ Checklist Implementazione

- [x] Tabelle database create
- [x] API endpoints implementate
- [x] Componenti modal creati
- [x] Pagina Arena principale aggiornata
- [x] Integrazione con prenotazioni
- [x] Integrazione con chat
- [x] Sistema notifiche
- [x] Trigger automatici stats
- [x] RLS policies
- [ ] Pagina "Trova Avversari"
- [ ] Pagina statistiche dettagliate
- [ ] Classifica completa
- [ ] Testing completo

---

**Autore**: GitHub Copilot  
**Data**: 6 Gennaio 2026  
**Versione**: 1.0.0
