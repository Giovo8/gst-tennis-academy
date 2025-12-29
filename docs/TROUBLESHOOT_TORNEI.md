# Troubleshooting Tornei Homepage

## Problema
I link ai tornei dalla homepage non funzionano.

## Checklist Diagnostica

### 1. Database
- [ ] Verificare che la tabella `tournaments` esista
- [ ] Verificare che ci siano tornei nel database
- [ ] Verificare che la migration `add_tornei_to_homepage_sections.sql` sia applicata
- [ ] Verificare che `homepage_sections` abbia il record per "tornei"

### 2. API
- [ ] Test: `GET /api/tournaments?upcoming=true`
- [ ] Dovrebbe restituire: `{ tournaments: [...] }`
- [ ] Verificare console del browser per errori

### 3. Frontend
- [ ] Verificare che `TournamentsSection` venga renderizzato
- [ ] Controllare console browser per errori di fetch
- [ ] Verificare che i link siano nel formato `/tornei/${id}`

### 4. Routing
- [ ] Pagina `/tornei` esiste: ✅ `src/app/tornei/page.tsx`
- [ ] Pagina `/tornei/[id]` esiste: ✅ `src/app/tornei/[id]/page.tsx`

## Test Rapido

### Test API dalla console browser
```javascript
// Apri browser → Console → Esegui:
fetch('/api/tournaments?upcoming=true')
  .then(r => r.json())
  .then(d => console.log('Tornei:', d))
```

### Test Database (Supabase Dashboard)
```sql
-- SQL Editor su Supabase
SELECT * FROM tournaments LIMIT 5;
SELECT * FROM homepage_sections WHERE section_key = 'tornei';
```

## Possibili Cause

1. **Nessun torneo nel database**
   - Soluzione: Creare almeno un torneo di test

2. **Migration non applicata**
   - Soluzione: Applicare `add_tornei_to_homepage_sections.sql`

3. **Errore nell'API**
   - Controllare logs Next.js per errori

4. **Campo mancante nel database**
   - Controllare che la tabella tournaments abbia i campi: id, title, start_date, max_participants, tournament_type, status

## Fix Applicati
✅ BracketMatchCard.tsx - Rimosso codice duplicato
