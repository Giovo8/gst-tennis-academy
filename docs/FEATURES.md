# Features Documentation - GST Tennis Academy

**Ultima revisione**: 30 Dicembre 2025  
**Versione**: 2.0

## Panoramica

GST Tennis Academy è una piattaforma web completa per la gestione di un'accademia di tennis. Include funzionalità per utenti, prenotazioni, tornei, corsi, messaggistica e molto altro.

---

## Sistema Multi-Ruolo

### Ruoli Utente

#### 1. Atleta (`atleta`)
- **Dashboard**: `/dashboard/athlete`
- **Funzionalità**:
  - Prenotazione campi
  - Visualizzazione corsi disponibili
  - Iscrizione tornei
  - Gestione profilo personale
  - Messaggistica con maestri e staff
  - Visualizzazione storico prenotazioni
  - Accesso news e annunci

#### 2. Maestro/Coach (`maestro`)
- **Dashboard**: `/dashboard/maestro`
- **Funzionalità**:
  - Visualizzazione tutte le prenotazioni
  - Gestione lezioni private/gruppo
  - Calendario completo
  - Creazione e gestione corsi
  - Inserimento risultati tornei
  - Messaggistica con atleti
  - Gestione disponibilità

#### 3. Gestore (`gestore`)
- **Dashboard**: `/dashboard/admin`
- **Funzionalità**:
  - Gestione utenti (no admin)
  - Creazione account atleti, coach, gestori
  - Gestione tornei completa
  - Gestione corsi
  - Visualizzazione statistiche
  - Gestione news e annunci
  - Moderazione chat
  - Gestione prenotazioni

#### 4. Admin (`admin`)
- **Dashboard**: `/dashboard/admin`
- **Funzionalità**:
  - Accesso completo a tutte le funzionalità
  - Creazione altri admin
  - Gestione configurazione sistema
  - Accesso logs email
  - Gestione staff e subscriptions
  - Configurazione homepage

---

## Sistema Prenotazioni

### Tipi di Prenotazione

1. **Prenotazione Campo** (`campo`)
   - Selezione campo (1-8)
   - Selezione data e orario
   - Durata configurabile (30min, 1h, 1.5h, 2h)
   - Prevenzione sovrapposizioni automatica

2. **Lezione Privata** (`lezione_privata`)
   - Prenotazione campo + assegnazione maestro
   - Calendario sincronizzato con maestro
   - Notifiche email automatiche

3. **Lezione di Gruppo** (`lezione_gruppo`)
   - Prenotazione per gruppi
   - Sistema crediti settimanali per abbonamenti
   - Gestione capienza massima

### Features Prenotazioni

- **Calendario Interattivo**: Visualizzazione disponibilità in tempo reale
- **Filtri**: Per campo, tipo prenotazione, maestro
- **Conferme Email**: Automatiche tramite sistema email
- **Cancellazione**: Possibile fino a X ore prima (configurabile)
- **Storico**: Visualizzazione prenotazioni passate
- **Statistiche**: Per utente e per campo

### Vincoli

- Nessuna sovrapposizione su stesso campo (gestito da DB)
- Orari di apertura: 08:00 - 22:00 (configurabile)
- Durata minima: 30 minuti
- Preavviso cancellazione: 24 ore

---

## Sistema Tornei (v2.0 Semplificato)

### 3 Tipi di Torneo

#### 1. Eliminazione Diretta (`eliminazione_diretta`)

**Caratteristiche**:
- Bracket classico ad eliminazione
- Partecipanti: 2, 4, 8, 16, 32, 64, 128
- Seeding automatico
- Round: ottavi → quarti → semifinali → finale

**Workflow**:
```
1. Creazione torneo
2. Iscrizioni atleti
3. Chiusura iscrizioni
4. Generazione bracket automatico
5. Inserimento risultati partite
6. Avanzamento automatico vincitori
7. Completamento torneo
```

**Generazione Bracket**:
- Algoritmo seeding standard
- Bye automatici se partecipanti < potenza di 2
- Posizionamento teste di serie

#### 2. Girone + Eliminazione (`girone_eliminazione`)

