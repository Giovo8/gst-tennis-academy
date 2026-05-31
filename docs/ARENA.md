# Arena — Sfide 1v1

L'**Arena** è il sistema competitivo a ranking in cui gli atleti (e i maestri) si sfidano in
partite individuali, scalando una classifica basata su punti e livelli.

---

## Panoramica

Gli utenti possono:

- Sfidare altri giocatori in partite 1v1 (singolo o doppio).
- Scalare una classifica basata su punti, vittorie e livelli.
- Visualizzare profili e statistiche degli avversari.
- Prenotare un campo direttamente per la sfida accettata.
- Comunicare tramite la chat interna.

Tabelle coinvolte: `arena_challenges` e `arena_stats` (vedi [DATABASE.md](DATABASE.md)).

---

## Ciclo di vita di una sfida

```
pending → accepted → awaiting_score → completed
   │           │
   │           └──→ counter_proposal (controproposta orario/formato)
   └──→ declined / cancelled
```

| Stato | Significato |
|-------|-------------|
| `pending` | Sfida inviata, in attesa di risposta |
| `accepted` | Avversario ha accettato |
| `counter_proposal` | Controproposta di data/formato |
| `declined` | Sfida rifiutata |
| `awaiting_score` | Partita giocata, in attesa di inserimento punteggio |
| `completed` | Sfida conclusa con vincitore e punteggio |
| `cancelled` | Sfida annullata |

### Flusso nelle dashboard

1. **Scelta avversario** — `/dashboard/atleta/arena/choose-opponent`
2. **Configurazione sfida** — `/dashboard/atleta/arena/configure-challenge/[opponentId]`
   (tipo match, formato, data/ora, campo, messaggio)
3. **Gestione sfida** — `/dashboard/atleta/arena/challenge/[id]`
   (accetta, rifiuta, controproponi, inserisci punteggio)

---

## Regole della partita

- **Tipi di match**: singolo o doppio.
- **Formato**: best of 1, best of 3, best of 5 set.
- **Nessun pareggio**: una partita di tennis deve avere un vincitore; il sistema impedisce i pari
  (vincolo `check_completed_has_winner`).
- **Punteggio**: inserito set-per-set (es. `6-4, 6-2`).

---

## Sistema di punteggio

Dalla migrazione **045/046**, i punti dipendono dal **risultato della partita** (set vinti/persi),
non da un valore fisso. La funzione `update_arena_stats_on_challenge_complete()` aggiorna le
statistiche al completamento.

| Risultato | Punti vincitore | Punti perdente |
|-----------|-----------------|----------------|
| Cappotto (2-0 o 3-0) | **+30** | +0 |
| Combattuta (2-1 o 3-2) | **+20** | +10 |
| Best of 5, 3-1 | **+25** | +5 |

Al completamento vengono ricalcolati: `points`, `win_rate`, `current_streak`,
`longest_win_streak`, `sets_won` e il `ranking` globale.

---

## Livelli

Il livello (`level`) è determinato dai punti accumulati:

| Livello | Punti |
|---------|-------|
| 🥉 Bronzo | < 800 |
| 🥈 Argento | ≥ 800 |
| 🥇 Oro | ≥ 1500 |
| 💠 Platino | ≥ 2000 |
| 💎 Diamante | ≥ 2500 |

---

## Ruolo del maestro

I maestri possono partecipare all'Arena e gestire le sfide dalla propria dashboard
(`/dashboard/maestro/arena`). La classifica filtra gli account admin/gestore privi del ruolo
maestro, in modo da mostrare solo i giocatori effettivi.

---

## Controlli amministrativi

Gli admin possono:

- Creare sfide per conto di altri utenti.
- Modificare dettagli ed esiti delle sfide e correggere risultati errati.
- Gestire l'intero ciclo di vita delle sfide.
- **Reset stagione** via `/api/arena/reset-season` (richiede `confirm: "RESET_ARENA_SEASON"`),
  azione registrata in `activity_log`.

---

## Endpoint principali

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/arena/players` | Lista giocatori con statistiche |
| `GET/POST /api/arena/challenges` | Lista e creazione sfide |
| `GET /api/arena/challenges/[id]` | Dettaglio sfida |
| `GET /api/arena/stats` | Statistiche utente o classifica |
| `POST /api/arena/reset-season` | Reset della stagione (admin) |

Vedi [API.md](API.md) per i dettagli.
