# Sistema di Contro-Proposta per le Sfide Arena

## Panoramica
Implementato un sistema completo che permette all'avversario di proporre modifiche a una sfida ricevuta, richiedendo poi conferma dallo sfidante originale.

## Flusso Utente

### Scenario 1: Accettazione Diretta
1. **Giocatore A** crea una sfida per **Giocatore B**
2. **Giocatore B** riceve notifica
3. **Giocatore B** accetta direttamente → Status: `accepted`
4. **Giocatore A** riceve notifica di accettazione

### Scenario 2: Contro-Proposta
1. **Giocatore A** crea una sfida per **Giocatore B**
2. **Giocatore B** riceve notifica
3. **Giocatore B** clicca "Proponi Modifiche"
4. **Giocatore B** modifica data/ora/campo/formato/partner
5. **Giocatore B** salva → Status: `counter_proposal`
6. **Giocatore A** riceve notifica "✏️ Sfida Modificata"
7. **Giocatore A** vede badge animato "⚠️ Da confermare" nella lista sfide
8. **Giocatore A** apre i dettagli, vede banner giallo con avviso
9. **Giocatore A** può:
   - **Confermare** → Status: `accepted`, notifica a Giocatore B
   - **Rifiutare** → Status: `declined`, notifica a Giocatore B

### Scenario 3: Modifica dello Sfidante
1. **Giocatore A** crea una sfida per **Giocatore B**
2. **Giocatore A** cambia idea prima che B risponda
3. **Giocatore A** clicca "Modifica Sfida"
4. **Giocatore A** salva → Status rimane `pending`
5. **Giocatore B** vede la sfida aggiornata (nessuna notifica)

## Modifiche Implementate

### 1. Database Schema
**File**: `supabase/ADD_COUNTER_PROPOSAL_STATUS.sql`

```sql
ALTER TABLE arena_challenges
ADD CONSTRAINT arena_challenges_status_check 
CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'cancelled', 'counter_proposal'));
```

Aggiunto nuovo stato `counter_proposal` ai valori validi di `status`.

### 2. TypeScript Types
**File**: Multipli

Aggiornato l'interfaccia `Challenge` in tutti i componenti per includere `counter_proposal`:

```typescript
status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal";
```

### 3. API Challenge PATCH
**File**: `src/app/api/arena/challenges/route.ts`

#### Modifiche al PATCH Endpoint:
- Accetta nuovi campi per modificare i dettagli della sfida
- Recupera lo stato precedente prima dell'update
- Logica notifiche differenziata:

```typescript
if (status === "accepted") {
  if (previousStatus === "counter_proposal") {
    // Sfidante conferma modifiche dell'avversario
    notificationTitle = "✅ Modifiche Confermate!";
    notificationContent = `${data.challenger.full_name} ha confermato le tue modifiche alla sfida!`;
    recipientId = data.opponent_id; // Notifica a chi ha proposto modifiche
  } else {
    // Avversario accetta sfida originale
    notificationTitle = "✅ Sfida Accettata!";
    notificationContent = `${data.opponent.full_name} ha accettato la tua sfida!`;
    recipientId = data.challenger_id; // Notifica allo sfidante
  }
}
```

- Gestisce rifiuto modifiche:
```typescript
if (status === "declined") {
  if (previousStatus === "counter_proposal") {
    notificationTitle = "❌ Modifiche Rifiutate";
    recipientId = data.opponent_id;
  } else {
    notificationTitle = "❌ Sfida Rifiutata";
    recipientId = data.challenger_id;
  }
}
```

- Notifica per contro-proposta:
```typescript
if (status === "counter_proposal") {
  notificationTitle = "✏️ Sfida Modificata";
  notificationContent = `${data.opponent.full_name} ha proposto delle modifiche alla tua sfida. Rivedi i dettagli e conferma.`;
  recipientId = data.challenger_id;
}
```

### 4. Challenge Detail Page
**File**: `src/app/dashboard/atleta/(main)/arena/challenge/[id]/page.tsx`

#### Per l'Avversario (quando riceve la sfida):
Aggiunto terzo pulsante "Proponi Modifiche":

