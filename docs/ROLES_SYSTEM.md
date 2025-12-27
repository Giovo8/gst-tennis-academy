# Sistema Gestione Ruoli - GST Tennis Academy

## Panoramica

Il sistema di gestione ruoli permette agli amministratori di creare e gestire account per atleti, coach e altri admin.

## Ruoli Disponibili

### 1. **Atleta** (`atleta`)
- Ruolo base per tutti gli iscritti
- Accesso a:
  - Dashboard atleta (`/dashboard/athlete`)
  - Prenotazione campi
  - Visualizzazione corsi
  - Gestione profilo personale

### 2. **Coach** (`maestro`)
- Per allenatori e istruttori
- Accesso a:
  - Dashboard coach (`/dashboard/maestro`)
  - Visualizzazione tutte le prenotazioni
  - Gestione lezioni private/gruppo
  - Calendario completo

### 3. **Gestore** (`gestore`)
- Ruolo amministrativo base
- Accesso a:
  - Dashboard admin (`/dashboard/admin`)
  - Gestione utenti (eccetto admin)
  - Creazione account atleti, coach e gestori
  - Gestione prenotazioni

### 4. **Admin** (`admin`)
- Ruolo amministrativo completo
- Accesso totale a tutte le funzionalità
- Può creare altri admin

## Funzionalità Admin

### Gestione Utenti (`/dashboard/admin/users`)

#### Creazione Nuovi Utenti
1. Clicca su "Crea Utente"
2. Inserisci:
   - **Email**: Email dell'utente (obbligatoria)
   - **Password**: Password iniziale (min 6 caratteri)
   - **Nome Completo**: Nome e cognome
   - **Ruolo**: Seleziona tra atleta, coach, gestore, admin
3. L'utente riceverà le credenziali via email (configurare SMTP in Supabase)

#### Modifica Ruoli
- Seleziona il ruolo dal dropdown nella tabella
- Il cambio viene salvato automaticamente
- L'utente verrà reindirizzato alla dashboard corretta al prossimo login

#### Eliminazione Utenti
- Clicca su "Elimina" nella riga dell'utente
- Conferma l'operazione
- **Nota**: Non puoi eliminare il tuo account mentre sei loggato

#### Ricerca Utenti
- Usa la barra di ricerca per filtrare per email o nome
- La ricerca è case-insensitive

## Setup Tecnico

### 1. Variabili d'Ambiente

Aggiungi al file `.env.local`:

```env
# Supabase URLs e Keys
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # IMPORTANTE per creare utenti
```

### 2. Database Migration

Esegui la migrazione nel SQL Editor di Supabase:

```bash
# File: supabase/migrations/improve_roles_system.sql
```

Questa migrazione:
- Aggiunge policy RLS per admin
- Crea funzioni helper per verificare ruoli
- Configura trigger per profili automatici

### 3. Politiche RLS (Row Level Security)

Le policy del database garantiscono che:
- Gli utenti vedano solo i propri dati
- Admin/Gestore possano vedere e modificare tutti i profili
- Coach possano vedere tutte le prenotazioni
- Atleti vedano solo le proprie prenotazioni

## API Endpoints

### POST `/api/admin/users`
Crea un nuovo utente (solo admin)

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Mario Rossi",
  "role": "atleta"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Mario Rossi",
    "role": "atleta"
  }
}
```

### DELETE `/api/admin/users?userId={uuid}`
Elimina un utente (solo admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true
}
```

## Sicurezza

### Autenticazione
- Tutti gli endpoint admin richiedono autenticazione JWT
- Il token viene verificato server-side
- Il ruolo viene controllato dal profilo database

### Autorizzazione
- Le route admin sono protette da `AuthGuard`
- Le API verificano il ruolo prima di eseguire operazioni
- RLS garantisce l'accesso ai dati a livello database

### Best Practices
1. Non condividere mai la `SUPABASE_SERVICE_ROLE_KEY`
2. Usa password forti per gli account admin
3. Verifica regolarmente i ruoli degli utenti
4. Mantieni il numero di admin al minimo necessario

## Troubleshooting

### "Non autorizzato" durante la creazione utente
- Verifica che la `SUPABASE_SERVICE_ROLE_KEY` sia configurata
- Controlla che il tuo account abbia ruolo admin/gestore
- Verifica che il token di sessione sia valido

### Gli utenti creati non vedono il loro profilo
- Assicurati che la migrazione sia stata eseguita
- Verifica che il trigger `on_auth_user_created` sia attivo
- Controlla le policy RLS sulla tabella `profiles`

### Errore "Permessi insufficienti"
- Verifica il ruolo del tuo account nel database
- Solo admin e gestore possono gestire utenti
- Rieffettua il login se hai appena cambiato ruolo

## Prossimi Sviluppi

- [ ] Invio email automatiche con credenziali
- [ ] Reset password da admin
- [ ] Sospensione temporanea account
- [ ] Log delle operazioni admin
- [ ] Statistiche ruoli e attività
- [ ] Bulk import utenti da CSV
