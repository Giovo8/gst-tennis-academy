# Piano: Sezione Contabilità (Admin)

## Context

L'accademia ha bisogno di una sezione **Contabilità** nell'area admin per monitorare i ricavi
provenienti da **prenotazioni campi** e **corsi**, con viste **Settimanale / Mensile / Annuale**
e grafici di andamento. Deve esistere anche una sotto-sezione per **configurare il prezzo base
delle prenotazioni campi**.

Stato attuale rilevato dall'esplorazione:
- La voce di menu "Contabilità" e la route stub `src/app/dashboard/admin/contabilita/page.tsx`
  (`return null`) **esistono già** (aggiunte in questa sessione).
- ✅ **Ricavi corsi**: la fonte primaria è la **quota** inserita alla creazione del corso.
  In `corsi/new/page.tsx:405,444-447` il campo quota (`pricePerMonth`) viene salvato in
  `courses.price_per_month` **e propagato come `fee` a ogni riga `course_enrollments`**
  (`fee = pricePerMonth > 0 ? pricePerMonth : null`); la `fee` è poi sovrascrivibile per singolo
  partecipante (`partecipanti/[userId]`). Quindi il **ricavo corsi = somma delle `course_enrollments.fee`
  degli iscritti** (quota mensile attesa). I `payments` (`payment_type='course'`, `status='completed'`)
  restano come **incassato** effettivo (secondario). `stats/admin/route.ts:80-86` aggrega già i payments.
- ✅ Tabella `payments` generica già pronta (`amount`, `payment_type`, `reference_id`, `status`, `paid_at`).
- ❌ **Ricavi prenotazioni campi**: NON esiste alcun dato economico. `bookings` non ha prezzo e
  `courts_settings` non ha tariffa. **Va introdotta la tariffa oraria per campo.**
- ❌ **Nessuna libreria di grafici** installata. Nessun helper `formatCurrency`.

## Decisioni approvate dall'utente

1. **Grafici** → installare **Recharts** (eccezione autorizzata al divieto CLAUDE.md sulle dipendenze).
2. **Prezzo campi** → **tariffa oraria per campo** (colonna `hourly_rate` su `courts_settings`).
3. **Ricavi campi** → **calcolo virtuale automatico**: `tariffa_oraria(campo) × durata_prenotazione`.
   Nessun tracciamento pagamenti per le prenotazioni.
