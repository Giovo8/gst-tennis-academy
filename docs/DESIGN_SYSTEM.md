# Design System

Il design system di GST Tennis Academy è definito in `src/app/globals.css` (custom properties in `:root` e token Tailwind in `@theme inline`) e applicato con **Tailwind CSS 4**. La palette "Frozen Lake" (azzurro/navy) dà un look pulito e professionale. Esiste **solo il tema chiaro**.

---

## Palette

### Frozen Lake (token Tailwind)

Definiti in `@theme inline`, quindi disponibili come classi (`bg-frozen-500`, `text-frozen-800`, `border-frozen-200`…):

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

In `:root` esistono anche `--color-frozen-lake-600`…`900`, usati **solo come variabili** (`var(--color-frozen-lake-900)`): non essendo in `@theme`, classi come `text-frozen-lake-700` non generano alcuno stile. Per le classi usare la scala `frozen-*`.

Il tema mappa anche i colori di sistema: `bg-background`, `text-foreground`, `text-primary` / `bg-primary`, `text-accent`, `text-muted`, `bg-surface`, `border-border`.

### Variabili di brand (`:root`)

| Variabile                                    | Valore                                     |
| -------------------------------------------- | ------------------------------------------ |
| `--primary`, `--accent`                      | `#08b3f7` (frozen-500)                     |
| `--primary-200`                              | primary al 20%                             |
| `--secondary`                                | `#034863` (frozen-800)                     |
| `--secondary-light`                          | `#056c94` (frozen-700)                     |
| `--secondary-hover`                          | `#022431` (frozen-900)                     |
| `--background` / `--surface`                 | `#ffffff`                                  |
| `--background-subtle` / `--background-muted` | frozen-50 / frozen-100                     |
| `--foreground` / `--foreground-muted`        | frozen-800 / frozen-700                    |
| `--border`                                   | frozen-200                                 |
| `--card-border`                              | `rgba(0, 0, 0, 0.1)` (= `border-black/10`) |

Classi di comodo in `globals.css`: `.text-primary`, `.text-secondary`, `.bg-secondary`, `.border-secondary`, `.text-accent`.

**Niente rosso**: anche errori, avvisi e badge usano le tonalità del blu brand (vedi ad esempio i toast e i tipi di avviso della Bacheca in `src/lib/avvisi/tipi.ts`).

---

## Tipografia

| Elemento | Font                         | Origine                                                                 |
| -------- | ---------------------------- | ----------------------------------------------------------------------- |
| Testo    | Inter Tight (`--font-inter`) | `src/app/fonts/InterTight-latin.woff2`, self-hosted (`next/font/local`) |
| Titoli   | Urbanist (`--font-urbanist`) | `src/app/fonts/Urbanist-latin.woff2`, applicato a `h1`–`h6`             |

Corpo a 16px con interlinea 1.6. I font sono variabili (pesi 300–900) e caricati in locale: nessuna richiesta a Google Fonts in build o a runtime.

---

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

Le dashboard hanno sfondo bianco, sidebar grigio chiaro (`bg-gray-50`) e card bianche con bordo sottile (`border-black/10`); il colore guida è il navy `--secondary`. Dentro `.dashboard-content` breadcrumb e `h1` delle pagine sono nascosti, perché il titolo lo mostra già la shell (`DashboardShell`).

Le tre aree (atleta, maestro, admin) usano la stessa shell e la stessa palette blu brand: non ci sono colori per ruolo.

---

## Componenti UI

In `src/components/ui/`:

| Componente                                                                       | Uso                                                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Modal`, `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter` | Sistema di modali (esportato anche da `@/components/ui`)                             |
| `Avatar`                                                                         | Avatar utente con l'iniziale del nome come riserva, immagine non ottimizzata da Next |
| `NewsImage`                                                                      | Immagini delle notizie con fallback locale e `no-referrer`                           |
| `MenuCloseIcon`                                                                  | Icona hamburger ↔ X animata in CSS                                                   |
| `AppToaster`                                                                     | Toaster `sonner` (in basso al centro), montato nel layout radice                     |

Componenti chiave della dashboard (`src/components/dashboard/`): `DashboardShell` (sidebar, header, campanella), i layout di area, `NotificationsList`, `WeatherCard`, `UpcomingCommitmentsCard`, `AthleteBacheca`, `PageSkeleton` (caricamento delle pagine), `RotateDeviceHint` (suggerimento di ruotare il telefono sulle viste larghe).

### Toast

Brevi (2–4 parole), senza descrizione, senza "con successo" né prefisso "Errore:". Stile del centro notifiche: card bianca e icona in un quadrato blu brand, con una tonalità diversa per tipo (successo, errore, avviso, info). Per gli errori usare `toastError(err, fallback)`.

---

## Animazioni

Solo CSS (framer-motion non è una dipendenza del progetto): keyframe `fadeIn`, `slideIn`, `pulse`, `spin`, `marquee` (loghi partner) e quelli della hero (`hero-word-in`, `hero-ball-*`); comparsa delle sezioni con `.reveal` (componente `Reveal`); pannelli espandibili con `grid-template-rows: 0fr → 1fr`. Con `prefers-reduced-motion` le animazioni vengono azzerate sugli schermi piccoli.

---

## Tema

Esiste **solo il tema chiaro**. Non usare la variante Tailwind `dark:` né classi o variabili di dark mode: `:root` dichiara `color-scheme: light`, così anche scrollbar, input e date picker nativi restano chiari quando il sistema operativo è in modalità scura.

---

## Convenzioni

- Comporre le classi con `cn()` (`src/lib/utils.ts`, basato su `clsx` + `tailwind-merge`).
- Preferire token e variabili (`var(--secondary)`, `text-frozen-700`) ai valori esadecimali sparsi.
- Per le card di sezione usare `.page-card` / `.page-card-header`.

Per accessibilità e ottimizzazione mobile vedi [FRONTEND.md](FRONTEND.md).
