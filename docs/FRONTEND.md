# Linee guida Frontend

Convenzioni frontend, ottimizzazione mobile e accessibilità per GST Tennis Academy.

---

## Principi

- **Mobile-first**: layout progettati prima per smartphone, poi estesi al desktop.
- **Componenti per dominio**: i componenti sono organizzati per area funzionale in
  `src/components/` (`bookings/`, `tournaments/`, `dashboard/`, `landing/`, `ui/`…).
- **Stato e dati**: accesso ai dati via client Supabase; hook condivisi in `src/lib/hooks/`
  (`useNotifications`, `useWeather`, `useBookableTournaments`); le sottoscrizioni realtime
  sono aperte direttamente nelle pagine che le usano.
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

---

## Sicurezza lato client

- **Rendering sicuro**: i contenuti degli utenti (news, messaggi) sono resi come testo da React,
  che ne esegue l'escape; `dangerouslySetInnerHTML` è usato solo per il JSON-LD statico in
  `src/app/layout.tsx`. Lato server gli input passano da `src/lib/security/sanitize-server.ts`.
- **Validazione**: schemi **Zod** condivisi (`src/lib/validation/schemas.ts`) per i form.
- **Nessun segreto nel client**: solo le variabili `NEXT_PUBLIC_*` sono disponibili lato browser.

---

## Performance

- **Ottimizzazione immagini** Next.js (AVIF/WebP) con domini remoti consentiti.
- **Lazy loading** e fallback data per le sezioni della homepage.
- **Code splitting** automatico per route; Recharts (grafici maestro) caricato a parte con `next/dynamic` e segnaposto ad altezza fissa.
- **Caching** sugli endpoint pubblici (es. news, servizi, meteo).

### Fluidità della dashboard

- **Layout non bloccanti**: `AthleteLayout`, `MaestroAthleteLayout` e `AdminLayout` mostrano subito sidebar e pagina; profilo, controllo del ruolo e contatori si caricano in parallelo (redirect se il ruolo non è valido). I dati restano protetti dalla RLS.
- **Skeleton di navigazione**: `loading.tsx` in `dashboard/{atleta,maestro,admin}` (componente `PageSkeleton`) dà un feedback immediato al clic, dentro la sidebar.
- **Niente rete per l'utente corrente**: nei componenti client si usa `getSessionUser()` (`src/lib/auth/clientSession.ts`), che legge la sessione locale; `supabase.auth.getUser()` interroga il server Auth a ogni chiamata.
- **AuthGuard** memorizza il ruolo per sessione: dopo il primo controllo le pagine protette compaiono senza attesa.
- **Aggiornamenti in background**: notifiche via Supabase Realtime filtrato per utente, con polling di riserva a 60 s solo a scheda visibile; i ricaricamenti dovuti a eventi realtime non riattivano gli spinner e vengono raggruppati (debounce) quando arrivano a raffica.
- **Animazioni in CSS**: comparsa delle sezioni (`Reveal`), titolo hero, hamburger e pannelli espandibili usano transizioni CSS. framer-motion non è più una dipendenza del progetto.

---

## Convenzioni di codice

- TypeScript per tutti i componenti (alias import `@/*` → `src/*`).
- ESLint (config Next.js) e Prettier; hook pre-commit Husky + lint-staged, attivo dopo `npm install`.
- Test con Jest (+ matcher `@testing-library/jest-dom`) in `src/__tests__/`, focalizzati
  sulla logica in `src/lib/`.
- Date formattate in locale italiano tramite `formatItalianDate.ts`.
