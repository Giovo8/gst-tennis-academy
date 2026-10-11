# Piano di miglioramento — GST Tennis Academy

> Documento generato da un'analisi statica non distruttiva della codebase.
> Ogni voce ha un ID univoco ed è pensata per essere eseguita singolarmente.
> **Nessuna voce è stata applicata**: questo file è solo un piano.

## Riepilogo

La codebase è ampia e funzionalmente ricca (125 pagine, 91 API route, 81 migrazioni) e mostra
buone fondamenta in alcuni punti: nessun segreto hardcoded, nessuna chiave sensibile esposta
con prefisso `NEXT_PUBLIC_`, security headers configurati, `alt` presente su tutte le 53 `<img>`,
e le pagine `maestro/` sono correttamente re-export di quelle `atleta/` invece che duplicate.

Il problema principale non è la qualità del singolo file ma la **coerenza trasversale**: esistono
sei pattern di autenticazione diversi, gli schemi Zod sono usati in 6 route su 92, il rate limiter
è applicato su 5 route, e la sicurezza dei dati poggia quasi interamente sui controlli applicativi
perché ~85 route usano la service role key che bypassa RLS. Da questa deriva nasce **S-01, una
catena di privilege escalation ad admin sfruttabile senza autenticazione**, che è di gran lunga
la priorità assoluta.

Sul fronte prestazioni: 70% delle pagine sono client components, zero `next/dynamic`, caching
quasi assente, ~97% delle query Supabase senza `.limit()`. Sul fronte UX manca completamente lo
strato di resilienza di Next (zero `error.tsx`, `loading.tsx`, `not-found.tsx`).

## Legenda

- Priorità: 🔴 Alta / 🟡 Media / 🟢 Bassa
- Sforzo: S / M / L · Rischio: Basso / Medio / Alto
- Distruttivo: Sì / No

## ❓ Domande aperte

Queste voci **non vanno eseguite** finché il proprietario del progetto non risponde.

- [ ] **RLS in produzione** — `profiles`, `bookings` e `courses` non hanno mai
  `ENABLE ROW LEVEL SECURITY` in nessuna migrazione numerata; compare solo in
  `supabase/scripts/utilities/RESET_DATABASE.sql:473-475` e in `supabase/migrations/archive/`.
  Non è determinabile staticamente se in produzione sia attiva. Eseguire sul DB:
  `select tablename, rowsecurity from pg_tables where schemaname='public';`
  Se risulta disattivata, va pianificato un intervento dedicato (non incluso qui: abilitare RLS
  senza policy corrette romperebbe le numerose letture client-side con anon key).
- [ ] **Pagine complete ma non raggiungibili** — decidere caso per caso se collegarle o rimuoverle:
  `/profile`, `/chat`, `/dashboard/admin/communications`, `/dashboard/admin/users/modifica`,
  `/dashboard/atleta/bookings/storico`, `/dashboard/maestro/arena/statistiche`,
  `/dashboard/maestro/arena/storico`, `/dashboard/maestro/bookings/corso/[id]/[date]`.
  Vedi **D-03**. Nessuna eliminazione è proposta in questo piano.
- [ ] **`chat_groups` senza RLS** — `supabase/migrations/029_fix_chat_groups_rls.sql:5-6` disabilita
  esplicitamente RLS su `chat_groups` e `chat_group_members`, delegando tutto al layer applicativo.
  Scelta probabilmente fatta per risolvere una ricorsione RLS. Confermare se è deliberata e
  permanente.
- [ ] **Rate limiting distribuito** — il rate limiter attuale è in-memory
  (`src/lib/security/rate-limiter.ts:25`): su Vercel serverless il limite effettivo è
  `maxRequests × numero_istanze` e si azzera a ogni cold start. Una soluzione corretta richiede
  uno store condiviso (es. Upstash Redis), cioè una nuova dipendenza e un servizio esterno.
  **Escluso da questo piano per scelta esplicita**; **S-06** migliora comunque la situazione
  attuale senza nuove dipendenze.
- [ ] **`/api/bookings/availability`** — attualmente pubblica (nessun auth). Espone il calendario
  prenotazioni completo. Confermare se è voluto (es. serve a un widget pubblico) o se va protetta.

---

## 1. Pulizia codice

### [P-01] Rimuovere `scan_output.txt` dal repository

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** Sì (vedi note)
- **File coinvolti:** `scan_output.txt`, `.gitignore`
- **Situazione attuale:** `scan_output.txt` (184 KB, ~2183 righe, encoding UTF-16) è un artefatto
  di una precedente analisi automatica contenente frammenti di codice sorgente. È **tracciato da
  git** (verificato con `git ls-files --error-unmatch`) e **non** coperto da `.gitignore`.
- **Proposta:**
  1. Verificare il contenuto del file per escludere che contenga dati sensibili
     (se sì, la rimozione dalla history è un intervento separato da concordare).
  2. `git rm --cached scan_output.txt` e cancellare il file dal working tree.
  3. Aggiungere `scan_output.txt` e `tsconfig.tsbuildinfo` a `.gitignore`.
- **Beneficio atteso:** repo più pulito, -184 KB, nessun frammento di sorgente duplicato.
- **Note/rischi:** **Distruttivo**: cancella un file. Il contenuto è solo un dump di analisi,
  non codice di progetto, quindi la perdita è irrilevante — ma confermare prima di procedere.
  La rimozione dalla history git NON è inclusa qui.