4. **Palette** → **`secondary` / frozen-lake** (#034863), coerente con bookings/corsi/courts.
   NIENTE arancione.

## Regole UI vincolanti

- **NESSUN MODALE.** Per "inline" si intende che ogni interazione (modifica prezzi, dettagli di un
  campo/corso) **si apre dentro la stessa pagina** come sezione/riga espandibile in-place — **niente
  overlay/modale e, dove possibile, niente navigazione verso un'altra pagina**. Es.: la modifica di una
  tariffa avviene trasformando la riga in editor in-page; il dettaglio di un campo/corso si espande
  sotto la riga (accordion), non apre un modale.
- **Riutilizzare i componenti condivisi** dove possibile invece di ricostruire markup ad hoc:
  `Card`/`CardHeader`/`CardTitle`/`CardContent` e `Input` da `src/components/ui/`, `StatCard` da
  `src/components/dashboard/`. Creare nuovi componenti solo per ciò che non esiste (grafico, selettore
  periodo) e renderli **riutilizzabili** in `src/components/contabilita/`.
- Coerenza totale con lo stile admin esistente: wrapper `space-y-6 pt-3`, header con
  `breadcrumb` + `<h1 className="text-4xl font-bold text-secondary">`, card bianche
  `bg-white rounded-lg border border-black/10`, header card
  `px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent`.
- Testi in italiano, `toast` (sonner) per esiti, palette `secondary` / `border-black/10`,
  focus flat `focus:ring-0`.

---

## Struttura delle route

| Route | Scopo |
|---|---|
| `/dashboard/admin/contabilita` | Dashboard: KPI + grafico andamento + breakdown + **config tariffe in-page** + selettore Settimana/Mese/Anno |

**Route unica.** Config tariffe e dettagli **non** sono pagine separate: sono **sezioni espandibili
in-page** nella stessa pagina Contabilità (accordion/pannello che si apre in-place). Questo rispetta la
regola "inline = si apre nella pagina". La pagina è automaticamente avvolta da `AdminLayout` →
`DashboardShell` (già configurato). La voce menu "Contabilità" esiste già in
`src/components/dashboard/AdminLayout.tsx`.

> Se in futuro si preferisse separare la config in una route dedicata resta un'opzione, ma il default
> di questo piano è tutto in-page nella singola route.

---

## Controllo accessi (solo admin + gestore)

La sezione deve essere visibile **solo ad admin e gestore**. Già garantito senza codice nuovo:
- **Pagina**: `src/app/dashboard/admin/contabilita/page.tsx` esiste già (stub `return null`, da riempire —
  **non ricrearla**). È sotto `/dashboard/admin/*`, quindi avvolta da `AdminLayout`
  (`src/components/dashboard/AdminLayout.tsx:41-75`) che carica il profilo e **reindirizza a `/login`**
  chi non è `admin`/`gestore`.
- **API**: `src/app/api/stats/contabilita/route.ts` usa `getRouteAuth()` + `isAdmin(auth.role)`
  (`src/lib/auth/routeAuth.ts:39-41`) → `isAdmin` restituisce `true` **solo** per `admin` e `gestore`,
  altrimenti `forbidden()` (403). Questa è la vera protezione dei dati.
- **RLS**: le policy di `courts_settings` (update) e `payments` (select) già limitano le mutazioni/letture
  a `admin`/`gestore`.
- La voce di menu "Contabilità" è nell'array `navItems` di `AdminLayout`, mostrato solo nell'area admin;
  il `gestore` la vede (non è tra le voci filtrate, come i platform-logs).

## Modello dati — modifiche DB

### Nuova migrazione `supabase/migrations/068_add_hourly_rate_to_courts_settings.sql`
```sql
-- Aggiunge tariffa oraria configurabile per campo
ALTER TABLE courts_settings
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN courts_settings.hourly_rate IS
  'Tariffa oraria del campo in EUR, usata per calcolare i ricavi virtuali delle prenotazioni';
```
- RLS già presente su `courts_settings` (update consentito a `admin`/`gestore`) → nessuna nuova policy.
- Non modificare migrazioni esistenti. Applicare con `supabase db push`.

### Nessuna nuova tabella
I ricavi corsi vengono da `payments`/`course_enrollments` esistenti; i ricavi campi si calcolano
al volo da `bookings` × `courts_settings.hourly_rate`.

---

## Struttura dati / API

### Aggiornare il tipo `Court` — `src/lib/courts/getCourts.ts`
Aggiungere `hourly_rate: number` al type `Court` (riga 5-10). `getCourtsWithDetails()` già fa
`select("*")` quindi restituirà automaticamente la colonna.

### Nuovo helper valuta — `src/lib/utils/formatCurrency.ts`
```ts
const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export function formatCurrency(amount: number): string {
  return eur.format(Number.isFinite(amount) ? amount : 0);
}
```

### Nuova API di aggregazione — `src/app/api/stats/contabilita/route.ts`
Pattern **B** (identico a `src/app/api/stats/admin/route.ts`): `getRouteAuth()` + `isAdmin()` +
`supabaseServer`. Query string: `?period=week|month|year` (opz. `?from=&to=` per range custom).

Logica:
1. Calcola l'intervallo `[from, to)` in base a `period` (settimana/mese/anno correnti).
2. **Ricavi campi (virtuali)**: `supabaseServer.from("bookings").select("court,start_time,end_time,type").gte("start_time",from).lt("start_time",to)`.
   Carica mappa tariffe da `courts_settings` (`court_name → hourly_rate`).
   Per ogni booking: `durata_h = (end_time - start_time)/3600000`; `ricavo = durata_h × rate[court]`.
   Aggrega: totale, per campo, e in **bucket temporali** (giorni per week/month, mesi per year).
   Fornire anche breakdown per `type` (campo / lezione_privata / lezione_gruppo).
3. **Ricavi corsi (quota — fonte primaria)**: la quota è mensile (`course_enrollments.fee`, originata
   dal campo quota alla creazione del corso). Caricare gli iscritti con il corso collegato:
   `course_enrollments(fee, course_id)` + `courses(id, name, start_date, end_date, is_active)`.
   Ricavo corso = somma delle `fee` degli iscritti. **Attribuzione temporale** della quota mensile:
   per ogni mese dell'intervallo in cui il corso è attivo (`start_date`/`end_date`, o `is_active` se
   date assenti) si conta la quota di quel mese; buckets mensili per `year`/`month`, per `week` si
   mostra la quota del mese contenente la settimana (la quota è mensile → granularità settimanale
   non pro-rata; etichettare "quota mensile"). Aggregare anche per corso (`byCourse`).
4. **Incassato corsi (secondario)**: `payments` con `payment_type='course'`, `status='completed'`,
   `paid_at`/`created_at` nell'intervallo → somma `amount` per bucket, mostrato come confronto
   "incassato vs quota attesa".
