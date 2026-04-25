# Fix: Timeline Selection → New Booking

## Problema
Quando si selezionavano slot nella timeline (`dashboard/admin/bookings`) e si cliccava su "Prenota Campo", i parametri URL (court, date, time) venivano passati ma non applicati correttamente nella pagina `dashboard/admin/bookings/new`.

## Causa del Problema
1. **Rimozione prematura dei parametri URL**: Il `router.replace` veniva chiamato prima che lo slot fosse effettivamente selezionato
2. **Race condition**: I parametri URL venivano rimossi prima che gli slot fossero caricati dal database
3. **Mancanza di tracking**: Non c'era modo di sapere se i parametri URL erano già stati applicati

## Soluzione Implementata

### 1. Aggiunto tracking per parametri URL applicati
```typescript
const urlParamsApplied = useRef<boolean>(false);
```

### 2. Migliorata logica di applicazione parametri URL
- Verifica che i campi siano caricati prima di applicare i parametri
- Controlla se i parametri esistono prima di tentare l'applicazione
- Usa un flag per evitare applicazioni multiple
- Log di debug per tracciare il flusso

### 3. Rimossa rimozione prematura dei parametri URL
- I parametri URL vengono ora rimossi **solo dopo** che lo slot è stato selezionato con successo
- Timeout di 100ms per assicurare che lo stato sia aggiornato
- Usa `scroll: false` per evitare scroll indesiderati

### 4. Aggiunto logging dettagliato
- Log nella timeline quando si naviga
- Log quando si applicano i parametri URL
- Log quando si tenta di selezionare lo slot
- Log quando lo slot viene selezionato con successo

## Modifiche ai File

### `src/app/dashboard/admin/bookings/new/page.tsx`
- ✅ Aggiunto `urlParamsApplied` ref per tracking
- ✅ Migliorato useEffect per applicazione parametri URL
- ✅ Spostata rimozione URL params dopo selezione slot
- ✅ Aggiunto logging dettagliato

### `src/components/admin/BookingsTimeline.tsx`
- ✅ Aggiunto logging in `handleBookSlots`

## Come Testare

1. Vai su `dashboard/admin/bookings`
2. Clicca su "Timeline" per visualizzare la timeline
3. Seleziona una data futura
4. Clicca su uno o più slot liberi (devono diventare blu)
5. Clicca sul pulsante "Prenota Campo (X slot selezionati)"
6. Verifica che:
   - La pagina `new` si apra
   - Il campo corretto sia selezionato
   - La data corretta sia selezionata
   - Lo slot sia evidenziato come selezionato (blu)
7. Controlla la console del browser per i log di debug

## Console Logs Attesi

Quando tutto funziona correttamente, dovresti vedere:

```
🚀 Navigazione verso new booking con parametri: { court: "Campo 1", date: "2026-01-12", time: "10:00", selectedSlots: [...] }
📋 Applicazione parametri URL: { courtParam: "Campo 1", dateParam: "2026-01-12", timeParam: "10:00" }
🎯 Tentativo di selezionare slot: { slotToSelect: "10:00", slotExists: true, available: true }
✅ Slot selezionato con successo
```

## Note
- I log possono essere rimossi in produzione
- Il timeout di 100ms è necessario per il render di React
- La soluzione è compatibile con il caricamento dinamico dei campi dal database