### [P-02] `resolveDashboardLinkForRole` è una funzione no-op

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/lib/notifications/links.ts:61-69`,
  `src/__tests__/notification-links.test.ts`
- **Situazione attuale:** la funzione accetta `link` e `role`, calcola `normalizedRole`
  (variabile **mai usata**) e restituisce `link` invariato. Doveva rimappare i link per ruolo ma
  non fa nulla. I test attuali *asseriscono* questo comportamento no-op, quindi il difetto è
  "congelato" dalla suite.
- **Proposta:** decidere fra due strade e applicarne una sola:
  - **(a) Implementarla** — è la strada che risolve anche **D-01**: la funzione dovrebbe
    riscrivere i link verso pagine effettivamente esistenti per il ruolo indicato.
  - **(b) Rimuoverla** — se la rimappatura non serve, eliminare la funzione, i suoi usi e i
    relativi test, per non lasciare un'astrazione che mente sul proprio scopo.
  In entrambi i casi rimuovere la variabile morta `normalizedRole` alla riga 66.
- **Beneficio atteso:** elimina un'astrazione ingannevole; abilita il fix di D-01.
- **Note/rischi:** i test in `notification-links.test.ts` vanno aggiornati in entrambi i casi.

### [P-03] Sostituire `console.*` con il secure logger nei file peggiori

- **Priorità:** 🟢 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** 343 occorrenze in `src/`; i peggiori:
  `src/app/dashboard/atleta/(main)/mail/page.tsx` (12),
  `src/app/dashboard/admin/users/modifica/page.tsx` (12),
  `src/app/dashboard/admin/chat/page.tsx` (12),
  `src/app/api/conversations/route.ts` (9), `src/app/api/arena/challenges/route.ts` (9),
  `src/app/api/admin/users/route.ts` (8), `src/app/api/tournaments/route.ts` (8)
- **Situazione attuale:** esiste `src/lib/logger/secure-logger.ts` che redige i campi sensibili,
  ma è largamente bypassato. CLAUDE.md vieta esplicitamente `console.log` con dati utente.
- **Proposta:** partire dalle **API route** (dove il rischio di loggare dati personali è
  concreto), sostituendo `console.error(msg, err)` con la chiamata equivalente del secure logger.
  Non fare una sostituzione cieca su tutti i 343 punti: procedere per file, verificando che
  l'oggetto loggato non contenga PII.
- **Beneficio atteso:** riduzione del rischio di leak di dati personali nei log Vercel.
- **Note/rischi:** nessuno se fatto file per file.

### [P-04] Deduplicare `formatDate` (ridefinita 8 volte)

- **Priorità:** 🟢 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** esiste già `src/lib/utils/formatItalianDate.ts`. Ridefinizioni locali in:
  `src/app/dashboard/admin/(main)/communications/page.tsx:147`,
  `src/app/dashboard/admin/bookings/page.tsx:755`,
  `src/app/dashboard/admin/courts/page.tsx:281`,
  `src/app/dashboard/admin/job-applications/page.tsx:95`,
  `src/app/dashboard/atleta/(main)/bookings/page.tsx:642`,
  `src/app/news/[id]/page.tsx:90`,
  `src/components/contabilita/NightThresholdPanel.tsx:19`,
  `src/components/contabilita/PriceListPanel.tsx:89`
- **Situazione attuale:** l'utility condivisa esiste ma otto file la reimplementano localmente,
  con formati potenzialmente divergenti.
- **Proposta:** per ogni file, confrontare il formato prodotto dalla versione locale con quello di
  `formatItalianDate`. Se coincidono, sostituire con l'import. Se differiscono, **non forzare**:
  aggiungere una variante esportata all'utility e usarla.
- **Beneficio atteso:** formattazione date coerente in tutta l'app, -8 duplicati.
- **Note/rischi:** attenzione a non cambiare silenziosamente il formato mostrato all'utente.

### [P-05] Estrarre la generazione degli slot orari (duplicata 7 volte)

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:**
  `src/app/dashboard/admin/(main)/arena/create-challenge/page.tsx:233`,
  `src/app/dashboard/admin/bookings/modifica/page.tsx:409`,
  `src/app/dashboard/admin/bookings/new/page.tsx:636`,
  `src/app/dashboard/atleta/(main)/arena/choose-opponent/page.tsx:196`,
  `src/app/dashboard/atleta/(main)/arena/configure-challenge/[opponentId]/page.tsx:258`,
  `src/app/dashboard/atleta/(main)/bookings/new/page.tsx:344`,
  `src/app/dashboard/atleta/(main)/bookings/[id]/edit/page.tsx:255`,
  variante in `src/app/dashboard/admin/(main)/arena/challenge/[id]/edit/page.tsx:358`
- **Situazione attuale:** la stessa logica di generazione slot è copiata in 7-8 punti, con
  varianti. Un cambio di orari di apertura richiede 8 modifiche coordinate.
- **Proposta:** creare `src/lib/bookings/generateTimeSlots.ts` con una funzione parametrica
  (ora inizio, ora fine, durata slot, eventuali esclusioni). Migrare **un file alla volta**,
  verificando a ogni passo che gli slot prodotti siano identici a prima.
- **Beneficio atteso:** single source of truth per gli orari; meno bug da divergenza.
- **Note/rischi:** **Rischio Medio** — tocca il cuore del flusso di prenotazione. Da fare dopo
  che le modifiche non committate su `bookings/new` e `bookings/modifica` sono state committate,
  per evitare conflitti.

### [P-06] Collegare o rimuovere gli export mai usati in `src/lib`

- **Priorità:** 🟢 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** Sì (se si sceglie di rimuovere)
- **File coinvolti:** 32 export mai referenziati fuori dal file di definizione. In particolare:
  - `src/lib/validation/schemas.ts` — 20 schemi Zod su ~26 mai usati (`loginSchema`,
    `createNewsSchema`, `updateNewsSchema`, `uuidSchema`, `userRoleSchema`, `paginationSchema`, …)
  - `src/lib/hooks/useBookingsRealtime.ts` — **intero hook mai importato**
  - `src/components/maestro/TopAthletesCard.tsx` — **unico componente totalmente orfano** su 84
  - `src/lib/security/sanitize.ts` — `sanitizeHtml` (DOMPurify) mai usato: tutti gli 8 consumer
    importano `sanitize-server`
  - minori: `src/lib/bookings/courseConflicts.ts` (`italyDateStr`, `italyDayName`,
    `courseOccupiesSlot`), `src/lib/constants/app.ts` (`TIME_CONSTANTS`, `MATCH_STATUS`,
    `NOTIFICATION_TYPE`), `src/lib/courts/getCourts.ts` (`getCourtsWithDetails`)
- **Situazione attuale:** `validation/schemas.ts` è un layer di validazione costruito e mai
  collegato — le API validano a mano.
- **Proposta:** **non rimuovere in blocco.** Gli schemi Zod vanno *collegati*, non cancellati:
  vedi **S-07**, che li mette in uso. Solo dopo aver eseguito S-07, valutare la rimozione di ciò
  che resta effettivamente inutilizzato. `useBookingsRealtime` e `TopAthletesCard` sono i due
  candidati più chiari alla rimozione, ma richiedono conferma (potrebbero essere lavoro in corso).
- **Beneficio atteso:** meno codice morto, superficie di manutenzione ridotta.
- **Note/rischi:** **Distruttivo se si rimuove.** Verificare sempre con una ricerca sull'intero
  repo prima di cancellare, e non toccare nulla che appaia in `git status` come modificato.

### [P-07] Rimuovere le cartelle vuote sotto `src/app`

- **Priorità:** 🟢 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** Sì (cartelle vuote)
- **File coinvolti:** 14 cartelle **completamente vuote** (0 file), residui di refactor:
  `src/app/classifiche`, `src/app/dashboard/admin/design-system-demo`,
  `src/app/dashboard/admin/bookings/storico`, `src/app/dashboard/admin/chat/email`,
  `src/app/dashboard/atleta/(main)/arena/statistiche`,
  `src/app/dashboard/atleta/(main)/arena/storico`,
  `src/app/dashboard/maestro/(main)/bookings/storico`,
  `src/app/api/admin/email-stats`, `src/app/api/admin/send-email`,
  `src/app/api/announcements` (+ `[id]`), `src/app/api/email` (+ `notification`, `unsubscribe`),
  `src/app/api/webhooks` (+ `email`)
- **Situazione attuale:** cartelle senza `page.tsx` né `route.ts` in tutto il sottoalbero.
  Non causano errori di build ma segnalano feature abbandonate o mai completate.
- **Proposta:** rimuovere le cartelle vuote. **Eccezione importante:** `src/app/api/webhooks/`
  è referenziata da `src/middleware.ts:13` come esclusione CSRF — rimuoverla è innocuo per il
  runtime, ma se si prevede di aggiungere webhook in futuro conviene lasciarla.
- **Beneficio atteso:** struttura più leggibile, meno confusione su cosa esiste davvero.
- **Note/rischi:** **Distruttivo** (cartelle). Git non traccia le cartelle vuote, quindi
  probabilmente esistono solo in locale.

### [P-08] Ottimizzare gli asset in `public/`

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `public/favicon.ico` (239 KB), `src/app/favicon.ico` (239 KB),
  `public/images/1.jpeg` (435 KB), `3.jpeg` (315 KB), `2.jpeg` (312 KB),
  `public/images/logo-tennis.png` (239 KB)
- **Situazione attuale:** il favicon pesa 239 KB (è una copia del logo PNG) ed è **duplicato** in
  `public/` e `src/app/`. Solo quello in `src/app/` viene servito da Next. Le immagini della
  landing non sono ottimizzate.
- **Proposta:**
  1. Generare un vero favicon multi-risoluzione (16/32/48 px, < 15 KB) e sostituire
     `src/app/favicon.ico`; rimuovere `public/favicon.ico` (non usato).
  2. Convertire `1.jpeg`/`2.jpeg`/`3.jpeg` in WebP e ridimensionarle alla dimensione di
     rendering effettiva.
- **Beneficio atteso:** ~1 MB in meno sul primo caricamento, LCP migliore.
- **Note/rischi:** aggiornare i riferimenti se cambiano le estensioni. Si combina bene con **PF-07**.

---

## 2. Pagine / route morte

### [D-01] Link di notifica rotto verso `/dashboard/maestro/agenda` (404 attivo)

- **Priorità:** 🔴 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/lib/notifications/links.ts:45`,
  `src/lib/bookings/privateLessonNotifications.ts:45,71`,
  `src/__tests__/notification-links.test.ts:24-37`,
  `src/__tests__/private-lesson-notifications.test.ts:45,61`
- **Situazione attuale:** le notifiche di lezione privata inviate al maestro puntano a
  `/dashboard/maestro/agenda`, **che non esiste**. Il maestro che clicca la notifica riceve un 404.
  Il valore è inoltre *asserito nei test*, quindi la suite protegge il bug.
- **Proposta:**
  1. Sostituire `/dashboard/maestro/agenda` con `/dashboard/maestro/bookings` (pagina esistente)
     nei tre punti di produzione.
  2. Aggiornare di conseguenza le asserzioni nei due file di test.
  3. Verificare che non esistano notifiche già salvate in DB con il vecchio link; se sì,
     valutare una migrazione dati (`update notifications set link = ... where link = ...`)
     — **da concordare, tocca dati di produzione**.
- **Beneficio atteso:** elimina un 404 raggiungibile dagli utenti reali.
- **Note/rischi:** in alternativa si può creare la pagina `/dashboard/maestro/agenda`, se
  l'agenda maestro era una feature pianificata. Vedi anche **P-02**.