**Caratteristiche**:
- Fase a gironi (round-robin)
- Fase eliminazione diretta per qualificati
- Configurazione gironi:
  - Numero gironi: 2-8
  - Partecipanti per girone: 3-8
  - Qualificati per girone: 1-4

**Workflow**:
```
1. Creazione torneo con configurazione gironi
2. Iscrizioni atleti
3. Generazione gironi automatica (distribuzione bilanciata)
4. Generazione partite gironi
5. Inserimento risultati fase gironi
6. Calcolo classifiche automatico
7. Avanzamento migliori X per girone
8. Generazione bracket eliminazione
9. Fase eliminazione diretta
10. Completamento torneo
```

**Calcolo Classifica Gironi**:
- Punti: 2 vittoria, 0 sconfitta
- Criteri ordine:
  1. Punti totali
  2. Differenza set
  3. Differenza game
  4. Scontro diretto (se applicabile)

#### 3. Campionato (`campionato`)

**Caratteristiche**:
- Round-robin (tutti contro tutti)
- Classifica unica
- Nessuna fase eliminazione

**Workflow**:
```
1. Creazione campionato
2. Iscrizioni atleti
3. Generazione calendario partite (tutti vs tutti)
4. Inserimento risultati
5. Aggiornamento classifica automatico
6. Completamento campionato
```

### Features Tornei

**Gestione Partecipanti**:
- Iscrizione manuale da admin
- Auto-iscrizione atleti
- Ricerca utenti con filtri
- Rimozione partecipanti (solo fase iscrizioni)
- Visualizzazione lista partecipanti

**Gestione Partite**:
- Visualizzazione bracket/gironi
- Inserimento punteggi dettagliati (set per set)
- Validazione risultati
- Aggiornamento statistiche automatico
- Notifiche avanzamenti

**Statistiche Partecipanti**:
- Partite giocate
- Vittorie/Sconfitte
- Set vinti/persi
- Game vinti/persi
- Punti classifica

**Visualizzazioni**:
- Bracket ad eliminazione interattivo
- Gironi con classifiche
- Calendario partite
- Storico risultati

**Stati Torneo**:
- `Aperto`: Iscrizioni aperte
- `In Corso`: Torneo iniziato
- `Concluso`: Torneo terminato
- `Annullato`: Torneo cancellato

**Fasi Torneo**:
- `iscrizioni`: Raccolta partecipanti
- `gironi`: Fase a gironi (se applicabile)
- `eliminazione`: Fase eliminazione diretta
- `completato`: Torneo finito
- `annullato`: Torneo cancellato

---

## Sistema Corsi

### Gestione Corsi

**Campi Corso**:
- Titolo e descrizione
- Coach assegnato
- Date inizio/fine
- Orari (schedule testuale o JSON)
- Capienza massima
- Prezzo
- Livello: principiante, intermedio, avanzato
- Fascia età: bambini, junior, adulti, senior
- Immagine corso

**Stati Corso**:
- Attivo/Inattivo
- Posti disponibili
- Partecipanti attuali

### Iscrizioni Corsi

**Features**:
- Iscrizione online atleti
- Gestione stato iscrizione: pending, confirmed, cancelled, completed
- Stato pagamento: pending, paid, refunded
- Conferme email automatiche
- Lista d'attesa se corso pieno
- Storico iscrizioni per utente

**Workflow Iscrizione**:
```
1. Atleta visualizza corsi disponibili
2. Clicca "Iscriviti"
3. Sistema verifica posti disponibili
4. Crea enrollment con status 'pending'
5. Invia email conferma
6. Gestore conferma iscrizione
7. Atleta effettua pagamento
8. Status → 'confirmed' e 'paid'
9. Corso inizia
10. Al termine: status → 'completed'
```

---

## Sistema Messaggistica

### Conversazioni

**Tipi**:
- **1-to-1**: Chat privata tra due utenti
- **Gruppo**: Chat di gruppo con più partecipanti

**Features**:
- Conversazioni in tempo reale (polling o websocket)
- Stato lettura messaggi
- Contatore non letti
- Anteprima ultimo messaggio
- Ricerca conversazioni
- Archiviazione conversazioni
- Mute notifiche

### Messaggi

