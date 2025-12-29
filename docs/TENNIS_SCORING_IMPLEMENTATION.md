# Tennis Scoring System - Implementation Summary

## ✅ Implementato (Task #3)

### 1. Database Migration
**File:** `supabase/migrations/013_tennis_scoring_system.sql`

**Da applicare su Supabase Dashboard:**
1. Vai su Supabase Dashboard → SQL Editor
2. Copia il contenuto del file `013_tennis_scoring_system.sql`
3. Esegui la query

**Cosa aggiunge:**
- Campo `sets` (JSONB) su `tournament_matches` per salvare i punteggi set-by-set
- Campo `best_of` su `tournaments` (3 o 5 set)

### 2. API Endpoint Aggiornato
**File:** `src/app/api/tournaments/[id]/matches/[matchId]/route.ts`

**Metodo PUT aggiornato per:**
- Accettare array di set: `[{ player1_score: 6, player2_score: 3 }, ...]`
- Validare regole tennis:
  - Minimo 6 game per vincere
  - Differenza di 2 game (eccetto tiebreak 7-6)
  - Calcolo automatico vincitore in base a set vinti
- Avanzamento automatico vincitore al turno successivo

### 3. Nuovi Componenti UI

**TennisScoreInput.tsx**
- Form completo per inserire punteggi set-by-set
- Validazione in tempo reale delle regole tennis
- Supporto al meglio dei 3 o 5 set
- Aggiungi/rimuovi set dinamicamente
- Mostra conteggio set vinti in tempo reale

**BracketMatchCard.tsx (Aggiornato)**
- Modalità visualizzazione: mostra set e punteggi
- Modalità modifica: usa TennisScoreInput
- Highlight vincitore con stile tennis
- Mostra ogni singolo set (es: 6-3, 6-4)

**EliminationBracketView.tsx (Aggiornato)**
- Passa `bestOf` prop ai match card
- Handler aggiornato per inviare array sets invece di score singoli
- Utilizza metodo PUT invece di PATCH

**TournamentManager.tsx (Aggiornato)**
- Legge campo `best_of` dal tournament
- Passa prop a EliminationBracketView

## 🎾 Come Funziona

### Inserimento Punteggio
1. Admin/Gestore clicca icona ✏️ su una match card
2. Si apre form con input per ogni set
3. Inserisci punteggi (es: 6-3, 6-4)
4. Validazione automatica:
   - ✅ 6-3: valido (diff 2+)
   - ✅ 7-6: valido (tiebreak)
   - ✅ 7-5: valido (diff 2)
   - ❌ 6-5: invalido (serve diff 2)
   - ❌ 5-3: invalido (serve min 6)
5. Calcolo automatico vincitore
6. Avanzamento automatico al turno successivo

### Formato Match
- **Best of 3**: Vince chi arriva a 2 set
- **Best of 5**: Vince chi arriva a 3 set

### Visualizzazione
```
🏆 Mario Rossi #1        6  6     2
   Luigi Bianchi #4      3  4     0
```
- Ogni numero piccolo = giochi vinti in quel set
- Numero grande = set totali vinti
- 🏆 = vincitore del match

## 🔄 Next Steps (TODO list)

Task #4: Implementare fase gironi
Task #5: Implementare avanzamento da gironi a eliminazione
...

## 📝 Note Tecniche

- Sets salvati come JSONB: `[{"player1_score":6,"player2_score":3},...]`
- Validazione sia lato client che server
- API usa Next.js 15 con params await
- Authorization: solo admin/gestore/partecipanti del match
