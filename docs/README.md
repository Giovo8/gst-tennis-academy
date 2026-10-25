# Documentazione — GST Tennis Academy

GST Tennis Academy è una piattaforma web per la gestione completa di un'accademia di tennis: prenotazione campi e lezioni, corsi con presenze, tornei, sfide competitive (Arena), chat interna con gruppi, bacheca avvisi, feedback, notizie generate con AI e area amministrativa multi-ruolo (`atleta`, `maestro`, `gestore`, `admin`).

Stack: **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS v4**, backend **Supabase** (Auth, PostgreSQL, Storage, Realtime, Edge Functions), email **Resend**, notizie AI con **Google Gemini**. Deploy su Vercel.

Numeri chiave (ottobre 2026): **119 pagine**, **68 API route** (93 handler), migrazioni SQL **001–097** (prossima `098`), **307 test passing** (17 skipped), 4 ruoli utente.

## Indice della documentazione

| Documento                            | Contenuto                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)   | Stack con versioni, struttura del progetto, middleware (CSRF, rate limiting, sessione), pattern di auth, client Supabase, realtime, configurazioni notevoli e debito tecnico |
| [API.md](API.md)                     | Tutte le API route raggruppate per dominio, con metodi HTTP, autenticazione richiesta e parametri principali                                                                 |
| [DATABASE.md](DATABASE.md)           | Schema per dominio, enum, RLS e helper `get_my_role()`, funzioni e trigger, storage bucket, come applicare le migrazioni                                                     |
| [DEPLOYMENT.md](DEPLOYMENT.md)       | Deploy su Vercel: variabili d'ambiente, migrazioni Supabase, Edge Function `genera-news`, note operative                                                                     |
| [ROLES.md](ROLES.md)                 | Sistema multi-ruolo e permessi per area                                                                                                                                      |
| [FEATURES.md](FEATURES.md)           | Funzionalità per modulo (prenotazioni, corsi, tornei, chat, bacheca, feedback, ...)                                                                                          |
| [ARENA.md](ARENA.md)                 | Sistema di sfide 1v1: punteggi, livelli, streak                                                                                                                              |
| [EMAIL.md](EMAIL.md)                 | Email transazionali via Resend, template e logging                                                                                                                           |
| [AI-NEWS.md](AI-NEWS.md)             | Pipeline notizie AI: fonti RSS, Gemini, workflow bozza/approvazione, cron su Supabase                                                                                        |
| [FRONTEND.md](FRONTEND.md)           | Convenzioni frontend, mobile, accessibilità, sicurezza lato client                                                                                                           |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Palette, tipografia e componenti UI                                                                                                                                          |
| [CAMERAS.md](CAMERAS.md)             | Live view telecamere Tapo: setup go2rtc + Cloudflare Tunnel, prerequisiti privacy                                                                                            |

Il [README principale](../README.md) nella root del repository contiene overview, setup locale e comandi.
