# Tornei Cliccabili - Documentazione

## Panoramica
I tornei nella pagina "Gestione Tornei" sono ora completamente cliccabili e visualizzabili. Cliccando su una card torneo si apre un drawer laterale con tutti i dettagli e le funzionalità di gestione.

## Funzionalità

### 1. Card Tornei Cliccabili
- **Intera card cliccabile**: Ogni card torneo è ora completamente cliccabile
- **Indicatore hover**: Quando si passa il mouse sulla card, appare un badge "Visualizza" con icona occhio
- **Effetti visivi**: Bordo blu e ombra al passaggio del mouse
- **Cursor pointer**: Il cursore cambia per indicare che l'elemento è cliccabile

### 2. Drawer Laterale per Dettagli
Quando si clicca su una card torneo:
- Si apre un **drawer scorrevole** da destra con animazione fluida
- Il drawer occupa l'intera altezza dello schermo con larghezza massima di 2xl
- **Overlay scuro** con effetto blur sullo sfondo (cliccabile per chiudere)
- **Header fisso** con titolo "Dettagli Torneo" e bottone chiudi
- **Contenuto scrollabile** con tutte le informazioni del torneo

### 3. Pannello di Gestione (Amministrativo)
Il bottone "Gestisci" (icona matita) mantiene la funzionalità originale:
- Apre un pannello **inline** sotto la lista tornei
- Non copre la lista dei tornei
- Permette operazioni amministrative avanzate
- Include il componente `TournamentManagerWrapper`

### 4. Differenze tra Visualizza e Gestisci

| Funzione | Visualizza (Click Card) | Gestisci (Bottone Matita) |
|----------|-------------------------|---------------------------|
| **Posizionamento** | Drawer laterale | Pannello inline |
| **Lista tornei** | Nascosta (overlay) | Visibile sopra |
| **Scopo** | Visualizzazione rapida | Amministrazione completa |
| **Chiusura** | Click overlay o X | Bottone "Chiudi" |

## Componenti Utilizzati

### TournamentManagerWrapper
Componente wrapper che carica e visualizza i dettagli completi del torneo:
- Carica i dati del torneo tramite API
- Normalizza i dati per compatibilità
- Gestisce stati di loading ed errori
- Renderizza il componente `TournamentManager`

### TournamentManager
Componente principale per la gestione tornei:
- **Overview**: Informazioni generali, lista partecipanti
- **Bracket**: Tabellone/gironi in base al tipo di torneo
- Supporta 3 tipi:
  - Eliminazione Diretta
  - Girone + Eliminazione
  - Campionato

## Implementazione Tecnica

### Stati Aggiunti
```typescript
const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(null);
```

### Gestione Click Events
```typescript
// Click sulla card: apre drawer dettagli
onClick={() => setViewingTournamentId(tournament.id)}

// Click sui bottoni azioni: previene propagazione
onClick={(e) => {
  e.stopPropagation();
  setManagingTournamentId(tournament.id);
}}
```

### Animazione Drawer
```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
```

## UX Miglioramenti

1. **Feedback Visivo Immediato**
   - Badge "Visualizza" appare al hover
   - Bordo blu e ombra aumentata
   - Transizioni fluide (300ms)

2. **Navigazione Intuitiva**
   - Click ovunque sulla card per visualizzare
   - Overlay cliccabile per chiudere
   - Bottone X sempre visibile nell'header

3. **Accessibilità**
   - Cursor pointer indica clickabilità
   - Z-index 50 per drawer sopra tutto
   - Scroll automatico per contenuti lunghi

4. **Responsive Design**
   - Drawer max-width 2xl (42rem)
   - Adattamento automatico per mobile
   - Overflow-y-auto per scroll verticale

## File Modificati

1. **src/app/dashboard/admin/tornei/page.tsx**
   - Aggiunto stato `viewingTournamentId`
   - Card tornei rese cliccabili con `onClick`
   - Aggiunto drawer laterale con overlay
   - Bottoni azioni con `stopPropagation`
   - Import icona `Eye` da lucide-react

2. **src/app/globals.css**
   - Aggiunta animazione `slide-in-right`
   - Classe `.animate-slide-in-right`

## Testing

### Test Manuale Consigliato
1. ✅ Click su card torneo → apre drawer
2. ✅ Click su overlay → chiude drawer
3. ✅ Click su X nell'header → chiude drawer
4. ✅ Badge "Visualizza" appare al hover
5. ✅ Bottone "Gestisci" apre pannello inline
6. ✅ Bottone "Elimina" funziona senza aprire drawer
7. ✅ Scroll verticale nel drawer per tornei con molti dati
8. ✅ Animazione fluida apertura/chiusura drawer

## Note Tecniche

- **Performance**: L'overlay con backdrop-blur potrebbe essere pesante su dispositivi old
- **Z-index**: Drawer a z-50, assicurarsi che altri modal/dropdown non vadano oltre
- **Memory**: Ogni apertura drawer carica i dati del torneo, consider caching se necessario
- **Mobile**: Drawer occupa 100% larghezza su schermi piccoli (max-w-full su mobile)

## Prossimi Passi Possibili

1. **Cache Dati**: Salvare dati tornei già caricati per evitare richieste ripetute
2. **Deep Linking**: URL con parametro `?view=tournamentId` per link diretti
3. **Keyboard Navigation**: ESC per chiudere drawer
4. **Loading Skeleton**: Mostrare skeleton mentre carica dati nel drawer
5. **Breadcrumb**: Mostrare percorso "Tornei > Nome Torneo" nell'header drawer
6. **Quick Actions**: Bottoni rapidi nel drawer per azioni comuni
