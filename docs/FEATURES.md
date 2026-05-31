# Funzionalità

Mappa completa delle funzionalità, delle pagine e dei permessi di GST Tennis Academy.

---

## Sistema prenotazioni

Tre tipi di prenotazione:

- **Campo** — prenotazione del campo senza maestro.
- **Lezione privata** — campo + maestro assegnato.
- **Lezione di gruppo** — lezione multi-partecipante con limite di capienza (max 4 atleti).

Caratteristiche:

- Calendario interattivo con disponibilità in tempo reale.
- Vincolo a livello database che impedisce le sovrapposizioni sullo stesso campo.
- Orari di apertura configurabili: lun–ven 07:00–20:30, sabato 07:00–18:00, domenica 07:00–13:00.
- Flusso di conferma multi-livello (`coach_confirmed`, `manager_confirmed`).
- Notifiche email automatiche ad atleta, maestro e gestori.
- Partecipanti registrati o ospiti, con nome/email/telefono.
- Ricerca e filtri per campo, data, tipo, maestro; storico prenotazioni.

---

## Sistema tornei

Tre tipi di competizione:

1. **Eliminazione diretta** — tabellone classico (2, 4, 8, 16, 32… partecipanti) con seeding e bye automatici.
2. **Girone + eliminazione** — fase a gironi (round-robin) seguita da knockout; distribuzione
   automatica e classifiche con tiebreak (punti → differenza set → differenza game → scontri diretti).
3. **Campionato** — round-robin "tutti contro tutti" con classifica unica.

Caratteristiche:

- Inserimento punteggi set-per-set con regole tennis autentiche (set, game, tie-break).
- Iscrizione manuale o automatica dei partecipanti.
- Rendering del tabellone in tempo reale e statistiche per partecipante.
- Workflow di stato: registrazione → in corso → concluso.
- Visibilità pubblica con possibilità di iscrizione per gli utenti loggati.

---

## Arena (sfide 1v1)

Sistema competitivo a ranking in cui gli atleti si sfidano in partite individuali. Vedi
[ARENA.md](ARENA.md) per le regole complete e il sistema di punteggio.

In sintesi: creazione sfida (singolo/doppio, best of 1/3/5), ciclo di vita
pending → accepted/declined → awaiting_score → completed, controproposte, punteggio set-per-set,
ranking automatico con livelli da **Bronzo** a **Diamante**, prenotazione campo collegata e chat.

---

## Corsi

- Creazione di corsi ricorrenti con giorni, fasce orarie, campo, capienza, prezzo e periodo.
- Programmazione avanzata: periodi multipli, date annullate, date extra, override orario.
- Iscrizioni (atleti registrati o ospiti, con quota).
- Tracciamento presenze per singola lezione.
- Sistema di crediti settimanali per le lezioni di gruppo.
- Assegnazione del maestro al corso.

---

## Video lezioni

- Libreria di video categorizzati per livello e tema.
- Assegnazione dei video a utenti specifici.
- Tracciamento delle visualizzazioni (conteggio e data per utente).
- I maestri possono creare/eliminare i propri video (migrazioni 038–039).

---

## Chat e comunicazione

- **Chat in tempo reale** con conversazioni 1:1 e di gruppo (Supabase Realtime).
- **Indicatori di presenza** (online/offline) e di digitazione.
- **Messaggi interni** con oggetto e thread.
- **Allegati** (immagini/PDF) con validazione MIME e magic bytes.
- Conteggio messaggi non letti.

---

## News e annunci

- Articoli news con categoria, immagine, stato pubblicazione e pagine di dettaglio.
- Annunci/bacheca con priorità, visibilità per ruolo, scadenza e pinning.
- Editor admin con sanitizzazione HTML.

---

## Notifiche

- Notifiche in-app (dropdown a campanella) con routing per ruolo.
- Notifiche email configurabili per utente.
- Tipi: conferme/cancellazioni prenotazioni, aggiornamenti sfide, iscrizioni tornei, annunci, alert di sistema.

---

## Profilo e statistiche

- Profilo utente con dati anagrafici, avatar, preferenze e percentuale di completamento.
- Statistiche atleta: ranking e punti Arena, storico match, set/game, attività.
- Profilo maestro con bio, stato "prenotabile" e statistiche lezioni.

---

## Email

Sistema transazionale basato su Resend con notifiche automatiche e campagne admin. Vedi
[EMAIL.md](EMAIL.md).

---

## Homepage

Landing page modulare: hero, scroll loghi partner, tornei in evidenza, staff, news, sezioni
CTA, navbar pubblica e footer con link legali. Contenuti caricati dinamicamente dal database.

---

## Mappa delle pagine

### Pagine pubbliche

| Route | Descrizione |
|-------|-------------|
| `/` | Homepage |
| `/login`, `/register` | Autenticazione e registrazione |
| `/auth/callback`, `/auth/reset-password`, `/auth/auth-code-error` | Flussi auth |
| `/news`, `/news/[id]` | News pubbliche e dettaglio |
| `/tornei`, `/tornei/[id]` | Tornei pubblici e dettaglio (iscrizione se loggato) |
| `/classifiche` | Classifiche pubbliche |
| `/lavora-con-noi` | Candidature di lavoro |
| `/privacy`, `/terms`, `/cookie-policy`, `/refund-policy`, `/accessibility` | Pagine legali |

### Pagine autenticate (tutti i ruoli)

| Route | Descrizione |
|-------|-------------|
| `/dashboard` | Redirect alla dashboard del ruolo |
| `/profile` | Gestione profilo |
| `/chat` | Messaggistica |

### Dashboard Atleta (`/dashboard/atleta/`)

Prenotazioni, corsi, tornei, **Arena** (scelta avversario, configurazione e gestione sfide),
video, posta, profilo.

### Dashboard Maestro (`/dashboard/maestro/`)

Prenotazioni e lezioni, corsi gestiti, tornei, Arena, video, posta, profilo.

### Dashboard Admin/Gestore (`/dashboard/admin/`)

Utenti, prenotazioni, corsi, tornei, video lezioni, staff, campi, annunci, chat, news,
notifiche, statistiche, mail marketing, invite code, candidature, platform log, gallery,
design system demo.

---

## Protezione delle rotte

- Le pagine pubbliche sono accessibili senza login.
- Le rotte protette verificano la sessione e applicano il controllo per ruolo a livello di
  componente (`AuthGuard`).
- Il redirect post-login porta alla dashboard appropriata (`getDestinationForRole`).
- Redirect legacy: `/dashboard/coach/*` → `/dashboard/maestro/*`.

Per i dettagli sui permessi vedi [ROLES.md](ROLES.md).
