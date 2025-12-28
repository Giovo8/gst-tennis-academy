# Schema Fixes per Tournaments - Guida Applicazione

**Ultimo aggiornamento**: 28 Dicembre 2025  
**Status**: ✅ Completato e Testato

## Panoramica

Questa guida spiega come applicare le modifiche allo schema del database per il nuovo sistema tornei semplificato.

## Cosa è stato modificato

### Modifiche Database
- ✅ Colonne rinominate: `starts_at` → `start_date`, `ends_at` → `end_date`
- ✅ Rimossa colonna obsoleta: `created_by`
- ✅ Aggiunte colonne per sistema tornei: `tournament_type`, `num_groups`, `teams_per_group`, `teams_advancing`, `current_phase`
- ✅ Nuove tabelle: `tournament_groups`, `tournament_matches`
- ✅ Funzioni helper SQL per gestione gironi e statistiche
- ✅ Trigger automatici per aggiornamento statistiche partecipanti

### Modifiche Codice
- ✅ Tutti i file frontend/backend aggiornati per usare `start_date/end_date`
- ✅ Rimossi riferimenti a `created_by` da tutte le API
- ✅ Nuovi componenti UI: SimpleTournamentCreator, TournamentManager, EliminationBracketView, GroupStageView, ChampionshipStandingsView

## Come Applicare

### Metodo 1: Usa la Migrazione Completa (RACCOMANDATO per nuove installazioni)

Se stai configurando il database da zero o vuoi riapplicare tutto:

1. Apri **Supabase Dashboard → SQL Editor**
2. Esegui nell'ordine:
   ```sql
   -- Prima esegui lo schema principale
   \i supabase/schema.sql
   
   -- Poi esegui la migrazione tornei
   \i supabase/migrations/010_simplified_tournament_system.sql
   ```

### Metodo 2: Usa il Fix Rapido (RACCOMANDATO per aggiornare installazioni esistenti)

Se hai già un database configurato e vuoi solo aggiornarlo:

1. Apri **Supabase Dashboard → SQL Editor**
2. Esegui il fix rapido:
   ```sql
   \i supabase/FIX_TOURNAMENTS_SCHEMA.sql
   ```

Questo script:
- ✅ Rinomina automaticamente le colonne obsolete
- ✅ Rimuove colonne non più necessarie
- ✅ Aggiunge tutte le colonne mancanti
- ✅ Crea tabelle, indici e trigger
- ✅ È idempotente (può essere eseguito più volte senza problemi)

## Verifiche Post-Applicazione

Dopo aver applicato il fix, verifica che tutto funzioni:

1. **Controlla le colonne della tabella tournaments:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'tournaments' 
   ORDER BY ordinal_position;
   ```

   Dovresti vedere:
   - ✅ `start_date` (NOT starts_at)
   - ✅ `end_date` (NOT ends_at)
   - ✅ `status` (TEXT)
   - ✅ `tournament_type` (VARCHAR)
   - ✅ `num_groups`, `teams_per_group`, `teams_advancing` (INT)
   - ✅ `current_phase` (VARCHAR)
   - ✅ `entry_fee`, `surface_type`, `match_format`
   - ❌ NO `created_by` (rimossa)

2. **Prova a creare un torneo dalla dashboard:**
   - Dashboard Admin/Gestore → Tornei
   - Clicca "Nuovo Torneo"
   - Compila il wizard in 3 step
   - Verifica che venga creato senza errori

3. **Verifica la pagina pubblica:**
   - Vai su `/tornei`
   - Clicca su un torneo
   - Verifica che le date vengano visualizzate correttamente

## File Modificati nel Codice

Tutti i file sono stati aggiornati per usare le colonne corrette:

### Frontend
- ✅ `src/app/tornei/[id]/page.tsx` - Usa `start_date/end_date`
- ✅ `src/app/tornei/page.tsx` - Usa `start_date`
- ✅ `src/components/landing/TournamentsSection.tsx` - Usa `start_date`
- ✅ `src/app/dashboard/admin/tornei/page.tsx` - Nessun riferimento a `created_by`
- ✅ `src/app/dashboard/gestore/tornei/page.tsx` - Nessun riferimento a `created_by`

### Backend API
- ✅ `src/app/api/tournaments/route.ts` - Rimossi riferimenti a `created_by`
- ✅ `src/app/api/tournaments/create/route.ts` - Rimosso `created_by`
- ✅ Tutti gli endpoint usano `start_date/end_date`

### Test
- ✅ `src/__tests__/tournaments.test.ts` - Aggiornato per usare `start_date`

## Problemi Comuni

### "Could not find the 'created_by' column"
- **Causa**: La colonna esiste nel vecchio schema ma non è più usata
- **Soluzione**: Applicare `FIX_TOURNAMENTS_SCHEMA.sql` che la rimuove

### "Could not find the 'status' column"  
- **Causa**: Cache dello schema obsoleta
- **Soluzione**: Il fix include `NOTIFY pgrst, 'reload schema'`

### "Could not find the 'start_date' column"
- **Causa**: Il database ha ancora `starts_at`
- **Soluzione**: Il fix rinomina automaticamente le colonne

## Comandi Utili

### Reset Cache Schema (se ancora problemi)
```sql
NOTIFY pgrst, 'reload schema';
```

### Verifica Status Migrazione
```sql
SELECT * FROM public.migrations ORDER BY created_at DESC LIMIT 5;
```

### Backup Prima di Applicare (IMPORTANTE)
Prima di applicare qualsiasi modifica allo schema, fai un backup:
- Supabase Dashboard → Database → Backups → Create backup

## Supporto

In caso di problemi:
1. Verifica di aver eseguito tutto il contenuto di `FIX_TOURNAMENTS_SCHEMA.sql`
2. Ricarica la cache: `NOTIFY pgrst, 'reload schema';`
3. Controlla i log di Supabase per errori specifici
4. Verifica che il frontend usi le versioni aggiornate dei file

---
Ultimo aggiornamento: 2025-12-28
