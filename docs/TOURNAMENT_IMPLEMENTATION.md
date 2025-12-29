# Sistema Tornei - Funzionalità Implementate

**Ultimo aggiornamento**: 29 Dicembre 2025

## Panoramica
Sistema completo di gestione tornei con iscrizione manuale degli atleti, visualizzazione bracket interattiva, e gestione risultati in tempo reale.

## ✅ Funzionalità Implementate

### 1. Iscrizione Manuale Atleti
**File**: `src/components/tournaments/ManualEnrollment.tsx`

- ✅ Pulsante "Iscrivi Atleta" nel TournamentManager (visibile solo per admin/gestore)
- ✅ Modal con ricerca utenti (atleti, coach, maestri)
- ✅ Ricerca per nome e email
- ✅ Controllo capacità massima del torneo
- ✅ Controllo posti disponibili
- ✅ Iscrizione con un click
- ✅ Feedback visivo (loading, successo, errore)
- ✅ Aggiornamento automatico lista partecipanti

**Utilizzo**:
- Apri il pannello di gestione torneo cliccando "GESTISCI" sulla card torneo
- Clicca su "Iscrivi Atleta" (visibile solo in fase iscrizioni)
- Cerca l'atleta per nome o email
- Clicca "Iscrivi" per aggiungere l'atleta al torneo

### 2. Visualizzazione Bracket Migliorata
**File**: `src/components/tournaments/BracketMatchCard.tsx`

- ✅ Card partita con design moderno
- ✅ Visualizzazione nome giocatori (caricati da profili)
- ✅ Visualizzazione seed (testa di serie)
- ✅ Indicatore vincitore con icona trofeo
- ✅ Highlight del vincitore con bordo colorato
- ✅ Stato partita (Da giocare, In corso, Completato)
- ✅ Punteggi visibili
- ✅ Pulsante "Inserisci Risultato" per admin

### 3. Inserimento Risultati Partite
**Implementato in**: 
- `BracketMatchCard.tsx` - UI per inserimento punteggi
- `EliminationBracketView.tsx` - Gestione logica bracket
- `api/tournaments/[id]/matches/[matchId]/route.ts` - API endpoint PATCH

**Funzionalità**:
- ✅ Pulsante "Inserisci Risultato" su ogni partita (solo admin/gestore)
- ✅ Input numerico per punteggi giocatore 1 e 2
- ✅ Validazione punteggi (0-99)
- ✅ Salvataggio con conferma
- ✅ Annulla modifiche
- ✅ Determinazione automatica vincitore
- ✅ Aggiornamento stato partita (completed)
- ✅ Aggiornamento timestamp completamento

### 4. Lista Partecipanti Migliorata
**File**: `src/components/tournaments/TournamentManager.tsx`

- ✅ Visualizzazione nome completo (da profili)
- ✅ Visualizzazione email
- ✅ Badge testa di serie
- ✅ Statistiche partite (W-L)
- ✅ Layout responsive (1-3 colonne)
- ✅ Card moderne con bordi
- ✅ Pulsante "Iscrivi Atleta" in header sezione

### 5. API Endpoints

#### POST `/api/tournament_participants`
- ✅ Iscrizione atleti (manuale o self-service)
- ✅ Controllo ruolo (admin, gestore, maestro per atleti)
- ✅ Verifica capacità torneo
- ✅ Prevenzione duplicati
- ✅ Caricamento informazioni profilo

#### PATCH `/api/tournaments/[id]/matches/[matchId]`
- ✅ Aggiornamento punteggi partita
- ✅ Determinazione vincitore automatica
- ✅ Aggiornamento stato (completed)
- ✅ Timestamp completamento
- ✅ Solo per admin/gestore

#### GET `/api/tournament_participants`
- ✅ Caricamento partecipanti con profili
- ✅ Filtro per torneo
- ✅ Join con tabella profiles
- ✅ Informazioni complete (nome, email, stats)

### 6. Controlli Ruolo e Sicurezza

- ✅ Solo admin/gestore possono:
  - Iscrivere atleti manualmente
  - Inserire risultati partite
  - Avviare tornei
  - Vedere pulsante "Gestisci"
  
- ✅ Maestri (coach) possono:
  - Iscrivere solo atleti (non altri ruoli)
  