### [D-02] Pagine legali non linkate dal footer

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/components/layout/Footer.tsx`, `src/app/accessibility/page.tsx`,
  `src/app/refund-policy/page.tsx`
- **Situazione attuale:** il footer linka solo `/privacy`, `/terms`, `/cookie-policy`. Le pagine
  `/accessibility` (dichiarazione di accessibilità) e `/refund-policy` esistono, sono complete,
  ma **non sono raggiungibili da nessun punto della UI**.
- **Proposta:** aggiungere i due link nella sezione legale del footer, con lo stesso stile degli
  altri tre.
- **Beneficio atteso:** conformità — una dichiarazione di accessibilità non raggiungibile non
  assolve al suo scopo; lo stesso vale per la policy di rimborso.
- **Note/rischi:** nessuno.

### [D-03] Inventario pagine non raggiungibili dalla UI — solo censimento

- **Priorità:** 🟢 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** vedi elenco
- **Situazione attuale:** pagine complete ma senza alcun `href` / `router.push` / `redirect` che
  le raggiunga:

  | Route | File |
  |---|---|
  | `/dashboard/admin/communications` | `src/app/dashboard/admin/(main)/communications/page.tsx` |
  | `/dashboard/admin/users/modifica` | `src/app/dashboard/admin/users/modifica/page.tsx` (1391 righe) |
  | `/dashboard/atleta/bookings/storico` | `src/app/dashboard/atleta/(main)/bookings/storico/page.tsx` |
  | `/dashboard/maestro/arena/statistiche` | `src/app/dashboard/maestro/(main)/arena/statistiche/page.tsx` |
  | `/dashboard/maestro/arena/storico` | `src/app/dashboard/maestro/(main)/arena/storico/page.tsx` |
  | `/dashboard/maestro/bookings/corso/[id]/[date]` | `src/app/dashboard/maestro/(main)/bookings/corso/[id]/[date]/page.tsx` |
  | `/profile` | `src/app/profile/page.tsx` (sembra legacy: esistono profili per ruolo) |
  | `/chat` | `src/app/chat/page.tsx` |

  **Falsi positivi da NON toccare:** `/auth/auth-code-error` (target di redirect Supabase),
  `/dashboard/news/ai` e `/dashboard/news/ai/configurazione` (redirect interni verso le
  omologhe admin), `/dashboard/admin/bookings/modifica` (**risulta modificata in `git status`:
  è lavoro in corso**).
- **Proposta:** **nessuna azione automatica.** Questo punto è un censimento. Il proprietario
  decide caso per caso se collegare la pagina alla UI o rimuoverla.
- **Beneficio atteso:** visibilità su ~2000 righe di codice mantenute ma mai eseguite.
- **Note/rischi:** non eliminare nulla senza conferma esplicita: alcune di queste pagine possono
  essere feature pronte in attesa di essere collegate.

### [D-04] API route duplicate per le statistiche

- **Priorità:** 🟢 · **Sforzo:** M · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** `src/app/api/admin/stats/route.ts`, `src/app/api/stats/admin/route.ts`,
  `src/app/api/dashboard/stats/route.ts`; inoltre
  `src/app/api/tournaments/matches/[matchId]/route.ts` vs
  `src/app/api/tournaments/[id]/matches/[matchId]/route.ts`
- **Situazione attuale:** tre endpoint di statistiche admin coesistono e **nessuno dei tre**
  risulta chiamato via `fetch('/api/…')` dal frontend. Analogamente esistono due route per il
  singolo match di torneo.
- **Proposta:** prima di consolidare, **verificare i log di produzione Vercel** per capire quale
  endpoint riceve traffico reale (potrebbero essere chiamati da client non rilevabili con grep).
  Solo dopo, consolidare su un endpoint unico e far puntare lì i consumer.
- **Beneficio atteso:** meno superficie API da mantenere e proteggere.
- **Note/rischi:** **Rischio Medio** — non rimuovere sulla base della sola analisi statica.
  Nota: `/api/tournaments/[id]/generate-bracket` è chiamata **server-to-server** da
  `src/app/api/tournaments/[id]/start/route.ts:143` con URL costruito dinamicamente, quindi
  invisibile a grep: è un promemoria che l'analisi statica sottostima gli usi.

### [D-05] `sitemap.xml` statico non allineato ai contenuti dinamici

- **Priorità:** 🟢 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `public/sitemap.xml`, `public/robots.txt`
- **Situazione attuale:** la sitemap è un file statico che non include news e tornei generati
  dinamicamente, e va aggiornata a mano.
- **Proposta:** vedi **A-03** (sostituzione con `src/app/sitemap.ts`).

---

## 3. Prestazioni

### [PF-01] Caricare i grafici Recharts con `next/dynamic`

- **Priorità:** 🔴 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** 14 componenti in `src/components/contabilita/` (5),
  `src/components/statistiche/` (6), `src/components/maestro/` (3); pagine consumer:
  `/dashboard/admin/statistiche`, `/dashboard/admin/contabilita`, `/dashboard/maestro`
- **Situazione attuale:** `recharts` (~400-500 KB) è importato staticamente da 14 componenti.
  **`next/dynamic` non compare in tutto il progetto (0 occorrenze)**: nessun code splitting manuale.
  Il risultato è che l'intera libreria di charting entra nel bundle iniziale delle dashboard.
- **Proposta:** per ogni componente che importa `recharts`, sostituire l'import statico nella
  pagina consumer con:
  ```tsx
  const RevenueChart = dynamic(() => import("@/components/contabilita/RevenueChart"), {
    ssr: false,
    loading: () => <ChartSkeleton />,
  });
  ```
  Procedere una pagina alla volta. Il `loading` può usare lo skeleton di **UX-02**.
- **Beneficio atteso:** ~400-500 KB in meno sul bundle iniziale delle dashboard; Time to
  Interactive sensibilmente migliore sulle pagine più usate da admin e maestri.
- **Note/rischi:** `ssr: false` è corretto per i grafici (dipendono da dimensioni del viewport).
  Verificare che non ci siano flash di layout: riservare l'altezza nel componente di loading.

### [PF-02] Rimuovere `framer-motion` da `MenuCloseIcon`

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/components/ui/MenuCloseIcon.tsx`
- **Situazione attuale:** un'icona di menu importa `framer-motion` (~100 KB). Poiché il
  componente è in `src/components/ui/` ed è usato nei layout, la libreria entra nel bundle di
  quasi ogni pagina per animare due linee.
- **Proposta:** riscrivere l'animazione con una transizione CSS Tailwind (`transition-transform`,
  `rotate-45`, `opacity-0`). Verificare poi se `framer-motion` resta usata solo negli altri 2 file
  e, in tal caso, valutare se caricarli dinamicamente.
- **Beneficio atteso:** fino a ~100 KB in meno sul bundle condiviso.
- **Note/rischi:** l'animazione risultante deve restare visivamente equivalente.

### [PF-03] Risolvere l'N+1 in `/api/conversations`

- **Priorità:** 🔴 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/app/api/conversations/route.ts:45-60`
- **Situazione attuale:** per **ogni** conversazione dell'utente viene lanciata una query
  `conversation_participants` con join su `profiles`. Con 30 conversazioni si eseguono 31 query
  sequenziali.
- **Proposta:** raccogliere tutti gli `id` delle conversazioni e sostituire il loop con **una
  sola** query:
  ```ts
  const ids = conversations.map(c => c.id);
  const { data: participants } = await supabaseServer
    .from("conversation_participants")
    .select("conversation_id, profiles(id, full_name, avatar_url)")
    .in("conversation_id", ids);
  ```
  poi raggruppare lato applicativo con una `Map` per `conversation_id`.
- **Beneficio atteso:** da N+1 a 2 query; latenza della pagina messaggi drasticamente ridotta.
- **Note/rischi:** verificare che la forma del JSON restituito al client resti identica.

### [PF-04] Risolvere l'N+1 sul conteggio partecipanti tornei

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/app/api/tournaments/route.ts:133-142`
- **Situazione attuale:** per ogni torneo viene eseguita una query di `count` su
  `tournament_participants`. Il problema è oggi mascherato da un `requestTimeout` guard, non risolto.
- **Proposta:** sostituire il loop con un'unica query aggregata
  (`.select("tournament_id").in("tournament_id", ids)` e conteggio lato applicativo), oppure
  usare la sintassi di count aggregato di PostgREST
  (`.select("*, tournament_participants(count)")`).
- **Beneficio atteso:** lista tornei da N+1 a 2 query; rimuove la necessità del timeout guard.
- **Note/rischi:** nessuno.

### [PF-05] Appiattire il waterfall di fetch nella pagina mail

- **Priorità:** 🟡 · **Sforzo:** L · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** `src/app/dashboard/atleta/(main)/mail/page.tsx` (1274 righe, 13 punti di
  fetch sequenziali alle righe 166, 179, 205, 266, 317, 351, 376, 391, 397, 479, 524, 588)
- **Situazione attuale:** la pagina carica messaggi → poi gruppi → poi, **per ogni gruppo**, i
  messaggi (riga 266: N+1 lato client) → poi i profili. Waterfall a 4+ livelli: ogni livello
  attende il precedente.
- **Proposta:**
  1. Eliminare l'N+1 alla riga 266 caricando i messaggi di tutti i gruppi con una sola query `.in()`.
  2. Parallelizzare con `Promise.all` i fetch che non hanno dipendenze reciproche.
  3. Se possibile, spostare il caricamento iniziale in un'unica API route che restituisce il
     payload completo.
- **Beneficio atteso:** riduzione sostanziale del tempo di apertura della pagina messaggi.
- **Note/rischi:** **Rischio Medio** — file molto grande e stateful. Procedere per passi,
  verificando la UI dopo ciascuno. Un pattern analogo esiste in
  `src/app/dashboard/admin/chat/page.tsx:258` (`for (const group of userGroups)` con fetch dentro).

### [PF-06] Introdurre `.limit()` e paginazione sulle query non limitate

- **Priorità:** 🔴 · **Sforzo:** L · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** trasversale — 1021 chiamate `.from()`, di cui solo 32 con `.limit()` e 3
  con `.range()`. Tabelle più interrogate: `profiles` (200), `bookings` (87), `notifications` (25).
  114 `select('*')`, i peggiori in `src/app/api/bookings/route.ts` (4),
  `src/app/dashboard/atleta/(main)/bookings/page.tsx` (3),
  `src/app/api/tournaments/reports/route.ts` (3), `src/app/api/arena/stats/route.ts` (3)
- **Situazione attuale:** ~97% delle query non ha limite. Oggi funziona perché i volumi sono
  contenuti; con la crescita dei dati storici (prenotazioni, notifiche, log) le pagine
  rallenteranno progressivamente fino al timeout.
- **Proposta:** intervenire in ordine di rischio, non a tappeto:
  1. **Liste storiche/log** (`notifications`, `activity_log`, `email_logs`, prenotazioni passate):
     aggiungere `.limit()` + `.range()` con paginazione UI.
  2. **`select('*')` su tabelle larghe:** sostituire con l'elenco esplicito delle colonne
     effettivamente usate dal componente.
  3. Lasciare per ultime le query su dataset intrinsecamente piccoli (es. `courts`).
- **Beneficio atteso:** scalabilità nel tempo, payload di rete più piccoli.
- **Note/rischi:** **Rischio Medio** — aggiungere un limite dove la UI si aspetta l'elenco
  completo introduce bug silenziosi (dati mancanti senza errore). Ogni `.limit()` va accompagnato
  da paginazione o da un avviso "mostrati i primi N".

### [PF-07] Migrare le `<img>` a `next/image`