5. Risposta JSON:
```jsonc
{
  "period": "month",
  "range": { "from": "...", "to": "..." },
  "totals": { "campi": 0, "corsiQuota": 0, "corsiIncassato": 0, "totale": 0 },
  "timeseries": [ { "label": "01/07", "campi": 0, "corsiQuota": 0, "corsiIncassato": 0 } ],
  "byCourt":  [ { "court": "Campo 1", "amount": 0, "hours": 0, "bookings": 0 } ],
  "byCourse": [ { "courseId": "...", "name": "...", "quota": 0, "incassato": 0, "iscritti": 0 } ]
}
```
> Nota: le prenotazioni **passate e future** nell'intervallo vengono conteggiate (ricavo teorico
> maturato/atteso). In UI etichettare i ricavi campi come "stimati" per chiarezza.

---

## Componenti

### Da CREARE (solo il non-esistente, resi riutilizzabili)
| File | Descrizione |
|---|---|
| `src/lib/utils/formatCurrency.ts` | Helper valuta EUR (`Intl.NumberFormat`) |
| `src/app/api/stats/contabilita/route.ts` | API aggregazione ricavi (pattern `getRouteAuth`) |
| `src/app/dashboard/admin/contabilita/page.tsx` | Dashboard (riempire lo stub) — orchestrazione |
| `src/components/contabilita/RevenueChart.tsx` | Grafico Recharts (Area/Line) andamento entrate |
| `src/components/contabilita/PeriodSelector.tsx` | Segmented control Settimana/Mese/Anno |
| `src/components/contabilita/RevenueKpiCards.tsx` | Riga di KPI (wrappa `StatCard`) |
| `src/components/contabilita/CourtPricingPanel.tsx` | Pannello tariffe **in-page** con editing inline (usa `Card` + `Input`) |

### Da RIUTILIZZARE (preferire questi ai markup ad hoc)
- **`Card`/`CardHeader`/`CardTitle`/`CardContent`** (`src/components/ui/Card.tsx`) come contenitore
  delle sezioni (KPI wrapper, breakdown, pannello tariffe) invece di ricostruire i `div` bianchi.
- **`Input`** (`src/components/ui/Input.tsx`) per l'editing inline delle tariffe (supporta
  `type`, `label`, `error`).
- **`StatCard`** (`src/components/dashboard/StatCard.tsx`) per i KPI — colori chiari coerenti
  (`teal`/`sky`/`blue`).
- `getCourtsWithDetails()` (`src/lib/courts/getCourts.ts`) per le tariffe.
- `supabase` browser client, `toast` (sonner), `formatItalianDate.ts` per le date.
- `getRouteAuth`/`isAdmin`/`unauthorized`/`forbidden` (`src/lib/auth/routeAuth.ts`) + `supabaseServer`.
- Pattern segmented-control da `bookings/page.tsx:803-825` (bottoni attivi `border-secondary bg-secondary text-white`).
- Pattern skeleton `animate-pulse` per il loading (come `dashboard/admin/page.tsx:267-280`).

> Nota: `Card`/`Input` di `ui/` usano palette `slate`/dark-mode del design system generico; verificarne
> la resa su sfondo chiaro admin e, se necessario, passare `className` per allinearle al `secondary`.
> Se la resa stona in modo non rimediabile via `className`, ripiegare sul pattern card bianca admin
> (`bg-white rounded-lg border border-black/10`) mantenendo comunque componenti riutilizzabili.

---

## Dettaglio pagine

### Dashboard `contabilita/page.tsx` (client component, orchestratore unico)
1. Header: breadcrumb `Contabilità` + `<h1 className="text-4xl font-bold text-secondary">Contabilità</h1>`;
   a destra un bottone toggle "Imposta prezzi" (icona `Settings2`) che **espande in-page** il
   `CourtPricingPanel` (accordion), senza navigare né aprire modali.
2. `PeriodSelector` (state `period`, default `month`).
3. `useEffect([period])` → `fetch("/api/stats/contabilita?period=" + period)` con
   `Authorization: Bearer <token>` (o cookie via `getRouteAuth`) → set stato + `loading`.
4. `RevenueKpiCards`: Ricavo totale, Ricavo campi, Ricavo corsi (+ n. prenotazioni) via `StatCard` e `formatCurrency`.
5. `RevenueChart`: `AreaChart` Recharts con due serie (campi, corsi) su `timeseries`; palette
   frozen-lake (`#08b3f7` primary, `#034863` secondary); tooltip con `formatCurrency`; responsive
   (`ResponsiveContainer`).
6. Breakdown in **row-card espandibili** (NO table, NO modale): sezione "Per campo" (`byCourt`) e
   "Per corso" (`byCourse`); il click su una riga **espande in-place** un dettaglio sotto la riga
   (ore/prenotazioni per campo, iscrizioni per corso). Importi con `formatCurrency` a destra.
7. Stato loading = skeleton `animate-pulse`; errori = `toast.error`.

