# AI News — Pipeline notizie tennis (RSS + Gemini)

Il modulo AI News genera automaticamente notizie di tennis per la sezione pubblica `/news`: legge feed RSS configurati a database, riscrive gli articoli in italiano con **Gemini Flash-Lite** (modello gratuito, configurabile con il secret `GEMINI_MODEL`) e li inserisce nella tabella `news` come bozze (o già pubblicate, se abilitata la pubblicazione automatica). L'intero flusso è gestito dalla dashboard admin `/dashboard/admin/news`.

## Architettura

```
ai_news_fonti (feed RSS in DB)
      │
      ▼
Edge Function Supabase `genera-news`  ←── pg_cron (ai_news_sync_cron_job)
      │  RSS parse → filtri → dedup → Gemini Flash-Lite → sanitizzazione → link immagine
      ▼
news (stato: bozza | pubblicata | scartata, ai_generated = true)
      │
      ▼
Dashboard admin: approva / modifica / scarta
```

- Le API route Next.js (`src/app/api/ai-news/`) sono tutte protette da `requireAdminOrGestore()` (`src/lib/ai-news/auth.ts`).
- La generazione vera avviene nella **Edge Function** `supabase/functions/genera-news/index.ts`, invocata con la service role key da `callGeneraNewsEdge()` (`src/lib/ai-news/utils.ts`). La funzione risponde 401 a qualsiasi altra chiave (anon inclusa), così nessuno può consumare la quota Gemini dall'esterno.
- Pensata per il piano Free di Supabase: Gemini via REST (nessun SDK), ogni feed e ogni pagina articolo scaricati una sola volta, budget interno di 110s (limite Free: 150s), nessun upload su Storage.
- Sanitizzazione dei contenuti generati in `src/lib/ai-news/contentSanitizer.ts` (`sanitizeAINewsTitle`, `sanitizeAINewsBody`).

## Tabelle

| Tabella | Contenuto |
|---|---|
| `ai_news_fonti` | Feed RSS: `nome`, `url`, `categoria`, `attiva` |
| `ai_news_cron` | Pianificazioni: `nome`, `ora`, `minuto` (solo 0/15/30/45), `categoria`, `prompt_custom`, `attivo`, `ultimo_eseguito` |
| `ai_news_config` | Config globale (una riga): `pubblicazione_auto`, `numero_post` (default 5) |
| `ai_news_generation_logs` | Esiti di ogni run: `tipo` (`manuale`/`cron`), `cron_id`, `generate`, `skippate`, `errori[]` |
| `news` | Articoli, con `stato` (bozza/pubblicata/scartata), `ai_generated`, `fonte_url`, `fonte_nome`, `image_url` |

Tabelle e funzione di sync definite nella migrazione `063_ai_news_generator.sql` (timezone corretta in `065_fix_cron_timezone.sql`). Richiede le estensioni `pg_cron` e `pg_net`.

## Pipeline di generazione

Implementata interamente nella Edge Function `genera-news` (`POST /api/ai-news/genera` si limita a delegare):