- **Priorità:** 🟡 · **Sforzo:** L · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** 53 occorrenze di `<img>` contro 4 file che usano `next/image`. Priorità:
  `src/components/landing/TextHeroSection.tsx` (3, **above the fold, impatto LCP diretto**),
  `src/components/dashboard/DashboardShell.tsx` (3), `src/components/chat/ChatPanel.tsx` (3),
  `src/app/dashboard/atleta/(main)/mail/page.tsx` (5),
  `src/app/dashboard/admin/chat/page.tsx` (5)
- **Situazione attuale:** `next.config.ts:37-52` ha già `remotePatterns` per Supabase/Unsplash/Sanity
  e `formats: ['image/avif','image/webp']`: **la configurazione è pronta ma inutilizzata al 92%**.
- **Proposta:** partire da `TextHeroSection.tsx` (massimo impatto sull'LCP della landing), poi i
  layout, poi gli avatar nelle liste. Per ogni immagine servono `width`/`height` espliciti oppure
  `fill` con un contenitore `relative`. Per gli avatar in lista usare `sizes` per evitare il
  download di immagini sovradimensionate.
- **Beneficio atteso:** LCP migliore, conversione automatica in AVIF/WebP, lazy loading nativo.
- **Note/rischi:** l'errore tipico è il layout che si rompe quando `width`/`height` non
  corrispondono al CSS. Migrare un file alla volta con verifica visiva. Si combina con **P-08**.

### [PF-08] Aggiungere header `Cache-Control` alle API quasi statiche

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** 89 API route senza header di cache. Buoni esempi già presenti:
  `src/app/api/news/route.ts:26` (`public, s-maxage=60, stale-while-revalidate=300`),
  `src/app/api/services/route.ts:16`, `src/app/api/staff/route.ts:26`,
  `src/app/api/weather/route.ts:39`
- **Situazione attuale:** caching sostanzialmente assente: 1 solo `export const revalidate`,
  zero `unstable_cache`, zero `revalidatePath`/`revalidateTag`, zero `cache()` di React, e
  **23 route con `export const dynamic = "force-dynamic"`** che disattivano esplicitamente ogni cache.
- **Proposta:** applicare `s-maxage` **solo** agli endpoint con dati pubblici e non
  personalizzati: `/api/courts`, `/api/tournaments` (lista pubblica), `/api/video-lessons`.
  Replicare il pattern già usato in `/api/news`.
- **Beneficio atteso:** meno carico su Supabase, risposte più rapide via edge cache Vercel.
- **Note/rischi:** **Rischio Medio** — mettere in cache una risposta che dipende dall'utente
  autenticato causerebbe leak di dati fra utenti. Applicare **solo** dove la risposta è identica
  per tutti; in caso di dubbio, non applicare.

### [PF-09] Rendere la homepage un Server Component

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/app/page.tsx` (75 righe)
- **Situazione attuale:** la homepage è `'use client'` **unicamente** per gestire il parametro
  `?code=` tramite `useSearchParams` in un `AuthCodeHandler`. Di conseguenza l'intera landing
  (Hero, News, Staff, Tournaments, CTA, Footer) viene trascinata sul client. È inoltre la pagina
  più importante per la SEO e, essendo client, **non può esportare `metadata`** e non ha un layout
  dedicato che lo faccia per lei.
- **Proposta:**
  1. Rimuovere `'use client'` da `src/app/page.tsx`.
  2. Isolare `AuthCodeHandler` in un file separato con `'use client'`, mantenendolo dentro il
     `<Suspense>` già presente.
  3. Esportare `metadata` dalla homepage ora che è un Server Component.
- **Beneficio atteso:** bundle della landing molto più leggero, LCP migliore, metadata SEO
  dedicati sulla pagina di ingresso principale.
- **Note/rischi:** verificare che i componenti figli della landing non usino a loro volta hook
  client; se lo fanno, vanno marcati singolarmente con `'use client'`.

---

## 4. Implementazioni

### [IM-01] Unificare i pattern di autenticazione delle API

- **Priorità:** 🔴 · **Sforzo:** L · **Rischio:** Alto · **Distruttivo:** No
- **File coinvolti:** `src/lib/auth/verifyAuth.ts`, `src/lib/auth/routeAuth.ts:17`,
  `src/lib/ai-news/auth.ts:3`, più tre pattern inline: `src/app/api/tournaments/route.ts:38`,
  `src/app/api/admin/users/route.ts:25`, `src/app/api/court-blocks/route.ts:13`
- **Situazione attuale:** convivono **sei** meccanismi di autenticazione:

  | Helper | Meccanismo |
  |---|---|
  | `verifyAuth(req, { allowedRoles })` | header `Authorization: Bearer` |
  | `getRouteAuth()` | cookie di sessione SSR |
  | `requireAdminOrGestore()` | wrapper su `getRouteAuth` |
  | inline A (`getUserProfileFromRequest`) | locale a `tournaments` |
  | inline B (`supabaseAdmin.auth.getUser(token)`) | locale a `admin/users` |
  | inline C (`supabase.auth.getUser(token)`) | locale a `court-blocks` |

  Questa frammentazione è la **causa strutturale** delle falle S-01…S-05: con un solo punto di
  ingresso, dimenticare l'auth su una route sarebbe molto più difficile.
- **Proposta:** intervento graduale, **non un big-bang**:
  1. Documentare quale helper è canonico per quale tipo di route (Bearer per chiamate client
     esplicite, cookie per navigazione SSR).
  2. Migrare per primi i **tre pattern inline** verso l'helper canonico corrispondente.
  3. Solo dopo, valutare la convergenza fra `verifyAuth` e `getRouteAuth` in un unico helper che
     accetti entrambe le fonti di credenziale.
- **Beneficio atteso:** un solo punto in cui l'autorizzazione può sbagliare; molto più facile
  verificare la copertura.
- **Note/rischi:** **Rischio Alto** — un errore qui blocca utenti legittimi o apre accessi.
  Migrare una route alla volta con test manuale per ogni ruolo (`atleta`, `maestro`, `gestore`,
  `admin`). **Da fare dopo** S-01…S-05, che sono fix puntuali e urgenti.

### [IM-02] Creare un componente `Button` condiviso

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/components/ui/` (oggi contiene solo `Card.tsx`, `Input.tsx`,
  `Modal.tsx`, `MenuCloseIcon.tsx`), più 549 `<button>` sparsi con classi Tailwind inline
- **Situazione attuale:** il design system ha 4 componenti e **manca completamente un `Button`**,
  nonostante 549 bottoni ripetano le stesse classi Tailwind a mano. Mancano anche `Select`,
  `Badge`, `Table`, `Alert` — tutti pattern presenti nel codice ma reimplementati ovunque.
- **Proposta:** creare `src/components/ui/Button.tsx` con varianti (`primary`, `secondary`,
  `danger`, `ghost`), dimensioni (`sm`, `md`, `lg`), stato `loading` e `disabled`, rispettando la
  palette per ruolo documentata in CLAUDE.md (blu atleta / viola maestro / arancione admin).
  Esportarlo dal barrel `src/components/ui/index.ts`. **Non fare una migrazione di massa**:
  adottarlo nei nuovi sviluppi e nei file che si toccano per altri motivi.
- **Beneficio atteso:** coerenza visiva, un solo punto dove sistemare accessibilità e stati di focus.
- **Note/rischi:** una migrazione forzata di 549 bottoni introdurrebbe regressioni visive diffuse.
  L'adozione va fatta in modo incrementale.

### [IM-03] Estrarre la logica condivisa dei form di prenotazione

- **Priorità:** 🟡 · **Sforzo:** L · **Rischio:** Alto · **Distruttivo:** No
- **File coinvolti:** `src/app/dashboard/admin/bookings/new/page.tsx` (1237 righe) vs
  `src/app/dashboard/atleta/(main)/bookings/new/page.tsx` (861);
  `src/app/dashboard/admin/bookings/modifica/page.tsx` (971) vs
  `src/app/dashboard/atleta/(main)/bookings/[id]/edit/page.tsx` (730)
- **Situazione attuale:** ~3800 righe con logica largamente sovrapposta (selezione campo, slot,
  partecipanti, validazione anti-overlap), divergenti solo per i permessi del ruolo.
- **Proposta:** estrarre progressivamente la logica **non-UI** in hook condivisi
  (`useBookingForm`, `useAvailableSlots`), mantenendo separate le due UI. Iniziare da **P-05**
  (generazione slot), che è la porzione più isolabile.
- **Beneficio atteso:** una correzione al flusso prenotazioni si applica a entrambi i ruoli.
- **Note/rischi:** **Rischio Alto** e **conflitto immediato**: tutti e quattro i file risultano
  **modificati in `git status`**. Questo intervento va rimandato a dopo il commit del lavoro in
  corso. Il flusso prenotazioni ha vincoli DB delicati (max 4 partecipanti via trigger,
  anti-overlap con btree_gist): ogni modifica va verificata contro entrambi.

### [IM-04] Ridurre il debito di tipizzazione nelle API

- **Priorità:** 🟢 · **Sforzo:** L · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** trasversale; ~442 occorrenze di `no-explicit-any` concentrate in `src/lib/`
- **Situazione attuale:** `strict: false` in `tsconfig` e `any` pervasivo. CLAUDE.md chiede di non
  introdurne di nuovi.
- **Proposta:** non un refactor globale. Tipizzare progressivamente **i punti di confine**: corpi
  delle request (che **S-07** già tipizza tramite `z.infer` degli schemi Zod) e risposte Supabase.
  Il modo più efficiente è generare i tipi del DB con `supabase gen types typescript`.
- **Beneficio atteso:** errori intercettati a compile time invece che in produzione.
- **Note/rischi:** attivare `strict: true` in blocco produrrebbe centinaia di errori: non farlo.

---

## 5. Effetti / UX

### [UX-01] Aggiungere error boundary, loading e 404 personalizzati

- **Priorità:** 🔴 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** da creare in `src/app/` e nei segmenti principali
- **Situazione attuale:** **zero `error.tsx`, zero `loading.tsx`, zero `not-found.tsx`, zero
  `global-error.tsx` in tutto il progetto.** Conseguenze concrete: un throw in un componente
  mostra la schermata di errore di default di Next (in produzione, una pagina bianca con
  "Application error"), non esiste una 404 personalizzata, e le navigazioni non hanno feedback.
- **Proposta:**
  1. `src/app/not-found.tsx` — 404 con branding e link di rientro alla dashboard.
  2. `src/app/error.tsx` — error boundary con messaggio in italiano e pulsante "Riprova"
     (`reset()`), che logga l'errore tramite il secure logger.
  3. `src/app/global-error.tsx` — fallback per errori nel root layout.
  4. `loading.tsx` nei segmenti dashboard (`admin`, `atleta`, `maestro`) usando lo skeleton di **UX-02**.
- **Beneficio atteso:** nessuna pagina bianca in produzione; feedback immediato durante le
  navigazioni; errori tracciati invece che silenziosi.
- **Note/rischi:** `error.tsx` deve essere un Client Component (`'use client'`) — è un requisito
  di Next, non una scelta.

### [UX-02] Creare un componente `Skeleton` condiviso

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** da creare `src/components/ui/Skeleton.tsx`; oggi 106 file usano
  `animate-pulse`/`animate-spin` e 95 file dichiarano un `useState(true)` per il flag di loading
- **Situazione attuale:** gli stati di caricamento sono gestiti a mano e duplicati ovunque, con
  risultati visivamente incoerenti. Non esiste un componente `Skeleton` condiviso.
- **Proposta:** creare `Skeleton` con varianti composte (`SkeletonText`, `SkeletonCard`,
  `SkeletonTable`, `SkeletonChart`) ed esportarlo dal barrel `src/components/ui/index.ts`.
  Adottarlo prima nei `loading.tsx` di **UX-01** e nei `loading` di **PF-01**, poi
  incrementalmente altrove.
- **Beneficio atteso:** percezione di velocità migliore, coerenza visiva, meno codice duplicato.
- **Note/rischi:** nessuno. Non serve una libreria esterna: bastano Tailwind e `animate-pulse`.

### [UX-03] Rendere la Modal accessibile da tastiera

- **Priorità:** 🔴 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/components/ui/Modal.tsx`
- **Situazione attuale:** la modale imposta correttamente `role="dialog"` e `aria-modal="true"`
  (righe 116-117) e gestisce `document.body.style.overflow` (righe 52-63), ma:
  - **il tasto `Escape` non la chiude** — la stringa `Escape` non compare in **nessun** file `.tsx`
    del progetto;
  - nessun focus trap: il Tab esce dalla modale e naviga la pagina sottostante;
  - nessun autofocus all'apertura, nessun ripristino del focus alla chiusura
    (`.focus()` ha **0 occorrenze** in tutto `src/`);
  - manca `aria-labelledby` che colleghi `ModalTitle` al dialog;
  - `ModalTrigger` con `asChild` (riga 74) renderizza un `<div onClick>` **non focalizzabile né
    attivabile da tastiera**.
- **Proposta:**
  1. `useEffect` con listener `keydown` che chiude su `Escape`, registrato solo quando è aperta.
  2. Focus trap: salvare `document.activeElement` all'apertura, spostare il focus sul primo
     elemento focalizzabile, ciclare il Tab dentro la modale, ripristinare il focus alla chiusura.
  3. Generare un `id` per `ModalTitle` e collegarlo con `aria-labelledby`.
  4. Sostituire il `<div onClick>` di `ModalTrigger` con un `<button>`, oppure aggiungere
     `role="button"`, `tabIndex={0}` e handler `onKeyDown` per Invio/Spazio.
- **Beneficio atteso:** le modali diventano usabili senza mouse e con screen reader. Poiché il
  componente è condiviso, il beneficio si propaga a tutta l'app.
- **Note/rischi:** implementabile senza dipendenze esterne. Nota: esiste
  `src/app/accessibility/page.tsx` (dichiarazione formale di accessibilità) non supportata
  dall'implementazione attuale — vedi anche **D-02**.

### [UX-04] Aggiungere nomi accessibili ai bottoni icona

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** trasversale — 96 `aria-label` su 549 `<button>`; icone lucide-react in 130 file
- **Situazione attuale:** molti bottoni sono solo-icona e quindi **privi di nome accessibile**:
  uno screen reader annuncia "pulsante" senza dire cosa faccia. Altri attributi ARIA sono quasi
  assenti (`aria-expanded` 2, `aria-pressed` 1, zero `aria-live`/`aria-current`/`aria-invalid`);
  `role=` compare 8 volte in tutta la codebase.
- **Proposta:**
  1. Cercare i `<button>` il cui unico figlio è un'icona lucide e aggiungere `aria-label`
     descrittivo in italiano (es. `aria-label="Elimina prenotazione"`).
  2. Aggiungere `aria-hidden="true"` alle icone decorative accompagnate da testo.
  3. Aggiungere `aria-current="page"` alla voce di menu attiva nei layout dashboard.
  4. Se **IM-02** viene eseguito, far sì che `Button` avverta (in dev) quando riceve solo
     un'icona senza `aria-label`.
- **Beneficio atteso:** app utilizzabile con screen reader; coerenza con la dichiarazione di
  accessibilità pubblicata.
- **Note/rischi:** nessuno. Nota positiva: **tutte e 53 le `<img>` hanno già `alt`**.

---

## 6. Sicurezza

### [S-01] 🚨 CRITICO — Privilege escalation ad admin senza autenticazione

- **Priorità:** 🔴 · **Sforzo:** M · **Rischio:** Basso (il fix) · **Distruttivo:** Sì (drop di una policy RLS)
- **File coinvolti:** `supabase/migrations/015_dashboard_refactor_features_SAFE.sql:89-92`,
  `src/app/api/invite-codes/validate/route.ts:57-174`
- **Situazione attuale:** esiste una catena completa di escalation sfruttabile **da un attaccante
  non autenticato**:

  1. La policy RLS `"Anyone can validate a specific code"` su `invite_codes` è
     `FOR SELECT USING (true)` (riga 89-92). In PostgreSQL le policy permissive si sommano in OR,
     quindi questa **annulla** le quattro policy admin definite subito sopra: chiunque possieda la
     anon key — che è pubblica per definizione, esposta come `NEXT_PUBLIC_SUPABASE_ANON_KEY` —
     può eseguire `select * from invite_codes` e ottenere **tutti i codici con il relativo ruolo**.
  2. `POST /api/invite-codes/validate` (riga 57) **non ha alcuna autenticazione**. Accetta
     `{ code, user_id, profile_data }` dal body e alla riga 103-111 esegue un `upsert` su
     `profiles` impostando `role: inviteCode.role` per l'`user_id` **fornito dal chiamante**.
     Non verifica in alcun modo che il chiamante sia quell'utente.

  Combinando i due passi: un attaccante legge i codici, individua (o attende) un codice con
  `role = 'admin'`, e chiama l'endpoint con il proprio `user_id` — ottenendo privilegi di admin.
  Lo stesso endpoint consente anche di **modificare il ruolo di utenti terzi**.

  Nota: `GET /api/invite-codes/validate` usa la service role key e quindi **non dipende** dalla
  policy permissiva; anche la funzione SQL `validate_invite_code`
  (`015_…_SAFE.sql:528`) è oggi l'unico potenziale consumer legittimo di quella policy, ma non
  risulta usata dall'applicazione.

- **Proposta:** applicare **tutti e tre** i punti, nell'ordine indicato.

  1. **Autenticare il POST** (fix applicativo, il più urgente): all'inizio del handler
     verificare la sessione e imporre che `user_id` coincida con l'utente autenticato:
     ```ts
     const auth = await verifyAuth(request);
     if (!auth.success) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
     if (auth.user.id !== user_id) {
       return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
     }
     ```
     Rifiutare inoltre l'assegnazione di un ruolo se il profilo ha **già** un ruolo diverso da
     quello di default (un codice invito deve poter essere applicato una sola volta, alla
     registrazione).
  2. **Nuova migrazione** che rimuove la policy permissiva:
     ```sql
     DROP POLICY IF EXISTS "Anyone can validate a specific code" ON public.invite_codes;
     ```
     Prima di applicarla, **verificare** che nessun client legga `invite_codes` direttamente con
     la anon key (l'analisi indica che tutte le letture passano dalle API con service role).
  3. Se la funzione `validate_invite_code` risulta effettivamente usata, ricrearla con
     `SECURITY DEFINER` e `SET search_path = public` **prima** di eseguire il DROP: senza la
     policy permissiva, essendo a diritti dell'invocante, smetterebbe di funzionare.
- **Beneficio atteso:** chiude una scalata di privilegi ad admin sfruttabile senza credenziali.
- **Note/rischi:** **Distruttivo** (rimuove una policy). Rispettare l'ordine: prima il fix
  applicativo (punto 1), che è immediato e senza rischi di rottura, poi la migrazione.
  Dopo il deploy, **verificare in DB che nessun account abbia ottenuto il ruolo admin in modo
  anomalo** (`select id, email, role, updated_at from profiles where role in ('admin','gestore')
  order by updated_at desc;`).

### [S-02] `/api/invite-code-logs` espone l'anagrafica utenti in anonimo

- **Priorità:** 🔴 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/app/api/invite-code-logs/route.ts:4`
- **Situazione attuale:** il `GET` **non ha alcuna autenticazione** e, tramite service role,
  restituisce `full_name`, `email` e `role` di tutti gli utenti che hanno usato un codice invito
  (righe 37-40), insieme ai codici stessi (righe 50-53). Enumerazione anagrafica completa senza
  credenziali. La route gemella `src/app/api/invite-codes/[id]/uses/route.ts` usa invece
  `getRouteAuth`: qui è una dimenticanza, non una scelta.
- **Proposta:** aggiungere in testa al handler il controllo di ruolo, allineandosi alla route
  gemella (`getRouteAuth` + verifica `admin`/`gestore`), restituendo 401/403 in caso negativo.
  Validare inoltre il parametro `limit` (riga 7: `parseInt` senza tetto massimo).
- **Beneficio atteso:** chiude un leak diretto di dati personali (GDPR).
- **Note/rischi:** verificare quale pagina admin consuma questo endpoint, per accertarsi che
  invii le credenziali nella forma attesa dall'helper scelto.

### [S-03] `/api/upload/news-image` — upload anonimo e cancellazione arbitraria

- **Priorità:** 🔴 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/app/api/upload/news-image/route.ts`
- **Situazione attuale:** tre problemi distinti nello stesso file:
  1. **Nessuna autenticazione** sul `POST` (riga 57): chiunque può caricare file da 5 MB nel
     bucket `avatars`. Le altre tre route di upload (`staff-image`, `certificate`,
     `messages/upload`) usano invece `getRouteAuth` — anche qui è una dimenticanza.
  2. **Cancellazione arbitraria** (righe 93-101): il campo `oldImageUrl` arriva dal client e viene
     usato per `storage.remove()` senza verificare che il chiamante possieda quell'immagine.
     Un attaccante può cancellare qualsiasi oggetto nel bucket `avatars`, inclusi gli avatar di
     tutti gli utenti.
  3. **Protezione SSRF incompleta** (righe 18-28): la blocklist copre `localhost`, `127.0.0.1`,
     `192.168.`, `10.`, `172.16.`, `::1`, `0.0.0.0`, ma **omette** `172.17.`–`172.31.`
     (range Docker), `169.254.169.254` (endpoint metadata cloud) e la forma `[::ffff:…]`.
     Inoltre con `redirect: "follow"` (riga 32) il controllo pre-fetch è aggirabile con un
     redirect verso un IP interno.
- **Proposta:**
  1. Aggiungere l'autenticazione con ruolo `admin`/`gestore` (le immagini news sono contenuto
     redazionale), allineandosi a `upload/staff-image`.
  2. Rimuovere il parametro `oldImageUrl` dal contratto: la cancellazione della vecchia immagine
     va fatta server-side, ricavando il path dal record news che si sta aggiornando. In
     alternativa, validare che il path appartenga al prefisso `news/` **e** che l'utente abbia i
     permessi su quella news.
  3. Completare la blocklist SSRF con i range mancanti e impostare `redirect: "manual"`,
     rivalidando l'host a ogni hop.
  4. Applicare il profilo `FILE_UPLOAD` del rate limiter (vedi **S-06**).
- **Beneficio atteso:** elimina una via di riempimento dello storage, una di cancellazione dati e
  una di SSRF.
- **Note/rischi:** il punto 2 cambia il contratto dell'API: individuare i client che inviano
  `oldImageUrl` e aggiornarli nello stesso intervento.

### [S-04] Protezione CSRF bypassabile quando manca l'header `Origin`

- **Priorità:** 🔴 · **Sforzo:** S · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** `src/middleware.ts:15-33`
- **Situazione attuale:** il controllo CSRF è racchiuso in `if (origin) { … }` (riga 17): se
  l'header `Origin` **è assente**, la richiesta passa senza alcuna verifica. Il commento alle
  righe 9-10 giustifica la scelta con le chiamate server-to-server, ma esiste già un'esclusione
  dedicata per `/api/webhooks/` alla riga 13, che rende la condizione ridondante. I browser
  omettono `Origin` in alcuni scenari cross-site (form HTML classici), quindi la protezione è
  aggirabile.
- **Proposta:** rendere il controllo **fail-closed**: per richieste mutanti verso `/api/` non
  webhook, se `Origin` manca, usare `Referer` come fallback e, in assenza di entrambi, rifiutare
  con 403.
- **Beneficio atteso:** chiude il bypass. Riguarda in particolare le ~35 route che si autenticano
  via cookie (`getRouteAuth`); quelle con Bearer token (`verifyAuth`) sono intrinsecamente immuni.
- **Note/rischi:** **Rischio Medio** e **CLAUDE.md richiede conferma esplicita per modificare
  `middleware.ts`**. Prima del deploy, verificare che nessuna integrazione legittima chiami le API
  senza `Origin` né `Referer` (in tal caso va aggiunta all'esclusione webhook o autenticata con
  un token dedicato).

### [S-05] Route API senza autenticazione o con autorizzazione insufficiente

- **Priorità:** 🔴 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:**
  - `src/app/api/tournaments/reports/route.ts:4` — GET anonimo con `select('*')` su `tournaments`
    e `tournament_participants`
  - `src/app/api/tournaments/[id]/knockout/route.ts:5` — GET anonimo con join su
    `profiles(full_name)`
  - `src/app/api/arena/players/route.ts` — `verifyAuth(request)` **senza `allowedRoles`**:
    qualunque utente autenticato ottiene la lista giocatori
  - `src/app/api/tournaments/[id]/groups/route.ts:71` — legge `.select("user_role")` da `profiles`
    mentre tutto il resto della codebase usa la colonna `role`
- **Situazione attuale:** le prime due espongono dati (inclusi nomi utente) senza credenziali;
  la terza non restringe per ruolo; la quarta è un **bug**: se la colonna `user_role` non esiste,
  `profile` è `null` e il controllo alla riga 75 nega sempre l'accesso. È fail-closed, quindi non
  sfruttabile, ma la route è di fatto rotta.
- **Proposta:**
  1. Aggiungere l'autenticazione a `tournaments/reports` e `tournaments/[id]/knockout`; decidere
     se i dati dei tornei debbano essere pubblici (in tal caso rimuovere almeno i campi personali
     come `full_name` dalla risposta anonima).
  2. Aggiungere `allowedRoles` esplicito a `arena/players`.
  3. Correggere `user_role` → `role` in `tournaments/[id]/groups/route.ts:71` e verificare che
     la route torni a funzionare.
- **Beneficio atteso:** chiude tre esposizioni di dati e ripara una route non funzionante.
- **Note/rischi:** confermare con il proprietario quali dati dei tornei siano intenzionalmente
  pubblici prima di restringere (potrebbe rompere una vista pubblica esistente).

### [S-06] Applicare i profili di rate limiting già definiti ma mai usati

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/lib/security/rate-limiter.ts` (8 profili definiti, 4 usati su 5 route:
  `auth/signup/route.ts:30`, `bookings/route.ts:148`, `tournaments/route.ts:165`,
  `users/search/route.ts:24`, `weather/route.ts:12`)
- **Situazione attuale:** tre profili sono definiti e **mai applicati**:
  - `EMAIL_SEND` — nessuna delle 5 call site di `resend.emails.send`
    (`booking-notifications.ts:266,481,714,920`, `signup-notifications.ts:138`) è protetta:
    rischio di consumo della quota Resend o di uso come relay.
  - `FILE_UPLOAD` — nessuna delle 4 route di upload lo usa; `news-image` è per giunta anonima (**S-03**).
  - `AUTH_PASSWORD_RESET` — `src/app/api/admin/users/reset-password/route.ts` non lo applica.

  Inoltre `/api/invite-codes/validate` (GET) non ha limiti e consente il **brute-force dei codici
  invito**, che determinano il ruolo assegnato (collegato a **S-01**), e
  `/api/ai-news/genera` — l'endpoint più costoso, con chiamate Gemini e fetch RSS — non ha alcun
  limite.
- **Proposta:** applicare i profili esistenti, senza introdurre dipendenze:
  1. `AUTH_PASSWORD_RESET` su `admin/users/reset-password`.
  2. `FILE_UPLOAD` sulle quattro route di upload.
  3. `EMAIL_SEND` nel punto centrale di invio email (`src/lib/email/`), non nelle singole call site.
  4. Un limite stretto su `invite-codes/validate` (GET) e su `ai-news/genera`.
  5. Estendere il limite ai metodi `PUT`/`DELETE` di `bookings` e `tournaments`, oggi applicato
     solo nel ramo `POST`.
- **Beneficio atteso:** riduce brute-force e abuso di quota, riusando codice già scritto.
- **Note/rischi:** **limite noto e non risolto qui**: lo store è una `Map` in-memory
  (`rate-limiter.ts:25`), quindi su Vercel serverless il limite effettivo è moltiplicato per il
  numero di istanze e si azzera a ogni cold start. Inoltre `getClientIdentifier` (riga 45) si
  fida di `x-forwarded-for` senza validazione. Il fix corretto richiede uno store condiviso ed è
  registrato fra le **Domande aperte**.

### [S-07] Estendere la validazione Zod alle route che ne sono prive

- **Priorità:** 🟡 · **Sforzo:** L · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/lib/validation/schemas.ts` (26 schemi definiti, **importati in 6 route
  su 92**, ~6,5% di copertura). Casi prioritari:
  `src/app/api/news/route.ts:32` (destrutturazione grezza, con `createNewsSchema` disponibile e
  inutilizzato), `src/app/api/invite-codes/route.ts:69` (`role` non validato contro
  `userRoleSchema` — rilevante per **S-01**),
  `src/app/api/admin/users/route.ts:263` (10 campi destrutturati senza schema)
- **Situazione attuale:** il layer di validazione esiste ma non è collegato: le API destrutturano
  il body a mano. Mitigazione parziale: `sanitize-server.ts` è usato in 8 route, ma è
  sanitizzazione, non validazione di struttura e tipo.
- **Proposta:** applicare `schema.safeParse(body)` all'inizio dei handler, restituendo 400 con gli
  errori in caso di fallimento, partendo dalle tre route prioritarie sopra. Usare `z.infer` per
  tipizzare il body, il che riduce anche il debito di **IM-04**. Dove lo schema non esiste,
  aggiungerlo a `schemas.ts` riusando i primitivi già presenti (`uuidSchema`, `phoneSchema`,
  `userRoleSchema`).
- **Beneficio atteso:** input malformati respinti al confine invece di propagarsi nel DB;
  risolve anche gran parte di **P-06**.
- **Note/rischi:** uno schema più stretto del comportamento attuale può respingere richieste
  legittime. Verificare ogni schema contro i payload realmente inviati dal frontend prima del deploy.

### [S-08] Rendere la validazione delle variabili d'ambiente fail-closed

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** `src/lib/config/env.ts:63-101`
- **Situazione attuale:** se la validazione Zod delle env fallisce, il codice **non lancia**:
  logga e prosegue con `process.env` grezzo ("Continuing with partial configuration"). Un deploy
  privo di `SUPABASE_SERVICE_ROLE_KEY` parte comunque e fallisce a runtime in modo opaco.
  Inoltre `GEMINI_API_KEY` è documentata in `.env.example` ma **assente da `serverEnvSchema`**,
  quindi non validata: è letta direttamente via `process.env` in `ai-news/cleanup/route.ts:64`.
- **Proposta:**
  1. In produzione (`NODE_ENV === "production"`), lanciare un errore al boot se la validazione
     server fallisce. In sviluppo mantenere il comportamento permissivo attuale.
  2. Aggiungere `GEMINI_API_KEY` a `serverEnvSchema` come opzionale (il modulo AI news deve poter
     essere disabilitato, coerentemente con il comportamento già adottato per `RESEND_API_KEY`).
- **Beneficio atteso:** i deploy mal configurati falliscono subito e in modo chiaro, invece di
  degradare in modo silenzioso.
- **Note/rischi:** **Rischio Medio** — se una variabile è marcata obbligatoria per errore, il
  deploy in produzione si blocca. Verificare l'elenco contro le env effettivamente configurate su
  Vercel **prima** del rilascio.

### [S-09] Rafforzare la Content Security Policy

- **Priorità:** 🟢 · **Sforzo:** M · **Rischio:** Medio · **Distruttivo:** No
- **File coinvolti:** `next.config.ts:26-29`
- **Situazione attuale:** buona base (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS). Ma `script-src 'self' 'unsafe-inline'` vale **anche in
  produzione**, e `'unsafe-inline'` annulla gran parte del valore anti-XSS della CSP. Il `TODO`
  alla riga 25 riconosce già il problema. Mancano `object-src 'none'`, `base-uri 'self'` e
  `form-action 'self'`. La direttiva `img-src` include `https:` generico, che rende ridondanti le
  whitelist successive.
  Fattore mitigante: esistono solo **2** `dangerouslySetInnerHTML`, entrambe sicure
  (`src/app/layout.tsx:54,57`, JSON-LD generato da `JSON.stringify` di oggetti interni).
- **Proposta:** procedere in due tempi:
  1. **Subito, a basso rischio:** aggiungere `object-src 'none'`, `base-uri 'self'`,
     `form-action 'self'`.
  2. **In un intervento dedicato:** migrare a CSP nonce-based per rimuovere `'unsafe-inline'`,
     usando il middleware per generare un nonce per richiesta.
- **Beneficio atteso:** riduce lo spazio di manovra in caso di XSS.
- **Note/rischi:** **Rischio Medio** e **CLAUDE.md richiede conferma esplicita per modificare
  `next.config.ts`**. Una CSP troppo stretta rompe la pagina in modo vistoso: testare in preview
  con la console aperta prima di andare in produzione.

### [S-10] `decodeHtmlEntities` riabilita markup neutralizzato

- **Priorità:** 🟡 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/lib/ai-news/contentSanitizer.ts:11-19`
- **Situazione attuale:** il file, nonostante il nome, **non è un sanitizzatore di sicurezza**: è
  un normalizzatore editoriale (decodifica entità, ripara UTF-8, rimuove boilerplate). La
  funzione `decodeHtmlEntities` converte `&lt;`/`&gt;` in `<`/`>` reali (righe 11-12),
  cioè **trasforma HTML neutralizzato in markup attivo**, su contenuti che provengono da feed RSS
  esterni.
  Oggi è innocuo perché i contenuti AI/RSS sono renderizzati come testo React (che fa escaping
  automatico) e non tramite `dangerouslySetInnerHTML`. Ma diventa una vulnerabilità nel momento
  in cui quel testo finisse in un corpo email HTML o in un innerHTML.
- **Proposta:**
  1. Rinominare il file o aggiungere un commento in testa che chiarisca esplicitamente che
     **non offre garanzie di sicurezza** e che il suo output non va mai inserito in HTML senza
     sanitizzazione.
  2. Prima di qualunque uso in HTML, far passare l'output da `sanitizeHtml`
     (`src/lib/security/sanitize.ts:28`, basata su DOMPurify): la dipendenza
     `isomorphic-dompurify` è **già installata** (`package.json:22`) ma quella funzione non è
     importata da nessun file applicativo.
  3. Completare la protezione SSRF nella pipeline RSS: `ai-news/genera/route.ts` fa fetch di URL
     presi dal DB (righe 53, 218, 290) e, a differenza di `news-image/route.ts`, **non blocca gli
     IP privati**. Le fonti sono admin-controlled, quindi il rischio è contenuto, ma un feed
     legittimo può redirigere.
- **Beneficio atteso:** previene una XSS latente e chiude una SSRF residua.
- **Note/rischi:** nessuna nuova dipendenza: DOMPurify è già nel progetto.

### [S-11] ⚠️ Segnalazione — RLS non verificabile staticamente sulle tabelle core

- **Priorità:** 🔴 (verifica) · **Sforzo:** S · **Rischio:** — · **Distruttivo:** No
- **File coinvolti:** `supabase/migrations/` (81 file), `supabase/schema.sql:113,409`,
  `supabase/scripts/utilities/RESET_DATABASE.sql:473-475`
- **Situazione attuale:** `profiles`, `bookings` e `courses` — le tabelle più sensibili del
  progetto — **non hanno mai `ENABLE ROW LEVEL SECURITY` in nessuna migrazione numerata**.
  L'istruzione compare solo in `schema.sql`, in `RESET_DATABASE.sql` (script di utilità) e in
  `migrations/archive/`. Se il deploy è pilotato dalle migrazioni, queste tabelle potrebbero
  essere **senza RLS in produzione**.
  Contesto aggravante: `supabaseServer` (service role, che bypassa RLS) è importato in ~85 route
  su 92, quindi la sicurezza dei dati poggia quasi interamente sui controlli applicativi.
- **Proposta:** **questo punto è una sola verifica, nessuna modifica.** Eseguire sul DB di produzione:
  ```sql
  select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
  ```
  Riportare l'esito al proprietario. **Non abilitare RLS come parte di questo piano**: farlo
  senza policy corrette romperebbe le numerose letture client-side che usano la anon key, ed è un
  intervento che richiede progettazione dedicata e approvazione esplicita (CLAUDE.md vieta di
  toccare policy RLS senza conferma).
- **Beneficio atteso:** chiarisce se esiste o meno una difesa in profondità a livello di database.
- **Note/rischi:** nessuno — è di sola lettura.

### [S-12] Policy `USING (true)` su tabelle di log e impostazioni

- **Priorità:** 🟡 · **Sforzo:** M · **Rischio:** Medio · **Distruttivo:** Sì (modifica policy)
- **File coinvolti:**
  - `supabase/migrations/025_create_email_log.sql:37-43` — `email_log`: INSERT **e UPDATE**
    `USING (true)` → riscrittura arbitraria dei log
  - `supabase/migrations/034_create_email_logs_table_if_missing.sql:32-37` — `email_logs`
    (tabella duplicata), stesso problema
  - `supabase/migrations/024_create_activity_log.sql:35` e
    `015_…_SAFE.sql:498-500` — `activity_log`: INSERT `USING (true)` → log injection / flooding
  - `015_…_SAFE.sql:307-309` — `system_settings`: SELECT `USING (true)`
  - `020_add_user_presence_system.sql:41` — `user_presence`: espone lo stato online di tutti
- **Situazione attuale:** più tabelle hanno policy completamente permissive. La più grave è
  l'UPDATE su `email_log`/`email_logs`, che consente a qualunque client di **riscrivere i log**,
  cioè di cancellare le proprie tracce.
  Nota: `020b_fix_rls_security.sql` (righe 11, 33, 53) mostra che questo stesso anti-pattern era
  **già stato identificato e corretto** per `orders`, `notifications` e `payments` — la
  correzione non è mai stata estesa a queste tabelle.
- **Proposta:** in una nuova migrazione, replicare il pattern già usato in `020b`:
  1. Rimuovere la policy UPDATE permissiva su `email_log` e `email_logs` (i log non vanno
     aggiornati dai client; le scritture applicative passano dalla service role, che bypassa RLS).
  2. Restringere la SELECT su `system_settings` dopo aver verificato quali chiavi contiene: se
     include valori di configurazione sensibili, va limitata ad admin/gestore.
  3. Valutare la restrizione di `activity_log` INSERT.
- **Beneficio atteso:** log non alterabili, superficie di manipolazione ridotta.
- **Note/rischi:** **Distruttivo** (modifica policy) e **CLAUDE.md richiede conferma esplicita
  per toccare le policy RLS**. Verificare prima quali client scrivono su queste tabelle con la
  anon key: se qualcuno lo fa, restringere la policy interrompe la scrittura dei log.
  Da concordare, non da applicare d'ufficio.

---

## 7. Altro

### [A-01] Introdurre test sulle API route critiche

- **Priorità:** 🔴 · **Sforzo:** L · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/__tests__/` (19 file, 3290 righe, tutti test unitari su `src/lib`)
- **Situazione attuale:** **zero test su 93 API route.** Nessun handler `route.ts` viene mai
  invocato nei test; le 4 occorrenze di `/api/` nei test sono semplici stringhe. Le cartelle
  `src/components/bookings/__tests__`, `src/components/layout/__tests__` e
  `src/components/profile/__tests__` esistono ma sono **vuote**.
  Completamente scoperte: `api/auth/signup`, `api/bookings/batch` (la più complessa, 460+ righe
  con invii email), `api/bookings/confirm`, `api/bookings/reject`, `api/admin/users`,
  `api/invite-codes/validate` (**la route di S-01**), le 4 route di upload,
  `api/arena/reset-season`, tutta la catena `api/tournaments/[id]/generate-*` e `advance-*`,
  `api/contabilita/*`, `api/ai-news/cron/*`.
- **Proposta:** iniziare dai test di **autorizzazione**, che sono i più economici e i più
  preziosi: per ogni route sensibile, verificare che una richiesta non autenticata riceva 401 e
  che un ruolo non abilitato riceva 403. Ordine suggerito:
  1. `api/invite-codes/validate` (regressione su **S-01**)
  2. `api/invite-code-logs` (**S-02**), `api/upload/*` (**S-03**)
  3. `api/bookings/batch` — test di logica, non solo di auth
- **Beneficio atteso:** i fix di sicurezza di questo piano vengono protetti da regressioni future.
- **Note/rischi:** richiede il mocking del client Supabase; conviene estrarre un helper di mock
  condiviso al primo test e riusarlo.

### [A-02] Alzare progressivamente la soglia di coverage

- **Priorità:** 🟢 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `jest.config.js:20-27`
- **Situazione attuale:** la soglia globale è al **10%** su branches/functions/lines/statements:
  un valore simbolico che non protegge nulla.
- **Proposta:** dopo **A-01**, misurare la copertura reale e alzare la soglia poco sopra il
  valore effettivo, così che non possa scendere. Ripetere a ogni incremento di test.
- **Beneficio atteso:** effetto cricchetto — la copertura può solo salire.
- **Note/rischi:** alzare la soglia prima di scrivere i test fa fallire subito la CI.

### [A-03] Sostituire sitemap e robots statici con le versioni dinamiche

- **Priorità:** 🟢 · **Sforzo:** S · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** da creare `src/app/sitemap.ts` e `src/app/robots.ts`; da rimuovere poi
  `public/sitemap.xml` e `public/robots.txt`
- **Situazione attuale:** entrambi i file sono statici. La sitemap **non include** news e tornei
  generati dinamicamente e va aggiornata a mano.
- **Proposta:** creare `src/app/sitemap.ts` che unisce le route statiche e quelle dinamiche
  interrogando Supabase per le news pubblicate e i tornei visibili; creare `src/app/robots.ts`
  che replica le regole attuali e punta alla nuova sitemap. Rimuovere i due file statici **solo
  dopo** aver verificato che le versioni generate rispondano correttamente.
- **Beneficio atteso:** indicizzazione automatica dei contenuti nuovi.
- **Note/rischi:** i file in `public/` hanno la precedenza sulle route generate — vanno rimossi,
  altrimenti la nuova sitemap non viene mai servita.

### [A-04] Estendere i dati strutturati JSON-LD

- **Priorità:** 🟢 · **Sforzo:** M · **Rischio:** Basso · **Distruttivo:** No
- **File coinvolti:** `src/lib/seo/metadata.ts`, `src/app/layout.tsx:54,57`,
  `src/app/news/[id]/page.tsx`, `src/app/tornei/[id]/page.tsx`
- **Situazione attuale:** esiste JSON-LD solo per `Organization`. Mancano `Article` sulle pagine
  news e `SportsEvent` sui tornei. Mancano inoltre `opengraph-image.tsx`/`twitter-image.tsx` in
  ogni segmento e un `manifest` (niente PWA).
  Nota positiva: il pattern dei metadata è corretto — i layout coprono i segmenti le cui pagine
  sono client component e quindi non possono esportare `metadata`.
- **Proposta:**
  1. Aggiungere lo schema `Article` a `news/[id]` (che ha già una `generateMetadata` dinamica:
     è l'unica pagina del progetto ad averla).
  2. Aggiungere `SportsEvent` alle pagine torneo.
  3. Valutare un `opengraph-image.tsx` per news e tornei, così che i link condivisi sui social
     mostrino un'anteprima.
- **Beneficio atteso:** rich result nei motori di ricerca, anteprime social migliori.
- **Note/rischi:** nessuno; validare con il Rich Results Test di Google.

---

## Ordine di esecuzione consigliato

### Fase 1 — Sicurezza urgente (da fare subito, in questo ordine)

1. **[S-01]** — privilege escalation ad admin senza autenticazione. Eseguire **prima** il fix
   applicativo sul POST, poi la migrazione che rimuove la policy. Al termine, verificare in DB
   che nessun account abbia ottenuto privilegi in modo anomalo.
2. **[S-02]**, **[S-03]** — leak di anagrafica e upload/cancellazione anonimi. Fix puntuali,
   indipendenti, a basso rischio.
3. **[S-05]** — route senza auth e bug `user_role`/`role`.
4. **[S-04]** — CSRF fail-closed. ⚠️ Tocca `middleware.ts`: **richiede conferma esplicita**
   secondo CLAUDE.md.
5. **[S-11]** — eseguire la query di verifica RLS e riportare l'esito. È di sola lettura e si può
   fare in parallelo a tutto il resto.

### Fase 2 — Quick win a rischio nullo

6. **[D-01]** — 404 attivo sulle notifiche ai maestri (bug utente-visibile).
7. **[D-02]** — link legali nel footer.
8. **[P-01]** — rimozione di `scan_output.txt` dal repo.
9. **[P-02]** — funzione no-op (si combina bene con D-01).
10. **[UX-01]** — `error.tsx` / `not-found.tsx` / `loading.tsx`: nessuna dipendenza, elimina le
    pagine bianche in produzione.

### Fase 3 — Prestazioni ad alto impatto

11. **[PF-01]** — `next/dynamic` su Recharts: il singolo intervento con il miglior rapporto
    beneficio/sforzo dell'intero piano.
12. **[PF-02]** — `framer-motion` fuori da `MenuCloseIcon`.
13. **[PF-03]**, **[PF-04]** — N+1 lato server, fix chirurgici.
14. **[UX-02]** — componente `Skeleton` (serve ai `loading` di PF-01 e UX-01, da cui la posizione).
15. **[P-08]** + **[PF-07]** — asset e `next/image`, partendo da `TextHeroSection`.

### Fase 4 — Robustezza

16. **[S-06]** — applicare i profili di rate limiting esistenti.
17. **[S-07]** — estendere Zod (risolve anche gran parte di P-06).
18. **[A-01]** — test di autorizzazione sulle route toccate in Fase 1, per proteggere quei fix.
19. **[S-08]** — env fail-closed. ⚠️ Verificare le env su Vercel prima del deploy.
20. **[UX-03]**, **[UX-04]** — accessibilità di modali e bottoni icona.

### Fase 5 — Refactor strutturali (interventi dedicati, non incrementali)

21. **[P-05]** → **[IM-03]** — deduplicare slot orari e form prenotazione.
    ⚠️ **Da fare solo dopo il commit del lavoro in corso**: i file coinvolti risultano modificati
    in `git status`.
22. **[IM-01]** — unificare gli helper di autenticazione. Rischio alto, va fatto **dopo** i fix
    puntuali della Fase 1, non al loro posto.
23. **[PF-05]**, **[PF-06]** — waterfall della pagina mail e paginazione.
24. **[IM-02]**, **[IM-04]**, **[A-02]**, **[A-03]**, **[A-04]**, **[P-03]**, **[P-04]**,
    **[P-06]**, **[P-07]**, **[D-03]**, **[D-04]**, **[S-09]**, **[S-10]**, **[S-12]** —
    da pianificare singolarmente secondo le priorità del proprietario.

### ⚠️ Voci che richiedono conferma esplicita prima dell'esecuzione

Secondo le regole di CLAUDE.md e la natura distruttiva dell'intervento:

- **[S-04]** — modifica `middleware.ts`
- **[S-09]** — modifica `next.config.ts` (security headers / CSP)
- **[S-01] punto 2**, **[S-12]** — modificano policy RLS
- **[P-01]**, **[P-06]**, **[P-07]** — eliminano file o cartelle
- **[D-03]**, **[D-04]** — nessuna eliminazione proposta, ma la decisione finale spetta al proprietario
