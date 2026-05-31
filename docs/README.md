# Documentazione — GST Tennis Academy

Documentazione tecnica completa della piattaforma di gestione dell'accademia di tennis.

GST Tennis Academy è un'applicazione **Next.js 16 / React 19** con backend **Supabase
(PostgreSQL + Auth + Storage)**, sistema email **Resend** e deploy su **Vercel**.

---

## Indice della documentazione

| Documento | Contenuto |
|-----------|-----------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Stack tecnologico, struttura del progetto, client Supabase, middleware, sicurezza, variabili d'ambiente |
| **[DATABASE.md](DATABASE.md)** | Schema completo: tabelle, funzioni, trigger, policy RLS, storage bucket, elenco migrazioni |
| **[API.md](API.md)** | Inventario completo degli endpoint API (~69 route) con metodi, autenticazione e payload |
| **[FEATURES.md](FEATURES.md)** | Funzionalità della piattaforma, mappa delle pagine e permessi per ruolo |
| **[ROLES.md](ROLES.md)** | Sistema multi-ruolo, gerarchia dei permessi e funzioni helper |
| **[ARENA.md](ARENA.md)** | Sistema Arena (sfide 1v1): regole, punteggi, ranking e flussi |
| **[EMAIL.md](EMAIL.md)** | Sistema email transazionale con Resend, notifiche e logging |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Setup locale, configurazione database, variabili d'ambiente, deploy su Vercel, cron job |
| **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** | Sistema di design: colori, tipografia, componenti UI, glassmorphism |
| **[FRONTEND.md](FRONTEND.md)** | Linee guida frontend, ottimizzazione mobile e accessibilità |

---

## Panoramica rapida

- **Multi-ruolo**: `atleta`, `maestro`, `gestore`, `admin`, con dashboard dedicate.
- **Prenotazioni**: campi, lezioni private e di gruppo con calendario e vincolo anti-sovrapposizione.
- **Tornei**: eliminazione diretta, girone + eliminazione e campionato (round-robin) con punteggi tennis reali.
- **Arena**: sfide 1v1 con ranking, punti e livelli (Bronzo → Diamante).
- **Corsi**: iscrizioni, presenze, pagamenti, programmazione avanzata e supporto ospiti.
- **Comunicazione**: chat in tempo reale, messaggi interni, notifiche in-app ed email.
- **Contenuti**: news, annunci, video lezioni, homepage dinamica.

Per la guida d'installazione e i comandi principali vedi il [README del progetto](../README.md)
e [DEPLOYMENT.md](DEPLOYMENT.md).
