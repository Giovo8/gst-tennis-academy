# Arena per Dashboard Maestro

## Implementazione Completata

### Panoramica
L'Arena è stata estesa alla dashboard maestro, permettendo ai maestri di partecipare alle sfide proprio come gli atleti.

### Struttura File Creata

```
src/app/dashboard/maestro/(main)/arena/
├── page.tsx                                    # Pagina principale Arena
├── choose-opponent/
│   └── page.tsx                               # Selezione avversario
├── challenge/
│   └── [id]/
│       └── page.tsx                           # Dettagli sfida
└── configure-challenge/
    └── [opponentId]/
        └── page.tsx                           # Configurazione sfida
```

### Modifiche Implementate

#### 1. Copia Struttura Arena
- Copiati tutti i file dalla dashboard atleta a quella maestro
- Struttura identica per garantire parità di funzionalità

#### 2. Aggiornamento Percorsi
Tutti i percorsi sono stati aggiornati da:
- `/dashboard/atleta/arena` → `/dashboard/maestro/arena`
- `/dashboard/atleta/bookings` → `/dashboard/maestro/bookings`
- `/dashboard/atleta/mail` → `/dashboard/maestro/mail`

File aggiornati:
- `page.tsx` (3 sostituzioni)
- `choose-opponent/page.tsx` (1 sostituzione)
- `challenge/[id]/page.tsx` (aggiornati automaticamente)
- `configure-challenge/[opponentId]/page.tsx` (aggiornati automaticamente)

#### 3. Navigazione Maestro
**File**: `src/components/dashboard/CoachLayout.tsx`

Aggiunta voce menu Arena:
```typescript
{
  label: "Arena",
  href: "/dashboard/maestro/arena",
  icon: <Swords className="h-5 w-5" />,
}
```

Posizionato dopo "Dashboard" e prima di "Agenda" per dare priorità alla sezione.

### Funzionalità Disponibili

I maestri possono ora:

1. **Visualizzare Classifica Arena**
   - Vedere il proprio rank e statistiche
   - Filtrare per livello (Bronzo, Argento, Oro, Platino, Diamante)
   - Visualizzare la classifica globale

2. **Creare Sfide**
   - Sfidare altri giocatori (atleti o maestri)
   - Configurare formato match (Best of 1/3/5)
   - Scegliere tipo (Singolo/Doppio)
   - Selezionare tipo sfida (Ranked/Amichevole)
   - Prenotare campo e slot orari

3. **Gestire Sfide Ricevute**
   - Accettare sfide direttamente
   - Proporre modifiche (contro-proposta)
   - Rifiutare sfide

4. **Modificare Sfide Proprie**
   - Modificare sfide pending prima dell'accettazione
   - Cancellare sfide create

5. **Confermare Contro-Proposte**
   - Quando un avversario propone modifiche
   - Confermare o rifiutare le modifiche proposte

6. **Inserire Risultati**
   - Dopo match completati
   - Selezionare vincitore (obbligatorio per tennis)
   - Inserire punteggio opzionale

7. **Visualizzare Statistiche**
   - Tab "Statistiche" con tutti i dati
   - Serie vittorie/sconfitte consecutive
   - Tasso di vittoria
   - Totale match giocati

### API e Database

#### Nessuna Modifica Richiesta
Le API e il database esistenti supportano già tutti i ruoli:

**API Arena**:
- `/api/arena/challenges` - Nessun filtro di ruolo
- `/api/arena/stats` - Basato su user_id (qualsiasi utente)
- `/api/arena/players` - Carica tutti gli utenti tranne l'attuale

**Tabelle Database**:
- `arena_challenges` - Basato su user_id (challenger_id, opponent_id)
- `arena_stats` - Basato su user_id, senza vincoli di ruolo
- RLS policies permettono accesso a tutti gli utenti autenticati

### Notifiche

I maestri riceveranno le stesse notifiche degli atleti:
- ✅ Sfida Accettata
- ❌ Sfida Rifiutata
- ✏️ Sfida Modificata (contro-proposta)
- ✅ Modifiche Confermate
- ❌ Modifiche Rifiutate
- 🏁 Sfida Completata

Tutte le notifiche sono cliccabili e portano ai dettagli della sfida.

### Interoperabilità

