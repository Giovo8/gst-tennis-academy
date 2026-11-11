# Frontend e design system

Convenzioni dell'interfaccia: organizzazione dei componenti, palette e stile, mobile, prestazioni. Stile e token sono in `src/app/globals.css` (custom properties in `:root`, token Tailwind in `@theme inline`), applicati con **Tailwind CSS 4**.

## Principi

- **Mobile-first**: i layout nascono per lo smartphone e si estendono al desktop.
- **Componenti per dominio** in `src/components/` (`bookings/`, `tournaments/`, `dashboard/`, `landing/`, `ui/`…). Gli hook specifici di un'area stanno accanto ai componenti (`components/admin/hooks/`, `components/tournaments/hooks/`).
- **Un solo componente per tutte le aree**: le pagine maestro riesportano spesso quelle atleta; chat (`components/chat/ChatView`), feedback (`components/feedback/*`) e centro notifiche (`components/notifications/NotificationCenter`) sono condivisi e parametrizzati con `basePath` o col ruolo.
- **Niente store globale**: i dati arrivano dal client Supabase (`src/lib/supabase/client.ts`, protetto dalla RLS) o dalle API.
- **Niente logica copiata tra pagine**: una funzione che serve a più pagine va in `src/lib/`. Esistono già:

  | Modulo                               | Contenuto                                                               |
  | ------------------------------------ | ----------------------------------------------------------------------- |
  | `src/lib/courses/schedule.ts`        | Date delle lezioni di un corso, campo e orario in una data, data locale |
  | `src/lib/arena/challengeDisplay.ts`  | Etichette delle sfide, lettura del punteggio, punti assegnati           |
  | `src/lib/news/display.ts`            | News pubblicata, titolo ripulito, data formattata                       |
  | `src/lib/utils/youtube.ts`           | ID di un video YouTube dall'URL                                         |
  | `src/lib/utils/formatItalianDate.ts` | Date in italiano (breve ed estesa)                                      |
  | `src/lib/courts/getCourts.ts`        | Lista dei campi da `courts_settings` (mai una costante con i nomi)      |
  | `src/lib/courts/blocks.ts`           | Blocchi campo: tipi, testo del motivo, generazione dei blocchi          |
  | `src/lib/courts/blockDisplay.ts`     | Tipo, icona e colore di un blocco campo                                 |
  | `src/lib/utils/dateInput.ts`         | Date degli input (`aaaa-mm-gg`) nel fuso locale                         |

- **Niente pagine copiate tra aree o tra "nuovo" e "modifica"**: la parte comune sta in un componente, la pagina tiene solo ciò che è suo (azioni, permessi). Esistono già `components/arena/ChallengeDetailView` (dettaglio sfida: le pagine admin e atleta passano solo i pulsanti), `components/courses/CourseParticipantView` (partecipante di un corso, iscritto o ospite, per admin e maestro), `components/courts/BlockFormFields` (campi dei form "crea" e "modifica" blocco) e i selettori di data in `components/ui/`: `DateCalendarPanel` (calendario a scomparsa sotto un campo), `DatePickerModal` (finestra con Oggi/Applica, limiti `disablePast` e `maxDate`) e `CalendarMonth`, la griglia del mese su cui si basano entrambi e il `DateNavigator` delle prenotazioni. Nessuna pagina disegna più il proprio calendario.

- **Hook condivisi** in `src/lib/hooks/`:

  | Hook                                                    | Uso                                                           |
  | ------------------------------------------------------- | ------------------------------------------------------------- |
  | `useNotifications(limit)`                               | Notifiche dell'utente con realtime, `markRead`, `markAllRead` |
  | `useUnreadChat(userId)`                                 | Messaggi chat non letti (pallino in navigazione)              |
  | `useWeather()`                                          | Meteo e previsioni (cache di 10 minuti a livello di modulo)   |
  | `useBookableTournaments()` / `useTournamentMatches(id)` | Tornei e partite prenotabili (prenotazione di tipo "torneo")  |
  | `useCourts()`                                           | Campi attivi per i selettori di campo                         |

## Palette

Una sola palette, "Frozen Lake" (azzurro/navy), per tutte le aree: non ci sono colori per ruolo. **Niente rosso**: anche errori, avvisi e badge usano tonalità del blu brand (vedi i toast e i tipi di avviso in `src/lib/avvisi/tipi.ts`). Esiste **solo il tema chiaro**: non usare la variante `dark:`; `:root` dichiara `color-scheme: light`, così scrollbar, input e date picker nativi restano chiari anche col sistema in modalità scura.

