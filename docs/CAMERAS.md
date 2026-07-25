# Telecamere Tapo — Live view nella dashboard

Guida al setup dell'infrastruttura necessaria per mostrare le telecamere **TP-Link Tapo** dell'accademia dentro la dashboard admin. Questo documento copre **solo la parte hardware/rete**: l'integrazione nell'app (pagina, voce di menu, CSP) va fatta dopo, quando il flusso video è raggiungibile via HTTPS.

> **Stato**: infrastruttura non ancora realizzata. Nessuna pagina telecamere esiste nell'app al momento.

## Perché serve un dispositivo ponte

Non è possibile collegare l'app direttamente alle telecamere, per tre motivi indipendenti:

1. **Nessuna API pubblica Tapo.** TP-Link non espone endpoint per il live streaming della linea consumer Tapo. L'app ufficiale passa dal cloud proprietario, non utilizzabile da terzi.
2. **Le Tapo parlano RTSP, che nessun browser riproduce.** Serve un componente che converta RTSP in un formato web (HLS, MSE o WebRTC).
3. **Le telecamere hanno IP privati.** Stanno sulla LAN dell'accademia (`192.168.x.x`): l'app su Vercel non può raggiungerle. Aprire le porte del router verso le telecamere è da evitare — RTSP è in chiaro, le credenziali stanno nell'URL e gli IP esposti vengono scansionati in continuazione.

Vercel non può nemmeno ospitare il convertitore: richiede un processo sempre attivo, mentre le funzioni serverless hanno esecuzione breve.

## Architettura

```
Telecamere Tapo (RTSP, LAN)
      │
      ▼
go2rtc su mini PC / Raspberry (presso l'accademia)
      │  RTSP → MSE / HLS  (stream copy, nessuna ricodifica)
      ▼
Cloudflare Tunnel (HTTPS, nessuna porta aperta sul router)
      │  protetto da Cloudflare Access
      ▼
iframe nella dashboard admin (solo ruoli admin / gestore)
```

## Prerequisiti legali (da sistemare prima del tecnico)

In Italia la videosorveglianza in una struttura sportiva ha vincoli concreti, più stringenti qui perché in accademia ci sono **minori**. Da verificare **prima** di rendere le telecamere visibili nella piattaforma:

| Adempimento | Riferimento |
|---|---|
| Informativa con cartelli visibili prima dell'area inquadrata | GDPR art. 13 |
| Base giuridica del trattamento e registro dei trattamenti | GDPR art. 6, 30 |
| Retention limitata (il Garante indica di norma 24–72h) | Provv. Garante videosorveglianza |
| Valutazione d'impatto (DPIA) se il monitoraggio è sistematico | GDPR art. 35 |
| **Accordo sindacale o autorizzazione dell'Ispettorato del lavoro** se le riprese possono inquadrare maestri e staff | Art. 4 Statuto dei Lavoratori (L. 300/1970) |
| Informativa specifica ai genitori per i minori | GDPR art. 8 |

Ricadute sull'architettura scelta:

- La sezione va limitata ad **`admin` e `gestore`**, mai ad `atleta` o `maestro`.
- `go2rtc` in questa configurazione **non registra nulla**: solo live view. Questo semplifica molto la compliance (niente retention da gestire, niente archivio da proteggere). Non attivare funzioni di registrazione senza aver prima completato gli adempimenti sopra.

## Hardware

| Componente | Indicazione |
|---|---|
| Dispositivo ponte | Raspberry Pi 4 (2 GB) / Pi 5, oppure mini PC con Intel N100 |
| Alimentazione | Deve restare sempre acceso; consigliato un piccolo UPS |
| Rete | Preferibile **via cavo Ethernet**, non WiFi |
| Costo indicativo | 80–120 € |

Le Tapo emettono già **H.264**, quindi `go2rtc` può fare *stream copy* verso il browser senza ricodificare: il carico CPU resta molto basso e un Pi 4 gestisce tranquillamente 3–4 telecamere. La ricodifica servirebbe solo per formati non supportati, e in quel caso il fabbisogno hardware cambierebbe molto.

**Attenzione alla banda in upload.** Ogni spettatore consuma banda in uscita dalla sede:

| Flusso | Banda per spettatore |
|---|---|
| `stream1` (main, fino a 2K secondo il modello) | ~2–4 Mbit/s |
| `stream2` (sub, ~640×360) | ~0,5 Mbit/s |

Con una linea ADSL/FTTC in upload limitato, usare `stream2` per la vista a griglia e `stream1` solo a schermo intero.

Se le telecamere sono in WiFi, più flussi contemporanei possono saturare la rete wireless: valutare il passaggio a cavo per le postazioni fisse.

## Passo 1 — Attivare RTSP sulle Tapo

Nell'app Tapo, per **ogni** telecamera:

1. Apri la telecamera → icona impostazioni (rotella)
2. **Impostazioni avanzate** → **Account telecamera** (o *Account dispositivo* / *Camera Account* secondo la versione del firmware)
3. Crea username e password dedicati — **non riusare** le credenziali dell'account TP-Link
4. Annota le credenziali: serviranno nella configurazione di `go2rtc`

Gli URL RTSP risultanti sono:

```
rtsp://UTENTE:PASSWORD@IP_TELECAMERA:554/stream1   # main, alta risoluzione
rtsp://UTENTE:PASSWORD@IP_TELECAMERA:554/stream2   # sub, bassa risoluzione
```

> Alcuni modelli e firmware recenti hanno spostato o limitato l'opzione RTSP (su certi modelli si trova sotto *Tapo Lab* tra le funzioni sperimentali). **Verifica prima di procedere**: apri VLC → *Media* → *Apri flusso di rete* → incolla l'URL RTSP. Se VLC non riproduce il flusso, il resto della guida non può funzionare e va verificato il supporto RTSP del modello specifico.

## Passo 2 — IP fisso per le telecamere

Se l'IP di una telecamera cambia, il flusso si interrompe. Assegna una **prenotazione DHCP** sul router associando l'IP al MAC address di ciascuna telecamera — è preferibile all'IP statico impostato sul dispositivo, perché resta gestito centralmente dal router.

Annota la mappatura, servirà nel passo successivo:

| Telecamera | IP | Posizione |
|---|---|---|
| Tapo 1 | 192.168.1.50 | Campo 1 |
| Tapo 2 | 192.168.1.51 | Campo 2 |
| ... | | |

## Passo 3 — Installare go2rtc

Sul dispositivo ponte (esempio per Raspberry Pi 64 bit):

```bash
sudo mkdir -p /opt/go2rtc && cd /opt/go2rtc

# Scegli il binario per la tua architettura dalle release ufficiali:
# https://github.com/AlexxIT/go2rtc/releases
# linux_arm64 (Pi 64bit) · linux_amd64 (mini PC) · linux_arm (Pi 32bit)
sudo curl -L -o go2rtc \
  https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_arm64
sudo chmod +x go2rtc
```

## Passo 4 — Configurare go2rtc

Crea `/opt/go2rtc/go2rtc.yaml`:

```yaml
streams:
  # Un'entrata per telecamera. I nomi diventano gli identificativi usati nell'app.
  campo1: rtsp://UTENTE:PASSWORD@192.168.1.50:554/stream1
  campo1_sub: rtsp://UTENTE:PASSWORD@192.168.1.50:554/stream2
  campo2: rtsp://UTENTE:PASSWORD@192.168.1.51:554/stream1
  campo2_sub: rtsp://UTENTE:PASSWORD@192.168.1.51:554/stream2

api:
  # Ascolta solo su localhost: l'unico accesso dall'esterno passa dal tunnel.
  listen: "127.0.0.1:1984"

log:
  level: info
```

Il file contiene password in chiaro, quindi restringi i permessi:

```bash
sudo chown root:root /opt/go2rtc/go2rtc.yaml
sudo chmod 600 /opt/go2rtc/go2rtc.yaml
```

Prova la configurazione:

```bash
sudo /opt/go2rtc/go2rtc -config /opt/go2rtc/go2rtc.yaml
```

Da un browser sullo stesso dispositivo, apri `http://127.0.0.1:1984`: la web UI di `go2rtc` elenca gli stream configurati e permette di provarli.

### Quale protocollo usare attraverso il tunnel

Punto importante, che fa risparmiare tempo: **Cloudflare Tunnel inoltra HTTP e WebSocket, non UDP arbitrario.** Il WebRTC, che userebbe UDP, attraverso il tunnel è problematico.

Usa invece **MSE** (Media Source Extensions su WebSocket): passa senza problemi dal tunnel e ha latenza attorno a 1 secondo, del tutto adeguata per controllare i campi.

| Modalità | Attraverso Cloudflare Tunnel | Latenza |
|---|---|---|
| `webrtc` | Problematico (richiede UDP) | ~0,5 s |
| **`mse`** | **Funziona** — scelta consigliata | ~1 s |
| `hls` | Funziona | ~6–15 s |
| `mjpeg` | Funziona, molta banda | ~1 s |

Il player incluso in `go2rtc` accetta la modalità come parametro:

```
https://cams.tuodominio.it/stream.html?src=campo1&mode=mse
```

Questo è l'URL che finirà nell'`iframe` della dashboard.

## Passo 5 — Avviare go2rtc come servizio

Crea `/etc/systemd/system/go2rtc.service`:

```ini
[Unit]
Description=go2rtc
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/opt/go2rtc/go2rtc -config /opt/go2rtc/go2rtc.yaml
WorkingDirectory=/opt/go2rtc
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now go2rtc
sudo systemctl status go2rtc
```

## Passo 6 — Esporre con Cloudflare Tunnel

Richiede un dominio gestito su Cloudflare (piano gratuito sufficiente).