**Tipi Messaggio**:
- `text`: Messaggio testuale
- `image`: Immagine allegata
- `file`: File allegato
- `system`: Messaggio di sistema
- `booking`: Condivisione prenotazione
- `lesson`: Condivisione lezione

**Features**:
- Invio messaggi testuali
- Upload file e immagini
- Modifica messaggi inviati
- Eliminazione messaggi
- Risposta a messaggi (threading)
- Timestamp e stato lettura
- Paginazione messaggi

### Partecipanti Conversazione

**Campi**:
- Data adesione
- Ultima lettura
- Contatore non letti
- Admin conversazione (per gruppi)
- Mute/Archived status

---

## Sistema Email

### Email Transazionali

**Provider**: Resend (configurabile)

**Template Disponibili**:
- `booking_confirmation`: Conferma prenotazione
- `booking_reminder`: Promemoria prenotazione
- `booking_cancelled`: Cancellazione prenotazione
- `tournament_registration`: Iscrizione torneo
- `tournament_match_scheduled`: Partita programmata
- `tournament_results`: Risultati partita
- `course_enrollment`: Iscrizione corso
- `course_reminder`: Promemoria inizio corso
- `welcome`: Email benvenuto nuovi utenti
- `password_reset`: Reset password

### Gestione Template

**Campi Template**:
- Nome univoco
- Display name
- Descrizione
- Subject con placeholder
- HTML template
- Text fallback
- Categoria: transactional, marketing, notification, system
- Variabili disponibili (array JSON)
- Stato attivo/inattivo

**Placeholder System**:
```html
Subject: Conferma Prenotazione - {{court_name}}

Ciao {{user_name}},

La tua prenotazione per {{court_name}} 
il {{booking_date}} alle {{booking_time}} è confermata.
```

### Email Logs

**Tracking**:
- Destinatario
- Template usato
- Dati template (JSON)
- Status: pending, sent, delivered, failed, bounced, opened, clicked
- Provider message ID
- Timestamp invio/consegna/apertura/click
- Errori e retry count
- Metadata aggiuntivi

### Unsubscribe

**Features**:
- Gestione disiscrizione per tipo
- Tipi: all, marketing, notifications
- Motivo disiscrizione
- Rispetto preferenze in invii automatici

### Webhooks

**Eventi Resend**:
- `email.sent`: Email inviata
- `email.delivered`: Email consegnata
- `email.opened`: Email aperta
- `email.clicked`: Link cliccato
- `email.bounced`: Email rimbalzata
- `email.failed`: Invio fallito

**Endpoint**: `/api/webhooks/email`

---

## News e Annunci

### News

**Campi**:
- Titolo
- Categoria
- Sommario
- Immagine
- Data pubblicazione
- Stato pubblicato/bozza
- Autore

**Categorie**:
- Tornei
- Corsi
- Eventi
- Generale
- Risultati

**Features**:
- Pubblicazione programmata
- Bozze
- Editor rich text
- Upload immagini
- Filtro per categoria
- Paginazione
- SEO metadata

### Annunci

Sistema annunci gestito tramite migrazione 006_announcements_system.sql

**Features**:
- Annunci homepage
- Popup annunci urgenti
- Data scadenza
- Priorità visualizzazione

---

## Dashboard e Statistiche

### Dashboard Atleta

**Widget**:
- Prossime prenotazioni
- Tornei attivi
- Corsi iscritti
- Messaggi non letti
- News recenti

### Dashboard Maestro

**Widget**:
- Calendario lezioni giornaliero
- Prossime lezioni private
- Corsi gestiti
- Statistiche mensili (ore insegnamento, atleti seguiti)

### Dashboard Admin

**Widget**:
- Statistiche generali:
  - Utenti totali (per ruolo)
  - Prenotazioni oggi/settimana
  - Tornei attivi
  - Corsi attivi
  - Revenue mensile
- Grafici:
  - Prenotazioni nel tempo
  - Iscrizioni tornei
  - Partecipazione corsi
- Quick actions:
  - Crea torneo
  - Crea corso
  - Crea news
  - Gestisci utenti

---

## Pagamenti e Abbonamenti

### Subscription Credits