Token Tailwind (`bg-frozen-500`, `text-frozen-800`, `border-frozen-200`…):

| Token                | Hex       | Uso tipico                         |
| -------------------- | --------- | ---------------------------------- |
| `--color-frozen-50`  | `#e6f7fe` | Sfondi tenui                       |
| `--color-frozen-100` | `#cef0fd` | Sfondi muted                       |
| `--color-frozen-200` | `#9ce1fc` | Bordi                              |
| `--color-frozen-300` | `#6bd2fa` |                                    |
| `--color-frozen-400` | `#39c3f9` |                                    |
| `--color-frozen-500` | `#08b3f7` | **Primary / accent**               |
| `--color-frozen-600` | `#0690c6` | Primary scuro / hover              |
| `--color-frozen-700` | `#056c94` | Secondary chiaro, testo secondario |
| `--color-frozen-800` | `#034863` | **Secondary**, testo principale    |
| `--color-frozen-900` | `#022431` | Sfondi scuri                       |
| `--color-frozen-950` | `#011923` |                                    |

Le variabili `--color-frozen-lake-600`…`900` esistono solo in `:root`: si usano come `var(--color-frozen-lake-900)`, ma classi come `text-frozen-lake-700` **non generano alcuno stile**. Per le classi usare la scala `frozen-*`.

Il tema mappa anche i colori di sistema (`bg-background`, `text-foreground`, `text-primary`, `bg-primary`, `text-accent`, `text-muted`, `bg-surface`, `border-border`) e `globals.css` definisce le classi di comodo `.text-primary`, `.text-secondary`, `.bg-secondary`, `.border-secondary`, `.text-accent`.

Variabili di brand in `:root`:

| Variabile                                    | Valore                                     |
| -------------------------------------------- | ------------------------------------------ |
| `--primary`, `--accent`                      | `#08b3f7` (frozen-500)                     |
| `--primary-200`                              | primary al 20%                             |
| `--secondary`                                | `#034863` (frozen-800)                     |
| `--secondary-light` / `--secondary-hover`    | frozen-700 / frozen-900                    |
| `--background` / `--surface`                 | `#ffffff`                                  |
| `--background-subtle` / `--background-muted` | frozen-50 / frozen-100                     |
| `--foreground` / `--foreground-muted`        | frozen-800 / frozen-700                    |
| `--border`                                   | frozen-200                                 |
| `--card-border`                              | `rgba(0, 0, 0, 0.1)` (= `border-black/10`) |

## Tipografia

| Elemento | Font                         | Origine                                                                 |
| -------- | ---------------------------- | ----------------------------------------------------------------------- |
| Testo    | Inter Tight (`--font-inter`) | `src/app/fonts/InterTight-latin.woff2`, self-hosted (`next/font/local`) |
| Titoli   | Urbanist (`--font-urbanist`) | `src/app/fonts/Urbanist-latin.woff2`, applicato a `h1`–`h6`             |

Corpo a 16px con interlinea 1.6. Font variabili (pesi 300–900) caricati in locale: nessuna richiesta a Google Fonts.

## Layout e superfici

| Token / classe               | Valore / uso                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `--sidebar-width`            | `280px`                                                                          |
| `--container-max`            | `1280px` (classe `.container`)                                                   |
| `--space-4`, `--space-6`     | 16px, 24px                                                                       |
| `--shadow-sm`, `--shadow-md` | Ombre morbide a bassa opacità                                                    |
| `--transition-base`          | `200ms ease`                                                                     |
| `.page-card`                 | Card di sezione canonica: bianca, bordo `--card-border`, raggio 8px, senza ombra |
| `.page-card-header`          | Intestazione della card: padding 1rem 1.5rem, bordo inferiore, sfondo `gray-50`  |

Le dashboard hanno sfondo bianco, sidebar grigio chiaro (`bg-gray-50`) e card bianche con bordo sottile; il colore guida è il navy `--secondary`. Dentro `.dashboard-content` breadcrumb e `h1` delle pagine sono nascosti: il titolo lo mostra già la shell (`DashboardShell`).

## Componenti

In `src/components/ui/`:

