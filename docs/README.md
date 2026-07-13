# Documentazione — GST Tennis Academy

GST Tennis Academy è una piattaforma web per la gestione completa di un'accademia di tennis: prenotazione campi e lezioni, corsi con presenze, tornei, sfide competitive (Arena), chat interna, notizie generate con AI e area amministrativa multi-ruolo (`atleta`, `maestro`, `gestore`, `admin`).

Stack: **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS v4**, backend **Supabase** (Auth, PostgreSQL, Storage, Realtime), email **Resend**, notizie AI con **Google Gemini**. Deploy su Vercel.

Numeri chiave: **89 API route handler**, **67 migrazioni SQL** (~60 tabelle, RLS su 50+), **231 test passing** (23 skipped), 4 ruoli utente.

## Indice della documentazione

| Documento | Contenuto |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack con versioni, struttura del progetto, middleware (CSRF + sessione), pattern di auth, client Supabase, configurazioni notevoli |
| [API.md](API.md) | Le 89 API route raggruppate per dominio, con metodi HTTP e autenticazione richiesta per ciascuna |
| [DATABASE.md](DATABASE.md) | Schema per dominio, enum, RLS e helper `get_my_role()`, funzioni e trigger, storage bucket, come applicare le migrazioni |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy su Vercel: variabili d'ambiente, migrazioni Supabase, Edge Function `genera-news`, note operative |
| [ROLES.md](ROLES.md) | Sistema multi-ruolo e permessi per area |
| [FEATURES.md](FEATURES.md) | Funzionalità per modulo (prenotazioni, corsi, tornei, chat, ...) |
| [ARENA.md](ARENA.md) | Sistema di sfide 1v1: punteggi, livelli, streak |
| [EMAIL.md](EMAIL.md) | Email transazionali via Resend, template e logging |
| [AI-NEWS.md](AI-NEWS.md) | Pipeline notizie AI: fonti RSS, Gemini, workflow bozza/approvazione, cron su Supabase |
| [FRONTEND.md](FRONTEND.md) | Convenzioni UI e design system (colori, componenti, layout) |

Il [README principale](../README.md) nella root del repository contiene overview, setup locale e comandi.