```tsx
<div className="space-y-3 pt-4 border-t">
  <div className="flex gap-3">
    <button onClick={() => handleChallengeAction("accept")}>
      Accetta Sfida
    </button>
    <button onClick={() => handleChallengeAction("decline")}>
      Rifiuta Sfida
    </button>
  </div>
  <button onClick={() => router.push(
    `/dashboard/atleta/arena/configure-challenge/${challenge.challenger_id}?edit=${challenge.id}&counter=true`
  )}>
    Proponi Modifiche
  </button>
</div>
```

#### Per lo Sfidante (quando riceve contro-proposta):
Aggiunta sezione di conferma:

```tsx
{canConfirmCounterProposal && (
  <div className="space-y-3 pt-4 border-t">
    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <p>⚠️ <strong>{opponent?.full_name}</strong> ha proposto delle modifiche alla tua sfida. 
      Rivedi i dettagli qui sopra e conferma o rifiuta le modifiche.</p>
    </div>
    <div className="flex gap-3">
      <button onClick={() => handleChallengeAction("accept")}>
        Conferma Modifiche
      </button>
      <button onClick={() => handleChallengeAction("decline")}>
        Rifiuta Modifiche
      </button>
    </div>
  </div>
)}
```

#### Status Banner Aggiornato:
```tsx
<p className="text-sm text-gray-600 mt-0.5">
  Sfida {
    challenge.status === "pending" 
      ? "in attesa di conferma" 
      : challenge.status === "counter_proposal"
      ? "modificata dall'avversario - in attesa della tua conferma"
      : challenge.status === "accepted" 
      ? "accettata" 
      : ...
  }
</p>
```

### 5. Configure Challenge Form
**File**: `src/app/dashboard/atleta/(main)/arena/configure-challenge/[opponentId]/page.tsx`

Aggiunto riconoscimento del parametro `counter`:

```typescript
const isCounterProposal = searchParams.get("counter") === "true";
```

Quando si salva una contro-proposta, imposta lo status appropriato:

```typescript
body: JSON.stringify({
  challenge_id: editChallengeId,
  // ... altri campi ...
  status: isCounterProposal ? "counter_proposal" : undefined,
})
```

### 6. Arena Main Page
**File**: `src/app/dashboard/atleta/(main)/arena/page.tsx`

#### Badge Animato per Contro-Proposte:
```tsx
{needsConfirmation && (
  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 bg-orange-100 text-orange-700 animate-pulse">
    ⚠️ Da confermare
  </span>
)}
```

#### Status Label Aggiornato:
```tsx
{challenge.status === "counter_proposal"
  ? "Modificata"
  : challenge.status === "pending"
  ? "In attesa"
  : ...
}
```

### 7. Notification System
**File**: `src/components/notifications/NotificationPanel.tsx`

Aggiunto supporto per tipo `arena_challenge`:

```typescript
const iconMap = {
  // ... altri tipi ...
  arena_challenge: Swords,
};

const colorMap = {
  // ... altri colori ...
  arena_challenge: "text-orange-400 bg-orange-500/10",
};
```

Corretto tipo da `link` a `action_url` per allineamento con database:

```typescript
type Notification = {
  // ...
  action_url: string | null;
  // ...
};
```

## Stati della Sfida

| Status | Descrizione | Chi può agire |
|--------|-------------|---------------|
| `pending` | Sfida in attesa di risposta iniziale | Opponent (accetta/rifiuta/modifica) |
| `counter_proposal` | Opponent ha proposto modifiche | Challenger (conferma/rifiuta) |
| `accepted` | Sfida accettata (da opponent o dopo conferma) | Entrambi (inserisci risultato) |
| `completed` | Match giocato, risultato inserito | Nessuno (archivio) |
| `declined` | Sfida rifiutata (originale o modifiche) | Nessuno (archivio) |
| `cancelled` | Sfida cancellata da challenger | Nessuno (archivio) |

## Notifiche Generate

| Azione | Destinatario | Titolo | Tipo |
|--------|--------------|--------|------|
| Opponent accetta sfida originale | Challenger | ✅ Sfida Accettata! | arena_challenge |
| Opponent rifiuta sfida originale | Challenger | ❌ Sfida Rifiutata | arena_challenge |
| Opponent propone modifiche | Challenger | ✏️ Sfida Modificata | arena_challenge |
| Challenger conferma modifiche | Opponent | ✅ Modifiche Confermate! | arena_challenge |
| Challenger rifiuta modifiche | Opponent | ❌ Modifiche Rifiutate | arena_challenge |