- ✅ Tutti gli utenti possono:
  - Vedere tornei pubblici
  - Iscriversi autonomamente (se permesso)

### 7. Flusso Completo Torneo

#### Fase Iscrizioni
1. Admin crea torneo
2. Admin iscrive atleti manualmente (o atleti si iscrivono)
3. Sistema mostra "Partecipanti: X/Y"
4. Quando pronto (min 2 partecipanti), admin clicca "Avvia Torneo"

#### Fase Eliminazione
1. Sistema genera bracket automaticamente
2. Bracket visibile a tutti
3. Admin inserisce risultati partita per partita
4. Sistema determina vincitori automaticamente
5. Vincitori avanzano al turno successivo
6. Finale determina campione

#### Fase Conclusione
1. Torneo marcato come "Concluso"
2. Statistiche finali disponibili
3. Classifica finale visibile

## 🎨 Design e UX

### Tema Colori
- Primario: `#7de3ff` (ciano chiaro)
- Secondario: `#4fb3ff` (blu)
- Background: `#0a1929` / `#0d1f35` (blu scuro)
- Accenti: Gradienti da/a ciano

### Animazioni
- Hover sui pulsanti: scale + shadow
- Transizioni fluide (transition-all)
- Loading spinners per operazioni async
- Feedback visivo su stati (completato, vincitore, etc.)

### Responsive
- Mobile: 1 colonna
- Tablet: 2 colonne
- Desktop: 3-4 colonne
- Bracket: scroll orizzontale su mobile

## 🔧 Configurazione e Setup

### Prerequisiti
- Next.js 16.1.1
- Supabase configurato
- Tabelle database:
  - `tournaments`
  - `tournament_participants`
  - `tournament_matches`
  - `profiles`

### Testare il Sistema

1. **Login come admin/gestore**
   ```
   /login
   ```

2. **Vai alla sezione tornei**
   ```
   /dashboard/admin/tornei
   ```

3. **Crea un torneo**
   - Clicca "Crea Nuovo Torneo"
   - Compila form (tipo, max partecipanti, etc.)
   - Salva

4. **Iscrivi atleti manualmente**
   - Clicca "GESTISCI" sulla card torneo
   - Clicca "Iscrivi Atleta"
   - Cerca e seleziona atleti
   - Clicca "Iscrivi" per ognuno

5. **Avvia torneo**
   - Con almeno 2 partecipanti
   - Clicca "Avvia Torneo"
   - Conferma

6. **Inserisci risultati**
   - Visualizza bracket
   - Clicca "Inserisci Risultato" su una partita
   - Inserisci punteggi
   - Salva

7. **Visualizza progressione**
   - Vincitori evidenziati con trofeo
   - Partite completate marcate
   - Avanzamento automatico al turno successivo

## 📝 Note Tecniche

### Stati Torneo
- `Aperto` - Fase iscrizioni
- `In Corso` - Partite in corso
- `Concluso` - Torneo terminato

### Fasi Torneo
- `iscrizioni` - Accetta nuovi partecipanti
- `gironi` - Fase a gironi (se tipo girone_eliminazione)
- `eliminazione` - Fase eliminatoria

### Tipi Torneo
- `eliminazione_diretta` - Bracket singolo
- `girone_eliminazione` - Gironi + eliminazione
- `campionato` - Tutti contro tutti

## 🚀 Prossimi Sviluppi Possibili

1. **Generazione Bracket Automatica**
   - Implementare algoritmo seeding
   - Bilanciamento bracket
   - Bye per potenze di 2 non perfette

2. **Match Avanzati**
   - Punteggio dettagliato (set, game, punti)
   - Statistiche avanzate (ace, doppi falli, etc.)
   - Timer partita live

3. **Notifiche**
   - Email quando iscritto a torneo
   - Notifica prossima partita
   - Risultati partita

4. **Streaming e Live Updates**
   - WebSocket per aggiornamenti real-time
   - Live score durante partita
   - Chat spettatori

5. **Esportazione**
   - PDF bracket stampabile
   - CSV risultati
   - Certificati vincitori

## 📚 Riferimenti

- Documentazione API: `/docs/API.md`
- Schema Database: `/supabase/schema.sql`
- Sistema Ruoli: `/docs/ROLES_SYSTEM.md`
- Documentazione Tornei: `/docs/TOURNAMENT_SYSTEM.md`
