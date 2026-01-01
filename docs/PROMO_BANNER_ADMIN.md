# Banner Promozionale - Guida Admin

## Descrizione
Sistema completo per gestire il banner promozionale visualizzato nella homepage dell'academy.

## Caratteristiche

### 🎯 Funzionalità Principali
- ✅ **Abilitazione/Disabilitazione**: Attiva o disattiva il banner con un click
- ✅ **Personalizzazione Messaggio**: Modifica liberamente il testo del banner
- ✅ **CTA Customizzabile**: Configura testo e URL del bottone call-to-action
- ✅ **4 Temi Colore**: Scegli tra Blu, Verde, Viola e Rosso
- ✅ **Anteprima Live**: Vedi come apparirà il banner prima di salvare
- ✅ **Auto-Dismissal**: Gli utenti possono chiudere il banner (rimane nascosto per 7 giorni)

### 👁️ Visibilità
Il banner viene mostrato **solo agli utenti non autenticati** nella homepage.

## Come Accedere

1. Login come **Admin** o **Gestore**
2. Vai su **Dashboard Admin**
3. Clicca su **Banner Promozionale**
4. Modifica le impostazioni
5. Clicca su **Salva Modifiche**

## Struttura Tecnica

### File Coinvolti
```
src/
├── components/
│   ├── layout/
│   │   └── PromoBanner.tsx              # Componente banner visualizzato
│   └── dashboard/
│       └── PromoBannerSettings.tsx       # Form gestione impostazioni
├── app/
│   ├── api/
│   │   └── promo-banner/
│   │       └── route.ts                  # API GET/PUT
│   └── dashboard/
│       └── admin/
│           └── promo-banner/
│               └── page.tsx              # Pagina admin
└── supabase/
    └── migrations/
        └── 021_add_promo_banner_settings.sql
```

### Database

**Tabella**: `promo_banner_settings`

| Campo | Tipo | Default | Descrizione |
|-------|------|---------|-------------|
| id | UUID | auto | Chiave primaria |
| is_enabled | BOOLEAN | true | Banner attivo/disattivo |
| message | TEXT | - | Testo del banner |
| cta_text | VARCHAR(50) | 'Iscriviti' | Testo del bottone |
| cta_url | VARCHAR(255) | '/register' | URL del bottone |
| background_color | VARCHAR(50) | 'blue' | Tema colore |
| updated_at | TIMESTAMPTZ | NOW() | Data ultima modifica |
| updated_by | UUID | - | Utente che ha modificato |
| created_at | TIMESTAMPTZ | NOW() | Data creazione |

### API Endpoints

#### GET `/api/promo-banner`
- **Accesso**: Pubblico
- **Risposta**: Oggetto con le impostazioni correnti
- **Uso**: Caricamento impostazioni nel componente

#### PUT `/api/promo-banner`
- **Accesso**: Solo Admin/Gestore
- **Body**: `{ is_enabled, message, cta_text, cta_url, background_color }`
- **Autenticazione**: Header `Authorization: Bearer <token>`
- **Uso**: Salvataggio modifiche

### Sicurezza (RLS)

```sql
-- Tutti possono leggere
SELECT: true

-- Solo admin/gestore possono modificare
UPDATE: user_role IN ('admin', 'gestore')
```

## Temi Colore

### 🔵 Blu (Default)
- Gradiente: `from-blue-600 via-cyan-500 to-blue-600`
- Bottone: `bg-white text-gray-900`
- Uso consigliato: Promozioni generali

### 🟢 Verde
- Gradiente: `from-green-600 via-emerald-500 to-green-600`
- Bottone: `bg-white text-gray-900`
- Uso consigliato: Iniziative eco-friendly, offerte speciali

### 🟣 Viola
- Gradiente: `from-purple-600 via-violet-500 to-purple-600`
- Bottone: `bg-white text-gray-900`
- Uso consigliato: Eventi premium, tornei

### 🔴 Rosso
- Gradiente: `from-red-600 via-rose-500 to-red-600`
- Bottone: `bg-white text-gray-900`
- Uso consigliato: Offerte urgenti, scadenze imminenti

## Best Practices

### ✍️ Scrittura Messaggi
- Mantieni il messaggio breve (max 100 caratteri)
- Usa emoji per catturare l'attenzione (🎾 🏆 🔥 ⚡)
- Evidenzia il beneficio principale
- Crea urgenza quando appropriato

### Esempi
```
✅ Buono: "🎾 Novità! Registrati oggi e ricevi 2 crediti gratuiti!"
✅ Buono: "🏆 Iscrizioni aperte per il Torneo Estivo! Posti limitati!"
❌ Evitare: "Benvenuto nel nostro sito web dove puoi trovare..."
```

### 🔘 Call-to-Action
- Usa verbi d'azione: "Iscriviti", "Prenota", "Partecipa"
- Mantieni breve (max 20 caratteri)
- Assicurati che l'URL sia corretto

### 🎨 Scelta Colori
- **Eventi regolari**: Blu (neutro e professionale)
- **Offerte speciali**: Verde o Viola
- **Urgenze/Scadenze**: Rosso

## Comportamento Utente

1. **Prima visita**: Banner visibile
2. **Chiusura manuale**: Banner nascosto per 7 giorni
3. **Dopo 7 giorni**: Banner riappare automaticamente
4. **Login utente**: Banner non più visibile

## Troubleshooting

### Il banner non appare
- ✅ Verifica che `is_enabled = true`
- ✅ Assicurati di essere su `/` (homepage)
- ✅ Controlla di non essere autenticato
- ✅ Verifica localStorage: chiave `promoBannerDismissed`

### Le modifiche non si salvano
- ✅ Verifica di avere ruolo admin/gestore
- ✅ Controlla la console del browser per errori API
- ✅ Verifica che il token di autenticazione sia valido

### Il banner si ripete dopo chiusura
- ✅ Controlla localStorage del browser
- ✅ La chiusura vale 7 giorni, poi riappare automaticamente

## Manutenzione

### Modificare la durata di dismissal
Nel file `PromoBanner.tsx`:
```typescript
// Cambia da 7 giorni a N giorni
const dismissedData = JSON.parse(stored);
if (Date.now() - dismissedData.timestamp < 7 * 24 * 60 * 60 * 1000) { // <-- modificare qui
```

### Aggiungere nuovi temi colore
Nel file `PromoBannerSettings.tsx`:
```typescript
const colorThemes = {
  // ... colori esistenti
  yellow: {
    gradient: "from-yellow-600 via-amber-500 to-yellow-600",
    button: "bg-white text-gray-900",
  },
};
```

## Task #6 Completato ✅

Questa implementazione completa il **Task #6: Link Registrazione Visibili** con:
- ✅ PromoBanner dinamico e database-driven
- ✅ Pannello admin completo per gestione
- ✅ 4 temi colore
- ✅ Auto-dismissal con localStorage
- ✅ RLS policies per sicurezza
- ✅ API REST per CRUD operations
- ✅ UI responsive e accessibile
