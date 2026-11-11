# Changelog

Modifiche rilevanti a GST Tennis Academy, dalla più recente.

## [Unreleased]

### Pulizia del codice e della documentazione (novembre 2026)

- **Helper condivisi al posto delle copie**: le funzioni ripetute identiche in più pagine ora vivono in un solo modulo. `src/lib/courses/schedule.ts` (date delle lezioni, campo e orario di un corso in una data: prima in 13 pagine), `src/lib/arena/challengeDisplay.ts` (etichette e lettura del punteggio delle sfide: prima duplicati nelle pagine dettaglio admin e atleta), `src/lib/news/display.ts` (news pubblicata, titolo, data), `src/lib/utils/youtube.ts` (ID video, prima in 4 pagine), `countCronAttivi` in `src/lib/ai-news/utils.ts`. Nessun cambio di comportamento; circa 600 righe in meno.
- **Pagine gemelle unificate**: il dettaglio sfida Arena di admin e atleta è un solo componente (`components/arena/ChallengeDetailView`) a cui le pagine passano i propri pulsanti; il dettaglio partecipante di un corso (iscritto e ospite, admin e maestro: quattro pagine) è `components/courses/CourseParticipantView`; i form "crea" e "modifica" blocco campo condividono campi (`components/courts/BlockFormFields`), calendario (`components/ui/DateCalendarPanel`) e logica (`src/lib/courts/blocks.ts`, `blockDisplay.ts`). Piccole differenze tra le copie allineate: nel dettaglio ospite compaiono anche tipo e giorni del corso, "modifica blocco" usa gli stessi pulsanti a griglia di "crea blocco", l'avviso di controproposta è nel blu del brand.
- **Un solo calendario**: la griglia del mese era riscritta a mano in molte pagine (blocchi campo, corsi, utenti, profilo, creazione e modifica sfide, navigatore delle prenotazioni). Ora c'è `components/ui/CalendarMonth`, usato da `DateCalendarPanel` (a scomparsa), `DatePickerModal` (finestra "Seleziona data") e `DateNavigator`.
- **Nome del blocco campo conservato in modifica**: "modifica blocco" scambiava il nome per il tipo e al salvataggio lo perdeva. Ora il motivo si rilegge con `parseBlockReason` (inverso di `buildBlockReason`) e il form di modifica ha il campo "Nome Blocco" come quello di creazione.
- **Lezioni annullate nell'area atleta**: la pagina del corso e la home dell'atleta elencavano anche le lezioni annullate e ignoravano quelle extra; ora usano lo stesso calendario di admin e maestro.
- **Codice morto**: da `src/lib/roles.ts` rimossi `roleLabels`, `isCoach`, `canManageUsers` e il doppio nome `isAdmin` (resta `isAdminOrGestore`); export mai importati resi privati; `auth.test.ts` eliminato perché ripeteva i test di `roles.test.ts`. Nuovo `shared-helpers.test.ts` per i moduli condivisi.
- **Dipendenze**: disinstallata `@testing-library/react` (nessun test la usa); aggiunta `react-is` come dipendenza esplicita (la richiede Recharts e prima arrivava solo indirettamente: senza, la build di produzione falliva); tolto il passo `git add` superfluo da lint-staged.
- **Documentazione**: README ridotto a panoramica, setup e comandi; `FRONTEND.md` e `DESIGN_SYSTEM.md` uniti in `FRONTEND.md`; rimossa `CAMERAS.md` (progetto telecamere mai realizzato); tolti conteggi e date che invecchiavano e le parti ripetute in più file; versioni del changelog precedenti alla revisione di ottobre 2026 riassunte in poche righe.
- **File per l'AI**: `CLAUDE.md` aggiornato (tabella dei moduli condivisi, regole contro duplicati e codice morto) e `.github/copilot-instructions.md` riallineato.

### Prenotazioni passate (admin/gestore)