### `CourtPricingPanel.tsx` — config tariffe **in-page** (niente route separata, niente modale)
1. Reso all'interno della pagina Contabilità quando l'utente apre la sezione (accordion).
2. Carica i campi con `getCourtsWithDetails()`; li mostra in una `Card` con una riga per campo.
3. **Editing inline in-place**: ogni riga mostra `court_name` + tariffa; click su "Modifica"
   (icona `Pencil`) trasforma la cella in un `Input` (`type="number"`, `step="0.5"`) con
   bottoni ✓ (salva) / ✕ (annulla) **nella stessa riga**. Nessun overlay.
4. Salvataggio: `supabase.from("courts_settings").update({ hourly_rate }).eq("id", courtId)`
   → `toast.success` e refresh locale dello stato; callback opzionale al parent per rifetch KPI.
5. Validazione: numero ≥ 0; disabilita salva se non valido (`Input` `error`).

---

## Recharts — integrazione

- `npm install recharts` (unica dipendenza nuova, approvata).
- Usare `ResponsiveContainer` + `AreaChart`/`LineChart`; import solo dei moduli necessari.
- Colori dal design system: `var(--primary)` #08b3f7 e `var(--secondary)` #034863 (hardcodare gli
  hex nei componenti Recharts, che non leggono le CSS var nei fill in modo affidabile).
- Formattazione assi/tooltip con `formatCurrency`.

---

## Checklist implementazione

- [ ] **Step 1 — DB**: creare `supabase/migrations/068_add_hourly_rate_to_courts_settings.sql`
      (ALTER TABLE come sopra). Eseguire `supabase db push`.
- [ ] **Step 2 — Tipi**: aggiungere `hourly_rate: number` al type `Court` in
      `src/lib/courts/getCourts.ts`.
- [ ] **Step 3 — Dipendenza**: `npm install recharts`; verificare che compili con React 19.
- [ ] **Step 4 — Helper**: creare `src/lib/utils/formatCurrency.ts`.
- [ ] **Step 5 — API**: creare `src/app/api/stats/contabilita/route.ts` (pattern `getRouteAuth`
      + `isAdmin` + `supabaseServer`), con calcolo virtuale campi + aggregazione corsi e bucket
      temporali per `period`. Testare la risposta con i 3 valori di `period`.
- [ ] **Step 6 — Componenti UI**: creare `PeriodSelector`, `RevenueKpiCards` (wrappa `StatCard`),
      `RevenueChart`, `CourtPricingPanel` in `src/components/contabilita/`, riutilizzando `Card`/`Input`
      condivisi dove possibile.
- [ ] **Step 7 — Dashboard**: riempire `src/app/dashboard/admin/contabilita/page.tsx` (fetch +
      KPI + chart + breakdown espandibile in-page + toggle pannello tariffe in-page + skeleton loading).
- [ ] **Step 8 — Tariffe in-page**: integrare `CourtPricingPanel` come sezione espandibile della
      pagina Contabilità (nessuna route separata, nessun modale) che aggiorna `courts_settings.hourly_rate`.
- [ ] **Step 9 — Coerenza UI**: verificare che le interazioni si aprano **in-page** (no modali/no
      navigazioni), riuso componenti condivisi, palette `secondary`, breadcrumb, card, focus flat,
      testi italiani, `toast` su tutti gli esiti.
- [ ] **Step 10 — Qualità**: `npm run lint`, `npm run build` (0 errori TS), niente nuovi `any`,
      niente `console.log` con dati utente (usare `secure-logger` lato server).

---

## Verifica end-to-end

1. `npm run dev`, login come admin, aprire `/dashboard/admin/contabilita`.
2. Aprire il pannello tariffe **in-page**, impostare tariffe orarie diverse per Campo 1..4, salvare
   inline (senza modale né cambio pagina) e verificare `toast.success` + persistenza dopo refresh.
3. Verificare che i **ricavi campi** riflettano `tariffa × durata` delle prenotazioni esistenti;
   cambiare Settimana/Mese/Anno e vedere KPI, grafico e breakdown aggiornarsi; espandere una riga
   di breakdown e verificare che il dettaglio si apra in-page.
4. Verificare che i **ricavi corsi** corrispondano ai `payments` (`type=course`, `completed`) del periodo.
5. Confronto rapido con `monthlyRevenue` di `stats/admin` per coerenza sui corsi del mese.
6. `npm run build` e `npm run lint` puliti.

---

## Note / rischi

- La query rotta su `enrollments` in `stats/admin/route.ts:95` (tabella inesistente; la vera è
  `course_enrollments`) è preesistente e **fuori scope**: non correggerla qui salvo richiesta.
- `bookings.court` è stringa (non FK) → il join tariffe è per `court_name`; gestire campi eventualmente
  rinominati/assenti con `rate = 0` di fallback.
- Decidere in UI se i ricavi campi includono anche `lezione_privata`/`lezione_gruppo` o solo `type='campo'`:
  il piano espone il breakdown per `type`, default = tutte le prenotazioni che occupano un campo,
  etichettate come "stimati".