```bash
# Installa cloudflared (vedi docs Cloudflare per il pacchetto della tua distro)
cloudflared tunnel login
cloudflared tunnel create gst-cams
cloudflared tunnel route dns gst-cams cams.tuodominio.it
```

Crea `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: cams.tuodominio.it
    service: http://127.0.0.1:1984
  - service: http_status:404
```

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Nessuna porta va aperta sul router: il tunnel stabilisce una connessione in uscita.

## Passo 7 — Proteggere l'accesso (obbligatorio)

`go2rtc` **non ha autenticazione attiva per default**, e la sua API permette di aggiungere stream ed eseguire comandi `ffmpeg`. Esposta in chiaro sarebbe un problema di sicurezza serio, oltre a rendere pubbliche le riprese.

Configura **Cloudflare Access** (Zero Trust, gratuito fino a 50 utenti):

1. Dashboard Cloudflare → **Zero Trust** → *Access* → *Applications* → *Add an application* → **Self-hosted**
2. Dominio: `cams.tuodominio.it`
3. Policy: *Allow* → **Emails** → inserisci solo gli indirizzi di admin e gestore
4. Metodo di login: One-time PIN via email, oppure Google

Due avvertenze oneste su questa scelta:

- **Sarà un secondo login, separato da quello dell'app.** La prima volta l'`iframe` mostrerà la pagina di autenticazione Cloudflare; dopo l'accesso il cookie persiste e la visualizzazione diventa trasparente. Per 2–3 utenti amministrativi è un compromesso accettabile.
- **Non incorporare credenziali nell'URL** dell'`iframe` (es. basic auth): sarebbero visibili nel sorgente della pagina a chiunque acceda alla dashboard.

## Verifica finale

```bash
# Sul dispositivo ponte
sudo systemctl status go2rtc cloudflared

# Da qualsiasi rete, in un browser
# → deve chiedere il login Cloudflare Access, poi mostrare il video
https://cams.tuodominio.it/stream.html?src=campo1&mode=mse
```

## Integrazione nell'app (da fare dopo)

Quando l'URL sopra funziona, l'aggiunta lato app è contenuta:

| Intervento | File |
|---|---|
| Pagina con `AuthGuard allowedRoles={["admin", "gestore"]}` | `src/app/dashboard/admin/cameras/page.tsx` (da creare) |
| Voce di menu "Telecamere" | [`AdminLayout.tsx`](../src/components/dashboard/AdminLayout.tsx) — accanto a "Video Lab" |
| Elenco telecamere e URL base via variabile d'ambiente | `.env.example` → `NEXT_PUBLIC_CAMERAS_URL` |
| Direttiva CSP per l'`iframe` | [`next.config.ts`](../next.config.ts) → aggiungere l'host a `frame-src` |

Note per quella fase:

- La CSP dell'app ha `default-src 'self'` e un `frame-src` esplicito (già presente per YouTube): senza aggiungere `https://cams.tuodominio.it` l'`iframe` viene bloccato dal browser. Le modifiche a `next.config.ts` richiedono il **riavvio del dev server** per avere effetto.
- Come indicato in `CLAUDE.md`, le modifiche a security header e CSP vanno concordate esplicitamente.
- Usare gli stream `_sub` nella vista a griglia e i main solo a schermo intero, per contenere la banda in upload.

## Problemi frequenti

| Sintomo | Causa probabile |
|---|---|
| VLC non apre l'URL RTSP | Account telecamera non creato, credenziali errate, o modello/firmware senza supporto RTSP |
| Stream visibile in locale ma non dal tunnel | Modalità `webrtc` invece di `mse` — Cloudflare Tunnel non inoltra UDP |
| Il flusso si interrompe dopo giorni | IP della telecamera cambiato: manca la prenotazione DHCP (Passo 2) |
| Video a scatti con più spettatori | Banda in upload insufficiente: passare a `stream2` per la griglia |
| `iframe` bianco nella dashboard | Host mancante in `frame-src` nella CSP, oppure dev server non riavviato |
| Errore 502 dal tunnel | `go2rtc` non in esecuzione: `sudo systemctl status go2rtc` |

## Alternative valutate

| Soluzione | Perché non è stata scelta |
|---|---|
| Port forwarding RTSP sul router | RTSP in chiaro, credenziali nell'URL, telecamere esposte a scansioni. Non risolve comunque la riproduzione nel browser |
| Convertitore su Vercel | Le funzioni serverless non possono mantenere un processo `ffmpeg` persistente |
| Frigate | NVR completo con object detection: più risorse e più complessità del necessario per la sola live view. Da considerare se in futuro servissero registrazione o rilevamento eventi |
| MediaMTX | Valida alternativa a `go2rtc`, funzionalità equivalenti per questo scopo. `go2rtc` è preferito qui per il player web integrato, che evita di aggiungere dipendenze npm all'app |
| Tailscale invece di Cloudflare Tunnel | Richiederebbe l'installazione del client su ogni dispositivo che guarda: scomodo per l'accesso da dashboard web |