| Componente                                                                       | Uso                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Modal`, `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter` | Sistema di modali (esportato da `@/components/ui`)               |
| `Avatar`                                                                         | Avatar con l'iniziale del nome come riserva                      |
| `NewsImage`                                                                      | Immagini delle notizie con ripiego locale e `no-referrer`        |
| `MenuCloseIcon`                                                                  | Icona hamburger ↔ X animata in CSS                               |
| `AppToaster`                                                                     | Toaster `sonner` (in basso al centro), montato nel layout radice |

In `src/components/dashboard/`: `DashboardShell` (sidebar, header, campanella), i layout di area, `NotificationsList`, `WeatherCard`, `UpcomingCommitmentsCard`, `AthleteBacheca`, `PageSkeleton` (caricamento delle pagine), `RotateDeviceHint` (invito a ruotare il telefono sulle viste larghe).

Convenzioni:

- Comporre le classi con `cn()` (`src/lib/utils.ts`, `clsx` + `tailwind-merge`).
- Preferire token e variabili (`var(--secondary)`, `text-frozen-700`) agli esadecimali sparsi; per le card di sezione usare `.page-card` / `.page-card-header`.
- Icone `lucide-react`.
- **Toast**: brevi (2–4 parole), senza descrizione, senza "con successo" né prefisso "Errore:". Card bianca con icona in un quadrato blu brand, tonalità diversa per tipo. Per gli errori `toastError(err, fallback)` di `src/lib/toast.ts`: messaggio breve all'utente, dettagli tecnici solo nel logger.
- **Animazioni solo in CSS** (framer-motion è stato rimosso: non reintrodurlo): keyframe `fadeIn`, `slideIn`, `pulse`, `spin`, `marquee` (loghi partner) e quelli della hero; comparsa delle sezioni con `.reveal` (componente `Reveal`); pannelli espandibili con `grid-template-rows: 0fr → 1fr`. Con `prefers-reduced-motion` le animazioni vengono ridotte.
- Date in italiano con `formatItalianDate.ts`. **Lato server** indicare sempre `timeZone: 'Europe/Rome'` in `toLocaleDateString` / `toLocaleTimeString`: Vercel gira in UTC e senza fuso esplicito notifiche ed email mostrerebbero orari sbagliati.

## Mobile e accessibilità

- **Tap target** di almeno 44×44px per `button`, `a`, `input`, `select`, `textarea` sui dispositivi touch.
- **Safe area**: `env(safe-area-inset-*)` applicato a `body`.
- **Anti-zoom iOS**: `font-size: 16px` sugli input sotto i 768px.
- **Date picker**: l'indicatore del calendario copre tutto l'input (tap affidabile su Android).
- Griglie a una o due colonne su mobile, multi-colonna su desktop; modali scrollabili.
- HTML semantico, etichette ARIA sugli elementi interattivi, focus visibile, contrasto adeguato.

## Sicurezza lato client

- I contenuti degli utenti (news, messaggi) sono resi come testo da React; `dangerouslySetInnerHTML` è usato solo per il JSON-LD statico in `src/app/layout.tsx`. Lato server gli input passano da `src/lib/security/sanitize-server.ts` e dagli schemi Zod.
- Nel browser sono disponibili solo le variabili `NEXT_PUBLIC_*`: nessun segreto nel client.

## Prestazioni

- **Immagini**: l'ottimizzazione di Next vale solo per le immagini locali. Quelle remote (news, avatar) sono convertite in WebP al caricamento (`src/lib/images/optimize.ts`) e mostrate con `unoptimized` tramite `ui/NewsImage` e `ui/Avatar`.
- **Home statica**: news e staff letti lato server (`src/lib/landing/getLandingData.ts`) con ISR a 60 s; se la lettura fallisce la sezione ripiega sul caricamento nel browser.
- **Librerie pesanti**: Recharts (grafici maestro) caricato con `next/dynamic` e segnaposto ad altezza fissa.
- **Cache** sugli endpoint pubblici: meteo 5 minuti, live score 30 secondi (`s-maxage`).
- **Layout non bloccanti**: `AthleteLayout`, `MaestroAthleteLayout` e `AdminLayout` mostrano subito sidebar e pagina; profilo, controllo del ruolo e contatori si caricano in parallelo. `loading.tsx` con `PageSkeleton` dà un riscontro immediato al clic.
- **Utente corrente senza rete**: nei componenti client usare `getSessionUser()` (`src/lib/auth/clientSession.ts`), non `supabase.auth.getUser()` che interroga il server Auth a ogni chiamata. `AuthGuard` memorizza il ruolo per sessione.
- **Aggiornamenti in background**: Realtime filtrato per utente, con polling di riserva a 60 s solo a scheda visibile; i ricaricamenti da eventi realtime non riattivano gli spinner (niente `setLoading(true)`) e vengono raggruppati con debounce.