**Sistema**:
- Piano abbonamento con crediti settimanali
- Reset automatico ogni lunedì
- Tracciamento crediti disponibili
- Consumo credito per lezioni gruppo

**Piani**:
- Monosettimanale: 1 credito/settimana
- Bisettimanale: 2 crediti/settimana
- Trisettimanale: 3 crediti/settimana
- Personalizzati

**Funzioni**:
```sql
-- Reset automatico crediti (cron job)
reset_weekly_credits()

-- Consuma credito
consume_group_credit(user_id)
```

### Payments

**Tracciamento Pagamenti**:
- Tipo: subscription, booking, course, event, product
- Metodo: stripe, cash, bank_transfer
- Status: pending, completed, failed, refunded
- Link a risorsa correlata (reference_id)
- Metadata aggiuntivi

**Integrazione Stripe** (opzionale):
- Checkout sessions
- Payment intents
- Webhooks per conferme
- Gestione refund

---

## Homepage Dinamica

### Sezioni Configurabili

**Gestione via Admin**:
- Hero section con immagini
- Sezioni servizi
- Sezione staff
- Sezione tornei
- Sezione news
- Footer con contatti

**API**: `/api/homepage-sections`

**Features**:
- Ordinamento sezioni
- Abilitazione/Disabilitazione
- Contenuto dinamico
- Immagini responsive

---

## SEO e Performance

### SEO

**Features**:
- Metadata dinamici per pagina
- Open Graph tags
- Twitter cards
- Sitemap.xml generato
- Robots.txt
- Schema.org markup

**Componenti**:
- `<MetaTags />`: Metadata dinamici
- `<JsonLd />`: Structured data

### Performance

**Ottimizzazioni**:
- Next.js Image optimization
- Code splitting automatico
- Font optimization
- CSS modules
- API route caching headers
- Database indexing ottimizzato

---

## Sicurezza

### Row Level Security (RLS)

**Tutte le tabelle** hanno policies RLS:
- Utenti vedono solo i propri dati
- Admin/Gestore accesso completo
- Maestri accesso lezioni/prenotazioni
- Protezione da SQL injection

### Autenticazione

**Supabase Auth**:
- JWT tokens
- Email + Password
- OAuth providers (opzionale)
- Password reset
- Email verification

### Authorization

**Middleware**:
- Verifica ruolo utente
- Service role per admin APIs
- CSRF protection
- Rate limiting (da implementare)

---

## Testing

### Test Implementati

**File Test**:
- `__tests__/tournaments.test.ts`: Test sistema tornei
- `__tests__/tournament-flows.test.ts`: Test flussi completi

**Coverage**:
- Creazione tornei
- Iscrizione partecipanti
- Generazione gironi e bracket
- Inserimento risultati
- Calcolo statistiche

**Script**:
```bash
npm test                    # Run tutti i test
npm test tournaments        # Test tornei
npm test -- --coverage      # Con coverage
```

---

## Deployment

### Requisiti

- Node.js 18+
- PostgreSQL 14+ (via Supabase)
- Provider email (Resend)
- Storage per file (Supabase Storage)

### Variabili Ambiente

**Essenziali**:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```

**Opzionali**:
```env
NEXT_PUBLIC_SITE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Platform

**Consigliato**: Vercel
- Deploy automatico da Git
- Edge functions
- Preview deployments
- Analytics integrato

---

## Prossimi Sviluppi

### Roadmap

**In Pianificazione**:
- [ ] App mobile (React Native)
- [ ] Sistema notifiche push
- [ ] Pagamenti Stripe completi
- [ ] Video lezioni on-demand
- [ ] Live streaming tornei
- [ ] Classifica ATP-style
- [ ] Statistiche avanzate match
- [ ] Sistema referral atleti
- [ ] Calendario Google sync
- [ ] Export PDF certificati/diplomi

**In Valutazione**:
- [ ] Multi-tenancy per più academy
- [ ] Marketplace attrezzatura
- [ ] Social features (feed, like, commenti)
- [ ] Gamification (badges, achievements)
- [ ] AI match analysis
- [ ] Prenotazioni ricorrenti automatiche

---

**Fine Documentazione Features**
