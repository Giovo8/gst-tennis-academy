# Courts Settings Migration

## Panoramica
È stata implementata una nuova funzionalità per gestire i campi da tennis dinamicamente tramite database invece di usare costanti hardcoded nel codice.

## Modifiche Implementate

### 1. Database Migration
- **File**: `supabase/migrations/026_create_courts_settings.sql`
- **Tabella**: `courts_settings`
- **Campi**:
  - `id`: UUID (Primary Key)
  - `court_name`: VARCHAR(50) (Nome del campo, es. "Campo 1")
  - `display_order`: INT (Ordine di visualizzazione)
  - `is_active`: BOOLEAN (Se il campo è attivo e prenotabile)
  - `created_at`, `updated_at`: TIMESTAMPTZ

### 2. Funzioni Helper
- **File**: `src/lib/courts/getCourts.ts`
  - `getCourts()`: Carica i campi attivi dal database
  - `getCourtsWithDetails()`: Carica i campi con tutti i dettagli
- **File**: `src/lib/courts/constants.ts`
  - `DEFAULT_COURTS`: Lista di fallback predefinita (4 campi)

### 3. Componenti Aggiornati
- ✅ `src/components/admin/BookingsTimeline.tsx` - Carica campi dal database
- ✅ `src/app/dashboard/admin/bookings/new/page.tsx` - Carica campi dal database

### 4. Componenti da Aggiornare (TODO)
I seguenti file usano ancora la costante `COURTS` hardcoded:
- `src/app/dashboard/admin/bookings/modifica/page.tsx`
- `src/app/dashboard/admin/(main)/arena/create-challenge/page.tsx`
- `src/app/dashboard/atleta/(main)/arena/configure-challenge/[opponentId]/page.tsx`
- `src/app/dashboard/admin/(main)/arena/challenge/[id]/edit/page.tsx`
- `src/app/dashboard/maestro/(main)/bookings/new/page.tsx`
- `src/app/dashboard/atleta/(main)/bookings/new/page.tsx`
- `src/app/dashboard/admin/courts/[id]/page.tsx`
- `src/app/dashboard/admin/courts/new/page.tsx`
- `src/app/dashboard/maestro/(main)/arena/configure-challenge/[opponentId]/page.tsx`
- `src/app/dashboard/gestore/(main)/courts/page.tsx`

## Come Applicare la Migration

### Database Locale (Supabase Local)
```bash
npx supabase db push --local
```

### Database Produzione
```bash
npx supabase db push
```

O manualmente tramite Supabase Dashboard:
1. Apri il SQL Editor
2. Copia e incolla il contenuto di `026_create_courts_settings.sql`
3. Esegui la query

## Valori Predefiniti
Dopo la migration, saranno automaticamente creati 4 campi:
- Campo 1 (display_order: 1)
- Campo 2 (display_order: 2)
- Campo 3 (display_order: 3)
- Campo 4 (display_order: 4)

## Permessi (RLS)
- **SELECT**: Tutti gli utenti autenticati
- **INSERT/UPDATE/DELETE**: Solo admin e gestore

## Funzionalità Future
In futuro sarà possibile implementare una pagina di amministrazione per:
- Aggiungere/rimuovere campi
- Rinominare campi
- Cambiare l'ordine di visualizzazione
- Attivare/disattivare campi

## Note Importanti
- I componenti hanno un fallback a 4 campi predefiniti se il database non è disponibile
- Il caricamento dei campi avviene all'avvio del componente
- La cache viene gestita automaticamente da Supabase