Tutte le notifiche includono un link diretto alla pagina dei dettagli della sfida:
```
/dashboard/atleta/arena/challenge/{challenge_id}
```

## Testing Checklist

### Test 1: Contro-Proposta Completa
- [ ] A crea sfida per B
- [ ] B riceve notifica nella campanella
- [ ] B clicca notifica → apre dettagli sfida
- [ ] B clicca "Proponi Modifiche"
- [ ] B modifica data/campo/formato
- [ ] B salva → status diventa `counter_proposal`
- [ ] A riceve notifica "✏️ Sfida Modificata"
- [ ] A vede badge "⚠️ Da confermare" nella lista
- [ ] A apre dettagli → vede banner giallo
- [ ] A clicca "Conferma Modifiche" → status diventa `accepted`
- [ ] B riceve notifica "✅ Modifiche Confermate!"
- [ ] Entrambi vedono sfida come accettata

### Test 2: Contro-Proposta Rifiutata
- [ ] A crea sfida per B
- [ ] B propone modifiche
- [ ] A riceve notifica
- [ ] A clicca "Rifiuta Modifiche"
- [ ] Status diventa `declined`
- [ ] B riceve notifica "❌ Modifiche Rifiutate"

### Test 3: Accettazione Diretta
- [ ] A crea sfida per B
- [ ] B clicca "Accetta Sfida" (senza modificare)
- [ ] Status diventa `accepted`
- [ ] A riceve notifica "✅ Sfida Accettata!"
- [ ] NON passa per stato `counter_proposal`

### Test 4: Modifica da Sfidante
- [ ] A crea sfida per B (status `pending`)
- [ ] A clicca "Modifica Sfida" prima che B risponda
- [ ] A modifica dettagli
- [ ] A salva → status rimane `pending`
- [ ] B NON riceve notifica
- [ ] B vede sfida aggiornata quando apre i dettagli

### Test 5: Notifiche Real-Time
- [ ] Aprire due browser (A e B)
- [ ] A crea sfida
- [ ] B vede notifica apparire in tempo reale (senza refresh)
- [ ] B propone modifiche
- [ ] A vede notifica apparire in tempo reale
- [ ] A conferma
- [ ] B vede notifica apparire in tempo reale

## Note Tecniche

### Query Param per Distinguere Modifica vs Contro-Proposta
- `?edit={id}` = modifica da parte dello sfidante (status rimane `pending`)
- `?edit={id}&counter=true` = contro-proposta da opponent (status diventa `counter_proposal`)

### Condizioni UI
```typescript
const isChallenger = challenge.challenger_id === userId;
const isCounterProposal = challenge.status === "counter_proposal";
const canRespond = !isChallenger && isPending;
const canConfirmCounterProposal = isChallenger && isCounterProposal;
```

### Logica Notifiche
Le notifiche controllano lo stato precedente della sfida per determinare il destinatario corretto:
- Se `previousStatus === "counter_proposal"` e viene accettata → notifica a opponent (che aveva proposto modifiche)
- Se `previousStatus === "pending"` e viene accettata → notifica a challenger (che aveva creato la sfida originale)

## Miglioramenti Futuri Possibili

1. **Storia Modifiche**: Tracciare tutte le modifiche proposte in una tabella separata
2. **Messaggio nella Contro-Proposta**: Permettere a B di aggiungere un messaggio quando propone modifiche
3. **Limite Modifiche**: Limitare il numero di contro-proposte consecutive
4. **Notifica Email**: Inviare email oltre alla notifica in-app per azioni importanti
5. **Preview Differenze**: Mostrare un diff delle modifiche proposte (es. "Data cambiata da X a Y")
6. **Chat Integrata**: Permettere discussione nella pagina della sfida per negoziare dettagli
7. **Timeout**: Auto-decline dopo N giorni senza risposta

## Riferimenti

- Database Migration: `supabase/ADD_COUNTER_PROPOSAL_STATUS.sql`
- API Endpoint: `src/app/api/arena/challenges/route.ts`
- Challenge Detail: `src/app/dashboard/atleta/(main)/arena/challenge/[id]/page.tsx`
- Configure Form: `src/app/dashboard/atleta/(main)/arena/configure-challenge/[opponentId]/page.tsx`
- Arena Main: `src/app/dashboard/atleta/(main)/arena/page.tsx`
- Notifications: `src/components/notifications/NotificationPanel.tsx`
