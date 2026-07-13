# Arena — Sistema sfide 1v1

L'Arena è il modulo competitivo della piattaforma: gli atleti (e i maestri) si sfidano in match 1v1 (singolo o doppio), accumulano punti, salgono di livello e compaiono in classifica. Tutta la logica di punteggio vive nel database (trigger PostgreSQL), non nel codice applicativo.

## Tabelle

| Tabella | Contenuto |
|---|---|
| `arena_challenges` | Le sfide: sfidante/avversario (+ eventuali partner per il doppio), stato, data programmata, campo, `booking_id` collegato, formato match, tipo sfida, vincitore, punteggio (`score`, es. `"6-4, 3-6, 6-2"`) |
| `arena_stats` | Statistiche per giocatore: `points`, `ranking`, `wins`/`losses`/`total_matches`, `win_rate`, `sets_won`, `current_streak`, `longest_win_streak`, `level`, `last_match_date` |

RLS: le sfide sono visibili solo ai partecipanti (più admin/gestore/maestro); le `arena_stats` sono leggibili da tutti (classifica pubblica interna), scrivibili solo da admin/gestore o dai trigger (SECURITY DEFINER).

## Flusso di una sfida

Stati validi (`arena_challenges_status_check`, migrazione `042`):

```
pending → accepted → awaiting_score → completed
   │          │
   │          └→ counter_proposal → accepted | declined
   └→ declined | cancelled
```

| Stato | Significato |
|---|---|
| `pending` | Sfida creata, in attesa di risposta dell'avversario |
| `accepted` | Sfida accettata (le sfide create da admin/gestore nascono già `accepted`) |
| `counter_proposal` | L'avversario ha proposto modifiche (data/campo/formato); lo sfidante conferma o rifiuta |
| `awaiting_score` | Match giocato, in attesa dell'inserimento del risultato |
| `completed` | Risultato inserito con `winner_id` obbligatorio (niente pareggi) |
| `declined` / `cancelled` | Rifiutata / annullata (l'annullamento cancella anche la prenotazione campo collegata) |

Transizioni automatiche (in `src/lib/arena/challengeService.ts`, eseguite a ogni GET della lista):

- `pending` con `scheduled_date` passata → `cancelled`
- `accepted` con orario prenotazione/data passati → `awaiting_score`

Ogni cambio di stato genera notifiche in-app (`notifications`) e messaggi interni (`internal_messages`) ai giocatori coinvolti.

### Configurazione match

Costanti in `src/lib/arena/arenaConstants.ts`:

- **Formato** (`match_format`): `best_of_1` (Set Singolo), `best_of_3` (default), `best_of_5`
- **Tipo sfida** (`challenge_type`): `ranked` (Classificata, assegna punti) o `amichevole`
- **Tipo match** (`match_type`): `singolo` (default) o `doppio` (con `my_partner_id` / `opponent_partner_id`)
- La sfida può essere collegata a una prenotazione campo (`booking_id`)

## Sistema punti

Implementato nel trigger `update_arena_stats_on_challenge_complete()` su `arena_challenges` (migrazioni `045_update_arena_points_system.sql` e `046_add_sets_won_to_arena_stats.sql`). Scatta quando lo stato diventa `completed` con `winner_id` valorizzato; il punteggio a set viene ricavato parsando la stringa `score`. I punti vengono **solo aggiunti**, mai sottratti.

| Formato | Risultato | Vincitore | Perdente |
|---|---|---|---|
| Set singolo | 1–0 | +30 | +0 |
| Best of 3 | 2–0 | +30 | +0 |
| Best of 3 | 2–1 | +20 | +10 |
| Best of 5 | 3–0 | +30 | +0 |
| Best of 5 | 3–1 | +25 | +5 |
| Best of 5 | 3–2 | +20 | +10 |

Regola effettiva del trigger: perdente a 0 set → 30/0; vincitore 3 set e perdente 1 → 25/5; ogni altro caso (match combattuto) → 20/10.

Oltre ai punti, il trigger aggiorna: `wins`/`losses`/`total_matches`, `win_rate`, `sets_won`, streak (`current_streak` positivo per vittorie consecutive, negativo per sconfitte; `longest_win_streak` come massimo storico) e ricalcola il `ranking` globale ordinando per `points DESC, wins DESC, win_rate DESC`.

## Livelli

Colonna `arena_stats.level`, ricalcolata automaticamente dal trigger `trigger_update_arena_level` → `calculate_arena_level(points)` (definita in `supabase/scripts/fixes/FIX_ARENA_LEVELS.sql`):

| Livello | Punti richiesti |
|---|---|
| Bronzo | 0–49 |
| Argento | 50–149 |
| Oro | 150–299 |
| Platino | 300–499 |
| Diamante | ≥ 500 |

Nota: la dashboard admin (`src/app/dashboard/admin/(main)/arena/page.tsx`) normalizza la visualizzazione su tre fasce (Bronzo/Argento/Oro, con Platino e Diamante mostrati come Oro).

## API

Handler in `src/app/api/arena/`. Autenticazione richiesta su tutte le route.

| Route | Metodi | Note |
|---|---|---|
| `/api/arena/challenges` | GET, POST, PATCH, PUT, DELETE | GET: lista (filtri `user_id`, `status`) o singola (`challenge_id`). POST: creazione — solo admin/gestore possono creare a nome altrui; le loro sfide nascono `accepted`. PATCH/PUT: cambio stato, risultato (`completed` richiede `winner_id`), controproposta; `cancelled` annulla anche il booking collegato con rollback in caso di errore |
| `/api/arena/challenges/[id]` | GET, PATCH, DELETE | Operazioni sulla singola sfida |
| `/api/arena/players` | GET | Elenco giocatori sfidabili con `arena_stats`; l'email è inclusa solo per admin/gestore |
| `/api/arena/stats` | GET, POST | GET: stats di un utente (`user_id`, creata al volo se assente) o leaderboard (default 100, ordinata per punti). Esclude dalla classifica admin/gestore senza ruolo secondario `maestro`. POST: upsert manuale, solo admin |
| `/api/arena/reset-season` | POST | Solo admin. Richiede `{ "confirm": "RESET_ARENA_SEASON" }` nel body; registra l'operazione in `activity_logs`, poi **cancella tutte** le sfide e le statistiche |

## Pagine

| Area | Percorso | Pagine |
|---|---|---|
| Atleta | `src/app/dashboard/atleta/(main)/arena/` | home Arena (classifica), `choose-opponent`, `configure-challenge/[opponentId]`, `challenge/[id]`, `info` (regole e tabella punti) |
| Maestro | `src/app/dashboard/maestro/(main)/arena/` | come atleta + `statistiche`, `storico` |
| Admin | `src/app/dashboard/admin/(main)/arena/` | overview e classifica, `create-challenge`, `challenge/[id]` (+ `edit`), reset stagione |