**Maestri vs Atleti**:
- Un maestro può sfidare un atleta ✅
- Un atleta può sfidare un maestro ✅
- Entrambi condividono la stessa classifica ✅
- Le statistiche sono unificate ✅

**Maestri vs Maestri**:
- I maestri possono sfidarsi tra loro ✅
- Stesso sistema di contro-proposte ✅
- Stesso sistema di notifiche ✅

### Componenti Condivisi

I seguenti componenti sono condivisi tra atleti e maestri:
- `ChallengeModal` - Modal per creare sfide rapide
- `PlayerProfileModal` - Modal profilo giocatore
- Tutti i componenti UI (lucide-react icons)

### Test Suggeriti

1. **Login come Maestro**
   - Accedere alla dashboard maestro
   - Verificare che "Arena" appaia nel menu

2. **Visualizzare Classifica**
   - Aprire /dashboard/maestro/arena
   - Verificare che mostri statistiche e classifica
   - Testare filtri per livello

3. **Creare Sfida**
   - Cliccare "Nuova Sfida"
   - Scegliere un avversario (atleta o maestro)
   - Configurare dettagli
   - Inviare sfida

4. **Ricevere Sfida**
   - Con un altro account, sfidare il maestro
   - Verificare notifica nella campanella
   - Aprire dettagli sfida
   - Testare: Accetta, Rifiuta, Proponi Modifiche

5. **Contro-Proposta**
   - Un atleta sfida un maestro
   - Maestro propone modifiche
   - Atleta riceve notifica
   - Atleta conferma/rifiuta

6. **Inserire Risultato**
   - Completare una sfida accettata
   - Inserire risultato con vincitore
   - Verificare aggiornamento statistiche
   - Verificare notifica al perdente

### Note Tecniche

#### Script PowerShell Utilizzati
```powershell
# Copia ricorsiva con preservazione struttura
$arena = "src\app\dashboard\atleta\(main)\arena"
$maestroArena = "src\app\dashboard\maestro\(main)\arena"
Get-ChildItem -Path $arena -Recurse -File -Filter "*.tsx" | 
  ForEach-Object {
    $relativePath = $_.FullName.Substring($arena.Length + 1)
    $destPath = Join-Path $maestroArena $relativePath
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
      New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item $_.FullName $destPath -Force
  }

# Aggiornamento automatico percorsi
Get-ChildItem -Path $maestroArena -Recurse -File -Filter "*.tsx" | 
  ForEach-Object {
    $content = Get-Content $_.FullName -Encoding UTF8
    $updated = $content `
      -replace '/dashboard/atleta/arena', '/dashboard/maestro/arena' `
      -replace '/dashboard/atleta/bookings', '/dashboard/maestro/bookings' `
      -replace '/dashboard/atleta/mail', '/dashboard/maestro/mail'
    Set-Content $_.FullName -Value $updated -Encoding UTF8
  }
```

### Limitazioni e Considerazioni

1. **Nessuna Segregazione**
   - Maestri e atleti condividono la stessa classifica
   - Non c'è distinzione visiva nel ruolo (intenzionale)
   - Per creare classifiche separate, servirebbe modificare arena_stats

2. **Livelli e Punti**
   - I maestri iniziano con 1000 punti (come gli atleti)
   - Sistema di leveling identico
   - Potrebbero dominare la classifica se più forti

3. **Prenotazioni Campi**
   - I maestri usano il loro sistema di prenotazione
   - Le sfide Arena creano prenotazioni nel loro sistema

### Estensioni Future Possibili

1. **Classifica Separata per Ruolo**
   - Aggiungere filtro "Solo Maestri" / "Solo Atleti"
   - Creare ranking separati per ruolo

2. **Badge Ruolo**
   - Mostrare badge "Maestro" nelle card giocatori
   - Distinguere visivamente i ruoli

3. **Handicap**
   - Sistema di handicap maestri vs atleti
   - Punti ponderati in base al ruolo

4. **Statistiche Avanzate**
   - Statistiche maestri vs atleti
   - Performance per ruolo avversario

5. **Tornei Riservati**
   - Tornei solo maestri
   - Tornei misti con bilanciamento

## Conclusione

L'Arena è ora completamente funzionale per i maestri con piena parità di funzionalità rispetto agli atleti. L'implementazione è stata realizzata senza modifiche al database o alle API, garantendo retrocompatibilità e semplicità di manutenzione.