- Nel dettaglio di una prenotazione passata (non annullata) compare il pulsante **Modifica**: admin e gestore possono correggere campo, orario, tipo, atleti e note anche a prenotazione conclusa.
- Nella **nuova prenotazione** e nella **modifica** admin gli slot di oggi già trascorsi sono selezionabili (i giorni precedenti lo erano già): si possono registrare a posteriori prenotazioni passate per la contabilità. Restano attivi i controlli su conflitti, blocchi campo e corsi.
- `POST`/`PUT /api/bookings`: se admin/gestore creano una prenotazione già conclusa, o ne correggono una che resta nel passato, non partono email né notifiche ad atleti, maestro e admin (solo log attività). Le aree atleta e maestro non cambiano.

### Modifica competizione

- **Ospiti senza account** (admin/gestore): si possono iscrivere con il solo nome, sia in fase iscrizioni (campo "Aggiungi ospite" nella finestra Iscrivi Atleta, `POST /api/tournament_participants` con `player_name`) sia a campionato in corso (tasto "+" nella barra Partecipanti di Modifica, `POST /api/tournaments/[id]/add-participant` con `player_name`). Usano la colonna `player_name` già prevista dalla migrazione 035; niente notifica, i risultati li inserisce l'admin. Nome unico nel torneo (senza distinguere le maiuscole).
- **Modifica** (admin/gestore, pagina `/dashboard/admin/tornei/[id]/modifica`, un solo pulsante nel dettaglio torneo al posto di "Sostituisci Atleta" e "Aggiungi Atleta"): nome, descrizione, date e categoria sempre; formato partita finché nessuna partita è giocata; tipo e numero partecipanti in fase iscrizioni. Nel campionato in corso, sezione Partecipanti con la barra di ricerca per aggiungere un atleta e la X per rimuoverlo (solo chi non ha giocato). Rimuovere un atleta e aggiungerne un altro assegna al nuovo le stesse giornate. Nuova `PATCH /api/tournaments/[id]`; le regole di struttura sono condivise con la creazione (`src/lib/tournaments/tournamentStructure.ts`).

### Campionato: aggiunta e rimozione iscritti

