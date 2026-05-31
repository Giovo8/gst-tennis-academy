# Linee guida Frontend

Convenzioni frontend, ottimizzazione mobile e accessibilità per GST Tennis Academy.

---

## Principi

- **Mobile-first**: layout progettati prima per smartphone, poi estesi al desktop.
- **Componenti per dominio**: i componenti sono organizzati per area funzionale in
  `src/components/` (`bookings/`, `tournaments/`, `chat/`, `dashboard/`, `landing/`, `ui/`…).
- **Stato e dati**: accesso ai dati via client Supabase; realtime tramite hook dedicati
  (`useBookingsRealtime`, `useNotifications`, `useWeather`).
- **Composizione classi**: usare `cn()` per unire le classi Tailwind in modo sicuro.

---

## Ottimizzazione mobile

Definita principalmente in `src/app/globals.css`:

- **Tap target**: dimensione minima 44×44px per `button`, `a`, `input`, `select`, `textarea`
  su dispositivi touch.
- **Safe area**: supporto a `env(safe-area-inset-*)` con classi `.safe-top` / `.safe-bottom`.
- **Anti-zoom iOS**: `font-size: 16px` sugli input sotto i 768px per evitare lo zoom automatico.
- **Date picker**: l'indicatore del calendario copre l'intera area dell'input (fix tap su Android).
- **Performance touch**: `-webkit-overflow-scrolling: touch` e disabilitazione degli effetti
  hover su dispositivi touch.
- **Griglie responsive**: singola/doppia colonna su mobile, multi-colonna su desktop.
- **Modali scrollabili**: `max-h-[90vh]` con `overflow-y-auto`.

---

## Accessibilità

- HTML semantico e **skip link** per la navigazione da tastiera.
- Etichette **ARIA** sugli elementi interattivi.
- Stati di **focus** visibili (outline su focus per gli elementi touch).
- Contrasto colore conforme alle linee guida WCAG.
- Pagina dedicata `/accessibility` con le informazioni di conformità.

---

## Sicurezza lato client

- **Sanitizzazione**: `sanitizeHtml()` (DOMPurify) su tutti i contenuti generati dagli utenti
  (news, messaggi) prima del rendering.
- **Validazione**: schemi **Zod** condivisi (`src/lib/validation/schemas.ts`) per i form.
- **Nessun segreto nel client**: solo le variabili `NEXT_PUBLIC_*` sono disponibili lato browser.

---

## Performance

- **Ottimizzazione immagini** Next.js (AVIF/WebP) con domini remoti consentiti.
- **Lazy loading** e fallback data per le sezioni della homepage.
- **Code splitting** automatico per route.
- **Caching** sugli endpoint pubblici (es. news, servizi, meteo).

---

## Convenzioni di codice

- TypeScript per tutti i componenti (alias import `@/*` → `src/*`).
- ESLint (config Next.js) e Prettier applicati via Husky + lint-staged in pre-commit.
- Test dei componenti con Jest + Testing Library in `src/__tests__/` e nelle cartelle
  `__tests__/` locali ai componenti.
- Date formattate in locale italiano tramite `formatItalianDate.ts`.
