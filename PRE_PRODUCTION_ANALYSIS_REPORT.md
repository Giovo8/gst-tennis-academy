# REPORT DI ANALISI PRE-PRODUZIONE
## GST Tennis Academy — Web Application
**Data analisi:** Giugno 2025  
**Stato:** Solo lettura — nessuna modifica apportata al codice  
**Scope:** Sicurezza, Performance, Qualità, Accessibilità, Pulizia del codice

---

## INDICE

1. [Pulizia del Codice](#1-pulizia-del-codice)  
2. [Performance](#2-performance)  
3. [Sicurezza](#3-sicurezza)  
4. [Qualità e Manutenibilità](#4-qualità-e-manutenibilità)  
5. [Accessibilità](#5-accessibilità)  
6. [Riepilogo Finale](#riepilogo-finale)

---

## 1. PULIZIA DEL CODICE

### 1.1 — Console.log in percorsi di produzione (server-side)

---

```
┌─ File: src/app/api/arena/challenges/route.ts  Righe: 17, 110, 116, 121, 133, 144, 159, 188, 212, 221, 261, 354 (+)
├─ Problema: Oltre 30 istruzioni console.log() con emoji (es. "🔵 GET /api/arena/challenges called") 
│            disseminate in tutto il file, incluse stampe di dati utente e strutture di risposta.
├─ Impatto: Rumore nei log di produzione, potenziale esposizione di dati sensibili nei log di 
│           sistema (Vercel), degrado leggibilità dei log operativi.
└─ Suggerimento: Rimuovere tutti i console.log di debug. Se necessario il logging, usare il 
                 logger strutturato già presente in src/lib/logger/secure-logger.ts.
```

---

```
┌─ File: src/app/api/tournaments/[id]/matches/[matchId]/route.ts  Righe: 187–467
├─ Problema: Oltre 15 console.log() distribuiti nell'handler, compresi dump di oggetti match 
│            e stati interni.
├─ Impatto: Come sopra; i log di Vercel sono visibili nel pannello admin, aumentando la 
│           superficie di esposizione delle informazioni.
└─ Suggerimento: Sostituire con chiamate al secure-logger solo per errori effettivi (livello 
                 error/warn). Eliminare i log informativi di debug.
```

---

```
┌─ File: src/app/dashboard/atleta/(main)/bookings/page.tsx  Righe: 268, 272, 279, 485, 488, 526
├─ Problema: 6 console.log() in un componente client-side, alcuni nei percorsi di gestione 
│            degli errori critici.
├─ Impatto: I log del browser sono visibili a qualsiasi utente con DevTools aperto.
└─ Suggerimento: Rimuovere tutti i console.log. Gestire gli stati di errore con UI feedback 
                 visibile all'utente (toast/modale).
```

---

```
┌─ File: src/lib/config/env.ts  Riga: 69
├─ Problema: console.log('✅ Environment variables validated successfully') viene eseguito 
│            a ogni cold start del server in produzione.
├─ Impatto: Rumore nei log di produzione. Nel caso di log aggregati, produce output 
│           ridondante a ogni deploy/restart.
└─ Suggerimento: Rimuovere l'istruzione o sostituirla con logger.info() condizionato a 
                 NODE_ENV === 'development'.
```

---

### 1.2 — Codice duplicato: istanziazione del client Supabase

---

```
┌─ File: src/app/api/arena/challenges/route.ts  Riga: 5–7
│  File: src/app/api/arena/reset-season/route.ts  Riga: 4–11
│  File: src/app/api/arena/players/route.ts  Riga: 7–8
│  File: src/app/api/bookings/batch/route.ts  Riga: 15
│  File: src/app/api/bookings/availability/route.ts  Riga: 5
│  File: src/app/api/admin/users/route.ts  Riga: 4
│  File: src/app/api/stats/admin/route.ts  Riga: 3–6
│  File: src/app/api/notifications/notify-admins/route.ts  Riga: 3–6
├─ Problema: 8+ file API istanziano autonomamente createClient(supabaseUrl, serviceKey) 
│            invece di importare il singleton già esistente in src/lib/supabase/serverClient.ts.
│            Alcuni lo fanno a livello di modulo (fuori dalla funzione handler), creando un 
│            client persistente per istanza serverless.
├─ Impatto: Connessioni ridondanti, consumo di memoria, difficoltà nel centralizzare 
│           configurazioni o aggiornamenti di sicurezza del client.
└─ Suggerimento: Importare supabaseServer da src/lib/supabase/serverClient.ts in tutti 
                 i route handler, eliminando le istanziazioni locali.
```

---

### 1.3 — Dati hardcoded / placeholder non rimossi

---

```
┌─ File: src/app/news/[id]/page.tsx  Righe: 22–370
├─ Problema: Il file contiene 3 news post fittizi hardcoded (n1, n2, n3) come fallback data, 
│            con contenuti inventati, nomi di tornei e giocatori falsi, e URL di immagini 
│            esterni da Unsplash.
├─ Impatto: In produzione, utenti che accedono a /news/n1 o /news/n2 visualizzano contenuto 
│           fasullo. Falsi risultati di tornei possono ingannare gli utenti o creare confusione.
└─ Suggerimento: Rimuovere completamente il record defaultPosts. Se un articolo non esiste 
                 nel DB, restituire una pagina 404 standard con notFound().
```

---

```
┌─ File: src/lib/seo/metadata.ts  Righe: 53, 66, 67
├─ Problema: Tre valori placeholder non sostituiti:
│            - google: 'your-google-verification-code' (riga 53)
│            - telephone: '+39-XXX-XXXXXXX' (riga 66)
│            - streetAddress: 'Via Example' (riga 67)
├─ Impatto: La Google Search Console non verificherà il sito. I dati strutturati (schema.org) 
│           inviati a Google conterranno informazioni false, compromettendo la SEO locale.
└─ Suggerimento: Sostituire tutti i placeholder con i valori reali prima del deploy. 
                 Spostare questi valori in variabili d'ambiente o in un file di config dedicato.
```

---

```
┌─ File: src/lib/seo/metadata.ts  Riga: 10 (metadataBase)
├─ Problema: metadataBase punta a 'https://gst-tennis-academy.vercel.app' (URL di staging 
│            Vercel), non al dominio di produzione definitivo.
├─ Impatto: Tutti i tag Open Graph e canonical URL generati da Next.js punteranno al dominio 
│           sbagliato, compromettendo la condivisione social e la SEO.
└─ Suggerimento: Impostare metadataBase da variabile d'ambiente NEXT_PUBLIC_APP_URL, 
                 valorizzata correttamente per staging e produzione.
```

---

### 1.4 — Uso di alert() per feedback utente

---

```
┌─ File: src/components/tournaments/GroupStageView.tsx  Righe: 148, 162, 167, 171, 234, 238, 242, 388
│  File: src/components/tournaments/ChampionshipStandingsView.tsx  Righe: 235, 239, 243
│  File: src/components/tournaments/EliminationBracketView.tsx  Righe: 145, 165, 172
│  File: src/components/chat/NewConversationModal.tsx  Righe: 117, 121
│  File: src/components/chat/ChatPanel.tsx  Righe: 403, 407
│  File: src/components/bookings/AthletesSelector.tsx  Riga: 120
│  File: src/app/services/[id]/page.tsx  Righe: 31, 34
├─ Problema: Oltre 20 chiamate alert() sparse in componenti di produzione, usate sia per 
│            feedback di errore che per conferme di operazioni.
├─ Impatto: alert() è bloccante (blocca il thread JS), non stilizzabile, non accessibile 
│           agli screen reader secondo gli standard ARIA, non localizzabile, non animabile.
│           Esperienza utente degradata su mobile e desktop.
└─ Suggerimento: Sostituire con il sistema di toast/notification già presente nel progetto 
                 (es. componenti in src/components/notifications/). 
                 Usare dialog modale per conferme distruttive.
```

---

```
┌─ File: src/components/tournaments/GroupStageView.tsx  Riga: 388
├─ Problema: alert('Funzione rimozione partecipante da collegare (admin).') — funzionalità 
│            dichiaratamente non implementata presente in un flusso utente attivo.
├─ Impatto: Un admin che clicca "Rimuovi partecipante" vede un alert di debug invece di 
│           un'azione funzionante. Indica una feature incompleta in produzione.
└─ Suggerimento: Implementare la funzionalità o rimuovere il bottone dall'UI fino a 
                 completamento. Non lasciare stub di debug in produzione.
```

---

### 1.5 — TODO non risolti

---

```
┌─ File: src/lib/logger/secure-logger.ts  Riga: 115
├─ Problema: Commento // TODO: Integrate with external logging service presente in codice 
│            di produzione. Il logger attualmente scrive solo su console.
├─ Impatto: In produzione su Vercel, i log sono temporanei e non aggregati. In caso di 
│           incidenti di sicurezza o errori critici, i log potrebbero non essere disponibili.
└─ Suggerimento: Prima del go-live, integrare con un servizio esterno (Sentry, Datadog, 
                 LogTail, o simile) per la persistenza e il monitoring dei log di errore.
```

---

## 2. PERFORMANCE

### 2.1 — Query database non ottimizzate

---

```
┌─ File: src/app/api/arena/challenges/route.ts  Righe: 115–117
├─ Problema: Il filtro per status viene applicato in JavaScript dopo aver recuperato TUTTI 
│            i record dalla tabella arena_challenges: 
│            const filtered = allChallenges.filter(c => c.status === status)
├─ Impatto: Trasferimento di dati non necessario tra database e applicazione. Con centinaia 
│           di sfide, il payload cresce linearmente. Latenza aumentata.
└─ Suggerimento: Applicare il filtro .eq("status", status) direttamente nella query Supabase, 
                 spostando il filtraggio lato database.
```

---

```
┌─ File: src/app/api/bookings/batch/route.ts  Righe: 50–70
├─ Problema: Pattern N+1: per ogni prenotazione nell'array batch, viene eseguita una query 
│            separata di conflict-check in un ciclo for. Con N prenotazioni = N query sequenziali.
├─ Impatto: Un batch di 10 prenotazioni genera 10 query sequenziali. Latenza = somma di 
│           tutte le query invece del massimo. Degrada esponenzialmente con dimensioni batch grandi.
└─ Suggerimento: Recuperare tutti i potenziali conflitti in una singola query con filtri 
│               combinati, poi eseguire il conflict-check in memoria su quel risultato.
```

---

```
┌─ File: src/app/api/arena/challenges/route.ts  Righe: 40–90 (GET challenge singola)
├─ Problema: Per una singola challenge, vengono eseguite 3 query sequenziali separate:
│            1. Fetch challenge, 2. Fetch profiles correlati, 3. Fetch arena_stats.
│            Non vengono parallelizzate con Promise.all().
├─ Impatto: Latenza = somma delle 3 query invece del massimo. Su connessioni lente al DB, 
│           questo triplica il tempo di risposta percepito.
└─ Suggerimento: Parallelizzare con Promise.all([queryChallenge, queryProfiles, queryStats]).
                 In alternativa, usare join Supabase dove possibile.
```

---

```
┌─ File: src/app/api/bookings/route.ts, src/app/api/arena/challenges/route.ts, 
│  src/app/api/notifications/route.ts (e 30+ altri file API)
├─ Problema: Uso pervasivo di .select("*") in tutta la codebase. Vengono recuperate tutte 
│            le colonne di ogni tabella, incluse quelle non utilizzate dal client.
├─ Impatto: Payload di rete sovradimensionati; su tabelle con molte colonne (bookings, profiles) 
│           si trasferiscono dati non necessari. Aumenta la latenza e il consumo di banda.
└─ Suggerimento: Specificare esplicitamente solo le colonne necessarie per ogni query, 
                 es. .select("id, title, start_time, status").
```

---

### 2.2 — Rate limiter non funzionale in produzione

---

```
┌─ File: src/lib/security/rate-limiter.ts
├─ Problema: Il rate limiter usa una struttura Map in memoria (singleton Node.js). 
│            Vercel esegue ogni API route in istanze serverless isolate e stateless. 
│            Il Map viene resettato a ogni cold start e non è condiviso tra istanze parallele.
├─ Impatto: Il rate limiting è di fatto non operativo in produzione. Un attaccante può 
│           bypassarlo completamente aggiornando la pagina o usando richieste parallele 
│           che atterrano su istanze diverse.
└─ Suggerimento: Sostituire con un rate limiter basato su Redis/Upstash (es. @upstash/ratelimit), 
                 o implementare il rate limiting a livello di Vercel Edge/WAF.
```

---

### 2.3 — Immagini non ottimizzate

---

```
┌─ File: src/components/landing/TextHeroSection.tsx  Righe: 97–99
│  File: src/components/landing/StaffSection.tsx  Riga: 178
│  File: src/components/landing/NewsSection.tsx  Riga: 194
│  File: src/components/arena/PlayerProfileModal.tsx  Riga: 64
│  File: src/components/arena/ChallengeModal.tsx  Riga: 96
│  File: src/components/dashboard/DashboardShell.tsx  Righe: 183, 250, 256
├─ Problema: Tag <img> HTML nativi usati al posto del componente Next.js <Image>. 
│            Assenza dell'attributo loading="lazy" in tutti i casi. Le immagini above-the-fold 
│            non sono ottimizzate per dimensioni e formato.
├─ Impatto: Immagini caricate in formato originale (PNG/JPEG non ottimizzato), nessun lazy 
│           loading per immagini off-screen, nessuna conversione automatica in WebP/AVIF. 
│           Core Web Vitals (LCP) degradati. Score Lighthouse penalizzato.
└─ Suggerimento: Sostituire <img> con il componente <Image> di Next.js (src/components/) 
                 specificando width, height e priority={true} solo per le immagini LCP.
```

---

### 2.4 — Nessuna cache sulle risposte API

---

```
┌─ File: src/app/api/services/route.ts, src/app/api/staff/route.ts, 
│        src/app/api/news/route.ts (e altri endpoint pubblici a dati statici)
├─ Problema: Le risposte API non impostano header Cache-Control. Ogni richiesta 
│            riesegue query al database anche per dati raramente mutevoli (servizi, staff, news).
├─ Impatto: Load sul database inutile; latenza percepita più alta per gli utenti; 
│           costi Supabase elevati sotto traffico.
└─ Suggerimento: Per endpoint con dati stabili, aggiungere header 
                 Cache-Control: public, max-age=300, stale-while-revalidate=600 
                 o usare la revalidazione ISR di Next.js (revalidate = 300).
```

---

### 2.5 — Vulnerabilità dipendenze (npm audit)

---

```
┌─ File: package.json
├─ Problema: npm audit rileva 15 vulnerabilità nelle dipendenze:
│            - 4 HIGH: flatted, minimatch, next (framework stesso), picomatch
│            - 11 MODERATE: ajv, brace-expansion, dompurify, lint-staged, micromatch, 
│                           postcss, resend, svix, uuid, ws, yaml
│            In particolare, next (HIGH) è la dipendenza core del framework.
├─ Impatto: Le vulnerabilità nelle versioni installate possono essere sfruttate 
│           per attacchi specifici documentati nei CVE associati. La vulnerabilità 
│           HIGH su next è particolarmente critica in produzione.
└─ Suggerimento: Eseguire npm audit fix per le correzioni automatiche. Per quelle che 
                 richiedono --force (breaking changes), valutare la migrazione manuale 
                 verificando la compatibilità. Prioritizzare la patch di next.
```

---

## 3. SICUREZZA

> Le voci in questa sezione sono ordinate per gravità decrescente.

### 3.1 — Endpoint distruttivi senza autenticazione [CRITICO]

---

```
┌─ File: src/app/api/arena/reset-season/route.ts  Righe: 14–55
├─ Problema: Il POST handler cancella TUTTI i record delle tabelle arena_challenges e 
│            arena_stats senza alcun controllo di autenticazione o autorizzazione. 
│            Il commento nel codice recita: "Frontend should verify admin role before 
│            calling this endpoint" — sicurezza delegata interamente al client.
├─ Impatto: CRITICO. Qualsiasi utente non autenticato può inviare una richiesta POST a 
│           /api/arena/reset-season e distruggere permanentemente tutti i dati della 
│           stagione Arena. Non è necessaria alcuna credenziale.
└─ Suggerimento: Aggiungere immediatamente un controllo auth server-side come prima 
                 istruzione dell'handler: verificare che l'utente sia autenticato con 
                 ruolo admin, restituendo 401/403 in caso contrario. La sicurezza non 
                 può mai essere delegata al client.
```

---

```
┌─ File: src/app/api/stats/admin/route.ts  Righe: 1–70
├─ Problema: Il GET handler espone statistiche aggregate dell'amministrazione 
│            (totale utenti, prenotazioni giornaliere, tornei attivi, entrate mensili) 
│            senza alcun controllo di autenticazione. Il client Supabase con SERVICE_ROLE_KEY 
│            è istanziato a livello di modulo (righe 3–6), non nell'handler.
├─ Impatto: CRITICO. Chiunque può accedere a /api/stats/admin e ottenere metriche 
│           sensibili del business: numero utenti, volume prenotazioni, ricavi. 
│           Questi dati possono essere usati per analisi competitive o attacchi mirati.
└─ Suggerimento: Aggiungere controllo auth admin/gestore come prima istruzione del GET 
                 handler. Spostare l'istanziazione del client dentro l'handler o importare 
                 il singleton da serverClient.ts.
```

---

### 3.2 — Endpoint di notifica admin senza autenticazione [CRITICO]

---

```
┌─ File: src/app/api/notifications/notify-admins/route.ts  Righe: 9–57
├─ Problema: Il POST handler invia notifiche a tutti gli utenti con ruolo admin/gestore 
│            senza alcun controllo di autenticazione. Accetta title, message e link 
│            arbitrari dal corpo della richiesta.
├─ Impatto: CRITICO. Un attaccante esterno può inviare notifiche con contenuto arbitrario 
│           (inclusi link di phishing) a tutti gli amministratori del sistema, senza 
│           alcuna credenziale. Vettore di spam e phishing diretto agli admin.
└─ Suggerimento: Aggiungere verifica auth + ruolo (admin o sistema interno) prima di 
                 processare la richiesta. Validare e sanitizzare title, message e link 
                 con Zod schema. Considerare un secret token per chiamate server-to-server.
```

---

### 3.3 — Dati prenotazioni esposti pubblicamente [ALTO]

---

```
┌─ File: src/app/api/bookings/route.ts  Riga: 34
├─ Problema: Il GET handler non contiene alcun controllo di autenticazione (verifyAuth 
│            è presente solo nei handler POST riga 160, PUT riga 760, DELETE riga 958). 
│            Il parametro user_id viene accettato direttamente dalla query string senza 
│            verifica che l'utente autenticato corrisponda al user_id richiesto.
├─ Impatto: ALTO. Chiunque può chiamare GET /api/bookings?user_id=<uuid> e ottenere 
│           tutte le prenotazioni di qualsiasi utente, incluse date, orari, campo, 
│           coach e partecipanti. Violazione di privacy e GDPR.
└─ Suggerimento: Aggiungere verifyAuth() come prima operazione del GET handler. 
                 Verificare che user_id (se fornito) corrisponda all'utente autenticato, 
                 a meno che non sia admin/gestore.
```

---

### 3.4 — Dati partecipanti tornei esposti [ALTO]

---

```
┌─ File: src/app/api/tournament_participants/route.ts  Riga: 16
├─ Problema: Il GET handler non contiene alcun controllo di autenticazione. 
│            La funzione getUserProfileFromRequest() è definita nel file ma 
│            non viene chiamata nel GET handler.
├─ Impatto: ALTO. Chiunque può enumerare tutti i partecipanti a qualsiasi torneo 
│           tramite GET /api/tournament_participants?tournament_id=<uuid>. 
│           Dati personali esposti (nome, ID utente, stato iscrizione).
└─ Suggerimento: Chiamare getUserProfileFromRequest() o verifyAuth() all'inizio del 
                 GET handler. Per dati pubblici dei tornei, considerare l'esposizione 
                 solo di dati aggregati/anonimi.
```

---

### 3.5 — Sfide Arena e dati utente esposti senza autenticazione [ALTO]

---

```
┌─ File: src/app/api/arena/challenges/route.ts  Righe: 10–265
├─ Problema: Il GET handler non ha alcun controllo di autenticazione. 
│            Espone per ogni challenge: ID utenti, nomi, avatar_url, email, telefono 
│            dei profili coinvolti. L'import di cookies da next/headers (riga 3) 
│            è presente ma non utilizzato per auth.
├─ Impatto: ALTO. Dati personali (email, telefono) di tutti i giocatori dell'Arena 
│           sono accessibili a chiunque. Violazione GDPR Art. 5 (minimizzazione dati) 
│           e Art. 25 (privacy by design).
└─ Suggerimento: Aggiungere verifica autenticazione. Rimuovere email e phone dal 
                 select dei profili nelle risposte GET pubbliche. Restituire solo 
                 full_name e avatar_url per utenti non admin.
```

---

### 3.6 — Health endpoint espone informazioni di sistema [ALTO]

---

```
┌─ File: src/app/api/health/route.ts  Righe: 3–11
├─ Problema: L'endpoint pubblico espone:
│            - environment: process.env.NODE_ENV (rivela se è produzione)
│            - hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY (conferma 
│              la presenza del service role key)
├─ Impatto: MEDIO-ALTO. Information disclosure: un attaccante sa che l'app usa 
│           Supabase con service role, che è in produzione, e può usare queste 
│           informazioni per targeting degli attacchi.
└─ Suggerimento: Rimuovere environment e hasServiceRole dalla risposta. 
                 L'health check dovrebbe restituire solo { status: "ok", timestamp }. 
                 Se necessario per monitoring interno, proteggere con un secret header.
```

---

### 3.7 — Assenza totale di HTTP Security Headers [ALTO]

---

```
┌─ File: next.config.ts
├─ Problema: Il file next.config.ts non definisce alcuna funzione headers() con 
│            security headers. Nessuno dei seguenti header è configurato:
│            - Content-Security-Policy (CSP)
│            - Strict-Transport-Security (HSTS)
│            - X-Frame-Options
│            - X-Content-Type-Options
│            - Referrer-Policy
│            - Permissions-Policy
├─ Impatto: ALTO. Senza CSP, attacchi XSS non mitigati a livello browser. 
│            Senza X-Frame-Options, possibili attacchi di clickjacking. 
│            Senza HSTS, downgrade attack da HTTPS a HTTP. 
│            L'assenza di questi header è rilevata da scanner di sicurezza (OWASP ZAP, 
│            SecurityHeaders.com) e impatta negativamente su audit di conformità.
└─ Suggerimento: Aggiungere una funzione headers() in next.config.ts con almeno:
                 X-Frame-Options: DENY, X-Content-Type-Options: nosniff, 
                 Referrer-Policy: strict-origin-when-cross-origin, 
                 Strict-Transport-Security: max-age=31536000; includeSubDomains.
                 Aggiungere CSP in modalità report-only inizialmente, poi enforcement.
```

---

### 3.8 — Rate limiter inefficace in ambiente serverless [ALTO]

---

```
┌─ File: src/lib/security/rate-limiter.ts
├─ Problema: (Già citato in sezione Performance 2.2 per impatto sulla disponibilità)
│            Dal punto di vista della sicurezza: il rate limiter in-memory non funziona 
│            su Vercel, rendendo inutili le protezioni anti-brute-force su login, 
│            registrazione e altri endpoint sensibili.
├─ Impatto: ALTO. Gli endpoint protetti dal rate limiter (es. login, prenotazioni) 
│           sono in realtà illimitatamente chiamabili, aprendo a brute-force e 
│           credential stuffing senza alcun rallentamento.
└─ Suggerimento: Vedi sezione 2.2. Prioritizzare la sostituzione prima del go-live.
```

---

### 3.9 — Flow di autenticazione OAuth deprecato [MEDIO]

---

```
┌─ File: src/lib/supabase/client.ts
├─ Problema: Il browser client Supabase è configurato con flowType: "implicit". 
│            Il flusso implicito OAuth è deprecato dalla specifica OAuth 2.0 
│            (RFC 9700) per problemi di sicurezza noti (token nell'URL fragment, 
│            history sniffing).
├─ Impatto: MEDIO. I token di accesso vengono esposti nell'URL. Vulnerabile a 
│           attacchi di token leakage tramite Referer header o history del browser.
│           Supabase stessa raccomanda la migrazione a PKCE.
└─ Suggerimento: Cambiare flowType: "implicit" in flowType: "pkce" nel client 
                 Supabase browser. Verificare che il callback route gestisca 
                 correttamente il code exchange PKCE.
```

---

### 3.10 — Esposizione di email e ruoli a utenti autenticati non privilegiati [MEDIO]

---

```
┌─ File: src/app/api/arena/players/route.ts
├─ Problema: L'endpoint restituisce per ogni giocatore Arena: id, full_name, 
│            avatar_url, email, role. Dati visibili a qualsiasi utente autenticato, 
│            non solo agli admin.
├─ Impatto: MEDIO. Un atleta autenticato può ottenere email e ruolo (admin/gestore/atleta) 
│           di tutti i giocatori iscritti all'Arena. Dati personali non necessari esposti.
└─ Suggerimento: Rimuovere email e role dalla risposta per utenti non admin. 
                 Restituire solo full_name e avatar_url per la visualizzazione pubblica 
                 della classifica Arena.
```

---

### 3.11 — Due sistemi di autenticazione paralleli e inconsistenti [MEDIO]

---

```
┌─ File: src/lib/auth/verifyAuth.ts  Riga: 36
│  File: src/lib/auth/routeAuth.ts
├─ Problema: La codebase usa due pattern di autenticazione distinti e non intercambiabili:
│            1. verifyAuth() — Bearer token dall'header Authorization
│            2. getRouteAuth() — Session da cookie HTTP
│            Alcuni file usano uno, altri l'altro. verifyAuth() ha return type Promise<any> 
│            (riga 36), perdendo completamente il type safety.
├─ Impatto: MEDIO. Inconsistenza che causa errori: un endpoint che si aspetta Bearer token 
│           non funzionerà se chiamato con cookie e viceversa. Il tipo any nasconde 
│           potenziali bug di runtime non rilevati dal compilatore TypeScript.
└─ Suggerimento: Standardizzare su un unico pattern di auth per tutti gli API route. 
                 Tipare correttamente il return type di verifyAuth() eliminando Promise<any>. 
                 Documentare quale pattern usare in nuovi endpoint.
```

---

### 3.12 — Verifica Google Search Console con codice placeholder [BASSO]

---

```
┌─ File: src/lib/seo/metadata.ts  Riga: 53
├─ Problema: Il campo google in verification è impostato a 'your-google-verification-code'. 
│            Se deployato, Google Search Console non riconoscerà il sito come verificato.
├─ Impatto: BASSO (funzionale/SEO). Impossibile monitorare l'indicizzazione, ricevere 
│           alert su problemi di crawling o usare strumenti di diagnostica Search Console.
└─ Suggerimento: Inserire il codice reale da Google Search Console, preferibilmente 
                 come variabile d'ambiente NEXT_PUBLIC_GOOGLE_VERIFICATION.
```

---

## 4. QUALITÀ E MANUTENIBILITÀ

### 4.1 — File API eccessivamente grandi (God Files)

---

```
┌─ File: src/app/api/bookings/route.ts  (~1000+ righe)
├─ Problema: Un singolo file gestisce GET, POST, PUT, DELETE per le prenotazioni, 
│            più: invio email, notifiche push, logging attività, gestione partecipanti, 
│            validazione Zod, rate limiting. Tutte le responsabilità in un unico modulo.
├─ Impatto: Difficoltà di testing unitario, merge conflict frequenti, impossibilità di 
│           isolare e testare i singoli comportamenti. Cognitive load altissimo per 
│           chi deve manutenere il codice.
└─ Suggerimento: Separare in moduli: bookings/handlers/ (get.ts, post.ts, put.ts, delete.ts), 
                 bookings/services/ (emailService.ts, notificationService.ts). 
                 Il route.ts deve solo fare routing verso gli handler.
```

---

```
┌─ File: src/app/api/arena/challenges/route.ts  (~700+ righe)
├─ Problema: Stesso pattern del file bookings. GET, POST, PUT, DELETE insieme a 
│            logica di business Arena, calcolo stats, gestione sfide e notifiche.
│            Contiene anche 30+ console.log di debug (vedi sezione 1.1).
├─ Impatto: Come sopra, aggravato dalla presenza di codice di debug mescolato 
│           alla logica di business.
└─ Suggerimento: Estrarre la logica Arena in un service layer dedicato 
                 (src/lib/arena/challengeService.ts). Separare i handler HTTP dalla 
                 logica di dominio.
```

---

### 4.2 — Componenti UI molto grandi con logica di business incorporata

---

```
┌─ File: src/components/bookings/BookingsTimeline.tsx  (69.2 KB)
│  File: src/components/tournaments/TournamentManager.tsx  (61.1 KB)
├─ Problema: Componenti React di dimensioni eccessive (60-70 KB) che combinano 
│            rendering UI, gestione dello stato, chiamate API, logica di business 
│            e validazione in un unico file.
├─ Impatto: Impossibilità pratica di testare componenti isolati. Bundle splitting 
│           inefficace. Difficoltà di code review. Re-render non ottimizzati per 
│           mancanza di separazione tra dati e presentazione.
└─ Suggerimento: Separare in: hook custom per la logica di stato/fetch, componenti 
                 "dumb" per il rendering, utils per le trasformazioni dati. 
                 Usare React.memo e useMemo dove appropriato.
```

---

### 4.3 — Page components monolitiche nel dashboard

---

```
┌─ File: src/app/dashboard/admin/bookings/new/page.tsx  (63.5 KB)
│  File: src/app/dashboard/admin/users/modifica/page.tsx  (59.3 KB)
│  File: src/app/dashboard/admin/bookings/modifica/page.tsx  (55.6 KB)
│  (e altri 12 file page.tsx con dimensione > 41 KB)
├─ Problema: Le pagine del dashboard contengono direttamente logica di business, 
│            chiamate API, validazione form e rendering. Nessuna separazione in 
│            componenti riutilizzabili.
├─ Impatto: Duplicazione di logica simile tra pagine analoghe (es. new vs modifica), 
│           difficoltà di testing, bundle pages molto pesanti.
└─ Suggerimento: Estrarre form complessi in componenti dedicati in src/components/. 
                 Usare hook custom per la logica di submit e validazione condivisa.
```

---

### 4.4 — Tipizzazione debole con uso di `as any`

---

```
┌─ File: src/app/api/tournament_participants/route.ts  (più occorrenze)
│  File: src/components/dashboard/AthleteLayout.tsx  Righe: 47–48
│  File: src/components/dashboard/MaestroAthleteLayout.tsx  Righe: 69–70
│  File: src/lib/auth/verifyAuth.ts  Riga: 36 (Promise<any>)
├─ Problema: Cast as any e return type any usati per aggirare il sistema di tipi 
│            TypeScript invece di definire interfacce appropriate.
├─ Impatto: Il compilatore TypeScript non può rilevare errori di runtime in questi 
│           percorsi. Bug di tipo (undefined access, wrong shape) si manifestano 
│           solo a runtime in produzione.
└─ Suggerimento: Definire interfacce TypeScript esplicite per le strutture dati 
                 (es. UserProfile, AuthResult). Eliminare tutti i cast as any, 
                 sostituendo con type guards o unknown + narrowing.
```

---

### 4.5 — Logica di business nella presentation layer

---

```
┌─ File: src/app/news/[id]/page.tsx  Righe: 22–370
├─ Problema: Il componente pagina contiene: definizione di dati hardcoded (defaultPosts), 
│            logica di parsing markdown, trasformazioni di contenuto, fallback logic. 
│            È un componente "use client" che accede direttamente a Supabase 
│            (bypassando le API route).
├─ Impatto: Impossibile testare la logica di business isolata dalla UI. 
│            Accesso diretto a Supabase dal client espone la struttura del database.
│            La logica duplicata tra client e server non è centralizzabile.
└─ Suggerimento: Convertire in Server Component o usare route API dedicate. 
                 Separare il parsing markdown in una utility. Rimuovere i dati hardcoded.
```

---

## 5. ACCESSIBILITÀ

### 5.1 — Input di form senza etichette accessibili

---

```
┌─ File: src/app/services/[id]/page.tsx  Righe: 41, 45, 49
├─ Problema: I campi <input> del form di prenotazione servizio non hanno elementi 
│            <label> associati né attributi aria-label/aria-labelledby. 
│            I placeholder non sono sostituti delle label per l'accessibilità.
├─ Impatto: Gli screen reader (NVDA, VoiceOver) non annunciano il nome del campo 
│           quando riceve il focus. Utenti non vedenti non possono compilare 
│           il form autonomamente. Viola WCAG 2.1 criterio 1.3.1 (Info and Relationships) 
│           e 4.1.2 (Name, Role, Value) — livello A.
└─ Suggerimento: Aggiungere <label htmlFor="field-id"> associato a ogni <input> tramite id. 
                 In alternativa, usare aria-label direttamente sull'input se una label 
                 visuale non è desiderata.
```

---

### 5.2 — Immagini senza ottimizzazione per connessioni lente

---

```
┌─ File: src/components/landing/StaffSection.tsx  Riga: 178
│  File: src/components/landing/NewsSection.tsx  Riga: 194
│  File: src/components/arena/PlayerProfileModal.tsx  Riga: 64
│  File: src/components/arena/ChallengeModal.tsx  Riga: 96
│  File: src/components/landing/TextHeroSection.tsx  Righe: 97–99
│  File: src/components/dashboard/DashboardShell.tsx  Righe: 183, 250, 256
├─ Problema: Tag <img> senza loading="lazy". Le immagini off-screen (foto staff, 
│            card news, avatar arena) vengono caricate immediatamente al caricamento 
│            della pagina, competendo con le risorse critiche.
├─ Impatto: Su connessioni lente o dispositivi mobili, le immagini non critiche 
│           rallentano il caricamento delle risorse above-the-fold. 
│           Impatto su Largest Contentful Paint (LCP) e Total Blocking Time (TBT). 
│           Esperienza degradata per utenti con connessione mobile 3G/4G limitata.
└─ Suggerimento: Aggiungere loading="lazy" sulle immagini off-screen. 
                 Migrare al componente <Image> di Next.js per ottimizzazione automatica.
                 Impostare priority={true} solo sull'immagine hero principale.
```

---

### 5.3 — Feedback tramite alert() non accessibile

---

```
┌─ File: (vedi elenco completo in sezione 1.4)
├─ Problema: L'uso di alert() per notificare errori e successi non è compatibile 
│            con le linee guida ARIA. I dialog nativi del browser non rispettano 
│            il focus management, non supportano aria-live regions, e interrompono 
│            il flusso degli screen reader in modo imprevedibile.
├─ Impatto: Utenti con screen reader non ricevono feedback contestuale. 
│            L'interruzione del flusso di navigazione viola WCAG 2.1 criterio 3.2 
│            (Predictable) e 4.1.3 (Status Messages).
└─ Suggerimento: Usare aria-live="polite" per messaggi di stato non urgenti, 
                 aria-live="assertive" per errori critici. Integrare con il sistema 
                 di toast già presente nel progetto.
```

---

### 5.4 — Copertura aria-label incompleta su controlli interattivi

---

```
┌─ File: src/components/dashboard/DashboardShell.tsx  Righe: 183, 250, 256
├─ Problema: Gli avatar utente renderizzati come <img> nei controlli di navigazione 
│            del dashboard potrebbero non avere testo alternativo descrittivo. 
│            Bottoni icon-only senza aria-label rendono impossibile la navigazione 
│            da tastiera per utenti non vedenti.
├─ Impatto: Violazione WCAG 2.1 criterio 1.1.1 (Non-text Content) e 2.4.6 (Headings 
│            and Labels). Il pannello di navigazione admin non è completamente 
│            navigabile da tastiera.
└─ Suggerimento: Aggiungere alt="Avatar di [nome utente]" a tutte le immagini avatar. 
                 Verificare che tutti i bottoni icon-only abbiano aria-label descrittivo. 
                 Eseguire audit con axe DevTools o Lighthouse Accessibility.
```

---

## RIEPILOGO FINALE

### Conteggio totale problemi

| Sezione | Critico | Alto | Medio | Basso | Totale |
|---------|---------|------|-------|-------|--------|
| 1. Pulizia del codice | 0 | 0 | 7 | 3 | **10** |
| 2. Performance | 0 | 2 | 4 | 1 | **7** |
| 3. Sicurezza | 3 | 5 | 3 | 1 | **12** |
| 4. Qualità/Manutenibilità | 0 | 0 | 5 | 0 | **5** |
| 5. Accessibilità | 0 | 1 | 2 | 1 | **4** |
| **TOTALE** | **3** | **8** | **21** | **6** | **38** |

---

### Top 5 interventi urgenti (ordine di priorità)

#### 🔴 #1 — Autenticazione su reset-season [CRITICO]
**File:** `src/app/api/arena/reset-season/route.ts`  
Chiunque può cancellare tutti i dati Arena. Da risolvere in meno di 1 ora.

#### 🔴 #2 — Autenticazione su stats/admin [CRITICO]
**File:** `src/app/api/stats/admin/route.ts`  
Statistiche business esposte pubblicamente. Da risolvere in meno di 1 ora.

#### 🔴 #3 — Autenticazione su notify-admins [CRITICO]
**File:** `src/app/api/notifications/notify-admins/route.ts`  
Vettore di spam/phishing diretto agli admin. Da risolvere in meno di 1 ora.

#### 🟠 #4 — Autenticazione su GET /api/bookings [ALTO]
**File:** `src/app/api/bookings/route.ts` — riga 34  
Dati personali delle prenotazioni di tutti gli utenti esposti. GDPR compliance.

#### 🟠 #5 — HTTP Security Headers assenti [ALTO]
**File:** `next.config.ts`  
Aggiungere X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy. 
Richiede 30 minuti, impatto di sicurezza elevato.

---

### Stima complessiva dell'impegno

| Fase | Attività | Stima |
|------|----------|-------|
| **Sprint 1 — Sicurezza critica** | Fix auth su 4 endpoint senza protezione | 4–8 ore |
| **Sprint 2 — Sicurezza alta** | Security headers, rate limiter Redis, PKCE auth | 1–2 giorni |
| **Sprint 3 — Pulizia** | Rimozione console.log, alert(), dati placeholder | 1 giorno |
| **Sprint 4 — Performance** | Lazy loading immagini, query ottimizzate, cache headers | 1–2 giorni |
| **Sprint 5 — Qualità** | Tipizzazione, refactoring file grandi, separazione concern | 3–5 giorni |
| **Sprint 6 — A11y** | Label form, aria-live, audit completo | 1 giorno |
| **TOTALE STIMATO** | | **7–12 giorni lavorativi** |

> **Nota:** I primi 3 sprint (sicurezza) devono essere completati PRIMA del deploy in produzione. 
> I successivi possono essere pianificati come backlog post-launch.

---

*Report generato da analisi statica del codice. Nessuna modifica apportata al codebase.*  
*Versioni analizzate: Next.js 15.1.1, React 19.2.3, TypeScript 5.9.3, Supabase-js 2.x*
