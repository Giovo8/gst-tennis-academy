# 🎯 Arena - Guida Rapida Setup

## ⚡ Setup Veloce (3 minuti)

### Step 1: Esegui SQL nel Database

1. Apri **Supabase Dashboard** → **SQL Editor**
2. Copia e incolla il contenuto di `supabase/CREATE_ARENA_CHALLENGES.sql`
3. Click su **Run** o premi `Ctrl+Enter`

### Step 2: Verifica

Esegui questa query per verificare:

```sql
-- Dovrebbe restituire 2 tabelle
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('arena_challenges', 'arena_stats');

-- Verifica che ci siano stats per gli atleti esistenti
SELECT COUNT(*) as atleti_con_stats 
FROM arena_stats;
```

### Step 3: Testa l'Arena

1. Vai a `/dashboard/atleta`
2. Click su **Arena** nel menu laterale
3. Dovresti vedere:
   - Le tue statistiche (inizialmente a 0)
   - Classifica vuota (o con altri atleti se già registrati)
   - Pulsante "Lancia Sfida"

---

## ✨ Funzionalità Principali

### 🎮 Per Atleti

1. **Lancia Sfida**
   - Clicca su un giocatore nella classifica
   - Oppure usa "Lancia Sfida" random
   - Aggiungi messaggio opzionale

2. **Gestisci Sfide**
   - Accetta/Rifiuta sfide ricevute
   - Prenota campo per sfide accettate
   - Comunica con avversari via chat

3. **Scala la Classifica**
   - Vinci partite → guadagna punti
   - Raggiungi livelli superiori
   - Sblocca badge (prossima versione)

### 🔧 Per Amministratori

Gli admin possono:
- Vedere tutte le sfide in corso
- Modificare manualmente stats se necessario
- Risolvere dispute

---

## 📊 Sistema Punti

| Azione | Punti | Note |
|--------|-------|------|
| Vittoria | +50 | Più streak, più soddisfazione! |
| Sconfitta | -20 | I punti non scendono sotto 0 |
| Livello Bronzo | 0-799 | Punto di partenza |
| Livello Argento | 800-1499 | Giocatore esperto |
| Livello Oro | 1500-1999 | Competitivo |
| Livello Platino | 2000-2499 | Elite |
| Livello Diamante | 2500+ | Leggenda |

---

## 🚀 Prossimi Passi Consigliati

1. **Popola con dati di test** (opzionale):
   ```sql
   -- Crea qualche sfida di test
   INSERT INTO arena_challenges (challenger_id, opponent_id, status, message)
   SELECT 
     (SELECT id FROM profiles WHERE role = 'atleta' LIMIT 1 OFFSET 0),
     (SELECT id FROM profiles WHERE role = 'atleta' LIMIT 1 OFFSET 1),
     'pending',
     'Ti sfido a una partita!';
   ```

2. **Testa il flusso completo**:
   - Crea sfida
   - Accettala (con altro account o admin)
   - Prenota campo
   - Completa sfida con vincitore
   - Verifica stats aggiornate

3. **Personalizza** (opzionale):
   - Modifica punti per vittoria/sconfitta
   - Aggiungi livelli custom
   - Personalizza messaggi notifiche

---

## ❓ FAQ

**Q: Le stats non si aggiornano dopo aver completato una sfida**  
A: Assicurati di aver impostato sia `status='completed'` che `winner_id`. Il trigger si attiva solo quando entrambi sono presenti.

**Q: Posso modificare manualmente i punti di un giocatore?**  
A: Sì, come admin:
```sql
UPDATE arena_stats 
SET points = 1500, level = 'Oro' 
WHERE user_id = 'UUID_GIOCATORE';
```

**Q: Come resetto le statistiche di tutti?**  
A: 
```sql
UPDATE arena_stats 
SET points = 0, wins = 0, losses = 0, total_matches = 0, 
    win_rate = 0, current_streak = 0, level = 'Bronzo';
```

**Q: Posso creare tornei Arena?**  
A: Non ancora, ma è in roadmap! Per ora solo sfide 1v1.

---

## 🐛 Problemi Comuni

### Errore: "RLS policy violation"
- Verifica di aver eseguito tutto lo script SQL
- Controlla che l'utente sia autenticato
- Verifica il ruolo (deve essere 'atleta')

### Sfida non appare
- Controlla che `challenger_id` e `opponent_id` siano validi
- Verifica che siano atleti registrati
- Guarda la console per errori API

### Stats non esistono
- Esegui:
  ```sql
  INSERT INTO arena_stats (user_id)
  SELECT id FROM profiles WHERE role = 'atleta'
  ON CONFLICT DO NOTHING;
  ```

---

## 📞 Supporto

Per problemi o domande:
1. Controlla [ARENA.md](./ARENA.md) per documentazione completa
2. Verifica log Supabase per errori
3. Usa gli strumenti di debug browser (F12)

---

**Buon divertimento con Arena! 🏆**