1. **Fonti**: carica le `ai_news_fonti` attive (filtrate per `categoria` se richiesta). Ogni feed è letto una volta e i suoi articoli sono attribuiti solo a quella fonte; feed vuoti o irraggiungibili vengono segnalati nel log.
2. **Filtro per data**: solo articoli delle **ultime 24 ore** (il dedup su `fonte_url` evita doppioni tra un run e l'altro).
3. **Filtri anti-rumore** (`isUsableTennisItem`):
   - regex sul titolo che scarta podcast/video/promo (`podcast`, `puntata`, `episodio`, `video`, `highlights`, `diretta`, `live blog`, `streaming`, `quiz`, `newsletter`, `gallery`, ...);
   - regex sul path URL (`/podcast/`, `/video/`, `/gallery/`, `/live/`, `/shop/`, ...);
   - **filtro topic tennis**: titolo+snippet+contenuto devono matchare termini tennis (`tennis`, `atp`, `wta`, `slam`, `wimbledon`, `roland garros`, nomi di giocatori, ecc.).
4. **Dedup**: prima dell'inserimento verifica che non esista già una riga `news` con lo stesso `fonte_url`.
5. **Riscrittura con Gemini** (default `gemini-3.5-flash-lite`, poi `gemini-3.1-flash-lite`; override con il secret `GEMINI_MODEL`, anche lista separata da virgole — ogni modello ha quota free separata): prompt da redattore sportivo che impone italiano (traduzione EN→IT inclusa), 4–6 paragrafi (900–1600 caratteri), niente dati inventati, niente riferimenti a contenuti multimediali; output solo JSON `{titolo, testo}` oppure `{skip: true, motivo}` se il contenuto non è una vera notizia di tennis. L'eventuale `prompt_custom` del cron viene appeso al prompt base.
6. **Immagine (solo link, nessun upload)**: in `image_url` si salva l'URL **https** dell'immagine della fonte, cercata in ordine nel feed RSS (enclosure, `media:content`, `media:thumbnail`, `<img>` nel contenuto) e poi nei meta `og:image`/`twitter:image` della pagina articolo. Storage ed egress Supabase restano quindi a zero. Fallback: immagine statica locale (`/images/1..3.jpeg`). Lato client `NewsImage` usa `referrerPolicy="no-referrer"` (aggira i blocchi anti-hotlink) e, se il link si rompe, ripiega su un'immagine locale. Fetch esterni con **timeout 10s**.
7. **Stato**: `bozza` di default; `pubblicata` subito se `ai_news_config.pubblicazione_auto` è attivo. Il run si ferma a `numero_post` articoli generati.
8. **Log**: ogni run scrive in `ai_news_generation_logs` (generate/skippate/errori).

### Fallback senza Gemini

Se Gemini fallisce su tutti i modelli configurati (quota esaurita, chiave non valida, modello dismesso) oppure manca `GEMINI_API_KEY`, il resto del run usa il **fallback locale**: testo costruito da titolo, descrizione RSS e paragrafi della pagina articolo, senza AI. Il log riporta quanti articoli sono stati generati così. `POST /api/ai-news/cleanup` senza chiave salta solo la traduzione.

## Workflow bozza → pubblicazione

Le bozze generate compaiono in `/dashboard/admin/news`:

| Azione | Route | Effetto su `news` |
|---|---|---|
| Lista bozze | `GET /api/ai-news/bozze?stato=bozza\|pubblicata\|scartata\|tutte` | Solo righe `ai_generated = true` |
| Approva | `PATCH /api/ai-news/[id]/approva` | `stato = "pubblicata"`, `is_published = true`, `published_at` valorizzato; titolo/testo risanitizzati |
| Modifica | `PATCH /api/ai-news/[id]/modifica` | Aggiorna `title`/`content`/`excerpt` (body: `titolo`, `testo`, entrambi obbligatori) |
| Scarta | `PATCH /api/ai-news/[id]/scarta` | `stato = "scartata"`, `is_published = false` |

## Cron (configurati in DB, non in Vercel)

Gli orari di generazione sono righe di `ai_news_cron`, gestite dalla dashboard admin. Ogni modifica chiama la funzione SQL `ai_news_sync_cron_job()` che (ri)schedula un job **pg_cron** (`ai-news-<uuid>`); il job invoca la Edge Function via `net.http_post` con la service role key e il `cron_id`. L'ora è convertita da Europe/Rome a UTC calcolando l'offset corrente (gestisce l'ora legale).

| Route | Metodi | Note |
|---|---|---|
| `/api/ai-news/cron` | GET, POST | Vincoli: `ora` 0–23, `minuto` ∈ {0, 15, 30, 45}, massimo **8 cron attivi** |
| `/api/ai-news/cron/[id]` | PATCH, DELETE | Modifica/eliminazione + risincronizzazione pg_cron |
| `/api/ai-news/cron/[id]/esegui` | POST | Esecuzione manuale immediata (chiama la Edge Function con `cron_id`) |
| `/api/ai-news/cron/sync` | POST | Risincronizza tutti i job pg_cron dalle righe DB |

## Altre API

| Route | Metodi | Note |
|---|---|---|
| `/api/ai-news/genera` | POST | Generazione manuale (body opzionale: `categoria`, `cron_id`); delega alla Edge Function con fallback RSS locale su quota |
| `/api/ai-news/fonti` | GET, POST | CRUD fonti RSS |
| `/api/ai-news/fonti/[id]` | PATCH, DELETE | Modifica/eliminazione fonte |
| `/api/ai-news/fonti/[id]/test` | GET | Testa il feed: parse RSS e ritorna `titolo_feed` + `articoli_trovati` |
| `/api/ai-news/config` | GET, POST | Legge/aggiorna `pubblicazione_auto` e `numero_post` (crea la riga se assente) |
| `/api/ai-news/logs` | GET | Ultimi 20 run da `ai_news_generation_logs` |
| `/api/ai-news/cleanup` | POST | Bonifica dell'archivio AI (batch da 100, supporta `dryRun`): risanitizza titoli/testi, ripara titoli fallback, e se il testo "sembra inglese" (euristica su stopword) lo **traduce in italiano con Gemini** (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`); senza `GEMINI_API_KEY` esegue solo la sanitizzazione |

## Variabili d'ambiente

| Variabile | Dove serve |
|---|---|
| `GEMINI_API_KEY` | Secret della Edge Function (senza: solo fallback locale) e `/api/ai-news/cleanup` (opzionale) |
| `GEMINI_MODEL` | Opzionale: modello/i Gemini, es. `gemini-3.5-flash-lite,gemini-3.1-flash-lite` |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Invocazione Edge Function e sync pg_cron |