- **Aggiungi atleta** (admin/gestore, campionato in corso, dalla barra di ricerca della sezione Partecipanti in Modifica): iscrive un nuovo atleta e crea solo le sue partite, una contro ogni partecipante (`POST /api/tournaments/[id]/add-participant`). Con iscritti dispari gioca nella giornata di riposo di ciascun avversario; con iscritti pari una partita per giornata esistente più una giornata nuova. Le partite già in calendario, giocate o no, non cambiano. L'atleta riceve una notifica; `max_participants` si adegua se il campionato era al completo. Prima di confermare compare il numero di partite che verranno create.
- A competizione avviata la lista iscritti la modifica solo admin/gestore: `POST /api/tournament_participants` rifiuta (409) fuori dalla fase `iscrizioni`; `DELETE` è consentito solo ad admin/gestore, solo nei campionati e solo per iscritti senza partite giocate né prenotate (prima l'eliminazione a cascata cancellava anche i risultati, falsando la classifica degli avversari).
- **Sostituisci Atleta** (pagina `/dashboard/admin/tornei/[id]/sostituisci` e `PATCH /api/tournament_participants`, introdotte nel commit precedente) rimossa: si sostituisce un atleta che non ha giocato togliendolo con la X e aggiungendo il nuovo dalla barra Partecipanti di Modifica; con iscritti pari il nuovo prende le stesse giornate.
- **Rigenera Calendario** disponibile solo se nessuna partita è stata giocata; `DELETE /api/tournaments/[id]/delete-matches` rifiuta (409) se esistono risultati.

### Avvio in locale e test

- `npm run dev` e `npm run build` passano da `scripts/next.mjs`: se Windows (Smart App Control) blocca il compilatore nativo di Next, usano Webpack al posto di Turbopack, che senza binario nativo non parte. Su Vercel e sugli altri sistemi il comando è quello di prima.
- Jest compila i test con il compilatore TypeScript (`jest.transform.js`) invece che con SWC di Next: su Windows con Smart App Control il binario nativo di SWC viene bloccato e in Next 16 Jest non ripiega sulla versione WASM. Nessuna nuova dipendenza.

### Revisione del 25 ottobre 2026

#### Fixed

- **Fuso orario** delle notifiche in-app e delle email generate lato server (Vercel gira in UTC): modifica ed eliminazione prenotazioni, lezioni private, prenotazioni eliminate dall'atleta, sfide Arena, data di registrazione nell'email ai gestori. Ora sempre `Europe/Rome`.
- **"Rigenera calendario"** del campionato: la pagina chiamava `delete-matches` in POST, la route accetta solo DELETE (falliva sempre con 405).
- **Eliminazione utente** dal pannello admin: cancellava solo la riga `profiles` lasciando attivo l'account Auth. Ora passa da `DELETE /api/admin/users`, che elimina anche l'account; un gestore non può eliminare un admin.
- Notifiche Arena salvate con `action_url` invece di `link`: dalla campanella e dalle pagine Notifiche non portavano alla sfida. Ora usano `link` (le vecchie restano leggibili) e anche campanella e Centro notifiche aprono la conversazione giusta per i messaggi chat.
- 6 errori di tipo nei file di test (esclusi dal `tsconfig`, quindi mai segnalati).

#### Security

- `POST /api/tournaments/[id]/generate-groups` verificava solo il login: qualsiasi atleta poteva generare gironi e partite. Ora solo admin/gestore.
- `POST /api/tournament_participants` inseriva l'intero body del client: ora solo `user_id` e `tournament_id`.
- `GET /api/tournaments/[id]/group-matches` (pubblico) non espone più le email dei giocatori.
- Callback `/auth/callback`: `?next=` accetta solo percorsi interni (prima `?next=@host` portava fuori dal sito).
- Rimosso `PUT /api/video-lessons`, che aggiornava la riga col body del client senza filtrare i campi.
- Le route tornei, utenti e reset password usano `verifyAuth` invece di 9 copie della verifica manuale del token.

#### Removed

- Route e metodi API senza chiamanti: `/api/arena/challenges/[id]`, `GET /api/bookings`, `POST`/`PUT /api/tournaments` (la creazione usa `/create`), `POST` di `groups` e `group-matches` (il primo era anche rotto), `GET`/`PATCH`/`DELETE` di `matches/[matchId]`, `PATCH /api/tournament_participants`, `GET`/`PATCH /api/admin/users`, `POST`/`PUT`/`DELETE /api/video-lessons`, `POST /api/arena/stats`, `PATCH /api/recruitment-applications`, `POST`/`PATCH /api/chat-groups/[id]/members`.
- Codice morto: `getOpeningMinutes`, `formatItalianTime`, `buildCoachNotificationForPrivateLessonBatch`, `formatBlockConflictMessage`, `createTournamentSchema` e costanti collegate, getter inutilizzati di `env` e del logger, campo `bannerLabel` dei template email, stili mai letti dei blocchi campo, logo SVG non più referenziato.
- Variabile `ENABLE_RATE_LIMITING`: non era letta da nessuna parte (il rate limiting è sempre attivo).
- `.claude/settings.local.json` dal repository (impostazioni personali, ora in `.gitignore`).

#### Changed

- Liste campi hardcoded in 5 pagine (Arena e nuovo blocco campo) sostituite dal nuovo hook `useCourts()`.
- `bookingService.ts`: risoluzione delle email dei partecipanti e del nome del maestro in due helper invece che ripetute in ogni funzione.
- `console.error` → `secure-logger` in `logActivity`, `challengeService` e nelle route toccate.
- Documentazione riallineata al codice: API (inventario completo), architettura, ruoli, database (migrazioni 090–097), funzionalità, frontend, design system, email, Arena, deploy, README, `CLAUDE.md` e istruzioni Copilot.

### Chat: gruppi sicuri e messaggi non letti

- Pagina chat unica (`components/chat/ChatView.tsx`) per atleta, maestro e admin, con link diretti alle conversazioni (`?c=`).
- Migrazioni `096` (RLS su gruppi e membri, policy dei messaggi riscritte, `last_read_at`, funzioni `get_unread_chat_count` e `mark_chat_group_read`, realtime) e `097` (rimozione di policy duplicate create a mano).
- `/api/chat-groups` riscritte con validazione Zod; notifiche chat raggruppate (una non letta per conversazione); pallino "Chat" in navigazione con `useUnreadChat`.
- Dipendenze aggiornate (Next 16.4, React 19.3, Zod 4, supabase-js 2.118…).

### Removed

- Codice morto: `TopAthletesCard`, `useBookingsRealtime`, `src/lib/security/sanitize.ts`, `formatCurrency`, tipi `ai-news/types.ts`, componenti `ui/Card` e `ui/Input`, schemi Zod e costanti mai usati.
- Dipendenza inutilizzata: `isomorphic-dompurify`.
- Piani e report già applicati o superati: `ANALYSIS.md`, `PLAN_CONTABILITA.md`, `scan_output.txt`, `supabase/README_OLD.md`, `supabase/APPLY_SCHEMA_FIXES.md`.

### Added

- Migrazione `087_rimozione_oggetti_non_usati.sql`: elimina tabelle, colonne, trigger e funzioni che il codice non usa più (Contabilità, vecchia chat, e-commerce, email marketing…). Distruttiva, da applicare dopo un backup.
- `.env.example` con le sole variabili lette dal codice.

### Performance

- Layout dashboard non bloccanti: niente spinner a tutto schermo, profilo e ruolo caricati in parallelo; `loading.tsx` con skeleton per atleta, maestro e admin.
- `getSessionUser()` (sessione locale) al posto di `supabase.auth.getUser()` in 46 file client: un round-trip di rete in meno prima di ogni caricamento.
- Notifiche: Realtime filtrato per utente al posto del polling ogni 5 s (×2 istanze); corretto il bug che rileggeva il profilo a ogni giro.
- Chat: una sola sottoscrizione realtime per pagina (prima se ne accumulava una a ogni apertura di modale) e niente spinner a ogni nuovo messaggio.
- AuthGuard con ruolo memorizzato per sessione e listener `onAuthStateChange` finalmente rimosso allo smontaggio.
- Dashboard admin: ricaricamento realtime con debounce; pagina torneo pubblica: polling solo a scheda visibile e senza ridisegni a vuoto.
- framer-motion rimosso da landing e shell dashboard (Reveal, titolo hero, hamburger, tab live, DateNavigator, WeatherCard ora in CSS); Recharts caricato con `next/dynamic`.
- CSS: rimossi `-webkit-overflow-scrolling` su ogni elemento, la transizione del body e le regole dark mode inutilizzate.

### Security

- Registrazione: il ruolo non arriva più dal client (bastava inviare `role: "maestro"`) ma dal codice invito, ora obbligatorio e validato lato server.
- Rimosso `POST /api/invite-codes/validate`: anonimo, permetteva di assegnare il ruolo di un codice a qualsiasi `user_id` (escalation ad admin). Nuova migrazione `089` che toglie la policy RLS che rendeva leggibili a tutti i codici invito.
- `/api/arena/challenges`: PATCH/PUT/DELETE ora richiedono sessione e appartenenza alla sfida (o admin/gestore).
- `/api/upload/news-image`: riservata ad admin/gestore; protezione SSRF estesa (169.254.x, 172.16–31.x, IPv6 privati, niente redirect).
- `/api/bookings/availability`: richiede sessione; rimossa la modalità "slot singolo" inutilizzata.
- `/api/notifications`: restano solo le creazioni (link interni, limiti di lunghezza); rimossi GET/PATCH/DELETE inutilizzati che permettevano di modificare notifiche altrui.

### Removed

- Pagine `/accessibility` e `/refund-policy` (anche dalla sitemap).

### Changed

- Hook pre-commit (Prettier su file staged) attivato e reso automatico con lo script `prepare`.
- 67 `catch (err: any)` senza annotazione esplicita; `Date.now()` fuori dal render in `WeatherCard`.

### Removed (revisione completa file per file)

- 33 API route senza chiamanti (60 restanti) e 14 pagine non più raggiungibili, tra cui `/chat`, `/profile`, gli storici/archivi, `dashboard/news/*` (duplicato di `admin/news/ai`) e `admin/communications`.
- Vecchia chat "a conversazioni" (`ChatPanel`, presenza, digitazione) e nuova migrazione `088_rimozione_chat_legacy_e_contenuti.sql` per le sue tabelle, da applicare dopo un backup.
- framer-motion: ultime 6 pagine convertite in CSS e dipendenza disinstallata.
- ~300 tra import, variabili, funzioni, stati React e tipi inutilizzati; helper orfani (`StatCard`, `TournamentStats`, `sanitizeSearchQuery`…); 59 regole e 80 variabili CSS mai usate, più un blocco CSS duplicato.
- Script SQL superati in `supabase/scripts/` e `migrations/archive/` (restano solo quelli del setup da zero), `lint-staged.config.js` ignorato, cache della CLI Supabase.

### Fixed

- Query sprecate: pagina statistiche maestro (5 query, tra cui tutte le lezioni passate senza limite), prenotazioni maestro (fino a 2000 prenotazioni + profili + partecipanti mai usati), dashboard admin/atleta/maestro (profilo letto solo per un nome mai mostrato).
- Chat: messaggi dei gruppi scaricati in parallelo invece che uno alla volta.
- Notifiche ai maestri: puntavano a `/dashboard/maestro/agenda` (404); ora al dettaglio della prenotazione, e i link già salvati vengono reindirizzati.
- Audit Arena e utilizzi codici invito: scrivevano/leggevano la tabella inesistente `activity_logs` invece di `activity_log`.
- Pagina torneo pubblica: gli errori (es. "Devi effettuare il login per iscriverti") ora compaiono come toast invece di essere ignorati.
- `robots.txt` con URL assoluto della sitemap; BOM rimosso da 4 file.

### Removed (dark mode)

- Eliminata la dark mode: rimosse 273 classi Tailwind `dark:` da 23 file. Prima si attivavano col tema scuro del sistema operativo e scurivano a metà alcune pagine. `:root` ora dichiara `color-scheme: light`.

### Removed (pulizia aggiuntiva)

- `ThemeProvider`/`useTheme` e lo script del tema (il sito è solo in tema chiaro), 4 layout "passthrough" vuoti, 155 import inutilizzati in 50 file, codice morto in `NotificationsDropdown`.

### Changed

- Documentazione riallineata allo stato reale (conteggi, setup del database verificato, API nuove e non usate).
- Rimossi tutti i plan salvati, compreso `PIANO_MIGLIORAMENTI_TORNEO.md`: i prossimi piani verranno riscritti da zero.

## Storico precedente

Le versioni fino a giugno 2026 descrivevano in dettaglio funzionalità poi riscritte o rimosse (email marketing, e-commerce, vecchia chat, dark mode); il dettaglio resta nella cronologia Git.

| Versione | Data       | In breve                                                                                        |
| -------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 1.4.0    | 2026-06-01 | Arena (sfide 1v1), corsi con iscrizioni, presenze e pagamenti, ospiti, vincolo anti-overlap     |
| 1.3.0    | 2025-12-29 | Restyling di footer e dashboard, gestione staff                                                 |
| 1.2.0    | 2025-12-29 | Ottimizzazione mobile, gestione utenti via API con service role, nuova pagina torneo            |
| 1.1.0    | 2025-12-28 | Tornei semplificati in tre tipi (eliminazione diretta, gironi + eliminazione, campionato)       |
| 1.0.0    | 2024-12-28 | Prima versione completa: prenotazioni, tornei, chat, email, SEO                                 |
| 0.1–0.9  | fine 2024  | Impostazione del progetto: autenticazione, dashboard per ruolo, calendario prenotazioni, tornei |
