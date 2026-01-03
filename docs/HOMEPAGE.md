# Homepage Documentation - GST Tennis Academy

**Ultima revisione**: 3 Gennaio 2026  
**Versione**: 2.0  
**File**: `src/app/page.tsx`

---

## 📋 Panoramica

La homepage è la landing page principale dell'applicazione GST Tennis Academy, progettata per offrire una prima impressione professionale e fornire tutte le informazioni essenziali ai visitatori. È completamente responsive e ottimizzata per l'accessibilità.

---

## 🏗️ Struttura Componenti

La homepage è composta da una serie di sezioni modulari che possono essere facilmente modificate o riordinate:

### 1. **PromoBanner** 
`@/components/layout/PromoBanner`

**Posizione**: Top della pagina (fixed)  
**Descrizione**: Banner promozionale configurabile dall'admin

**Features**:
- Configurabile da dashboard admin (`/api/promo-banner`)
- Mostra solo agli utenti non autenticati
- Dismissibile (salva stato in localStorage)
- 4 temi colore (blue, green, purple, red)
- Animazioni background
- CTA button personalizzabile

**Configurazione**:
```typescript
{
  is_enabled: boolean;
  message: string;
  cta_text: string;
  cta_url: string;
  background_color: 'blue' | 'green' | 'purple' | 'red';
}
```

---

### 2. **PublicNavbar**
`@/components/layout/PublicNavbar`

**Posizione**: Sticky top  
**Descrizione**: Barra di navigazione principale

**Features**:
- Sticky navigation (rimane visibile durante lo scroll)
- Logo centrale cliccabile
- Link principali: Corsi, Tornei, News, Tariffe
- Sezione social media (Instagram, Facebook, YouTube)
- Login/Account dinamico basato su stato autenticazione
- Dropdown tariffe con link a:
  - Campi
  - Abbonamenti
  - Corsi
  - Tornei
- Menu mobile hamburger responsive
- Mostra nome utente e ruolo se autenticato
- Pulsanti Dashboard e Logout per utenti loggati

**Link Protetti**:
Se l'utente non è autenticato, i link protetti reindirizzano a `/login?redirect={targetPath}`

---

### 3. **TextHeroSection**
`@/components/landing/TextHeroSection`

**Posizione**: Prima sezione dopo navbar  
**Descrizione**: Hero section con titolo principale

**Contenuto**:
- **Titolo principale**: "GST Academy" (testo extra large)
- **Sottotitolo**: Descrizione breve dell'academy
- Typography moderna con font extrabold
- Color scheme: secondary theme color

**Stile**:
- `text-7xl sm:text-8xl lg:text-9xl xl:text-[10rem]` per il titolo
- Centrato con max-width container
- Padding verticale responsive

---

### 4. **ImageOnlySection**
`@/components/landing/ImageOnlySection`

**Posizione**: Dopo TextHeroSection  
**Descrizione**: Sezione full-width con immagine campo tennis

**Features**:
- Immagine full-width e full-height
- Altezza responsive: 700px → 800px → 900px
- Object-fit: cover per mantenere proporzioni
- Immagine: `/images/1.jpeg`

**Utilizzo**:
Mostra visivamente le strutture dell'academy per creare impatto visivo immediato.

---

### 5. **ImageWithTextSection**
`@/components/landing/ImageWithTextSection`

**Posizione**: Dopo ImageOnlySection  
**Descrizione**: Sezione con immagine di sfondo e testo sovrapposto

**Contenuto**:
- **Tag**: "Benvenuto"
- **Titolo**: "La tua tennis Academy"
- **Descrizione**: Messaggio di benvenuto
- Immagine: `/images/2.jpeg`
- Overlay scuro (bg-black/50) per leggibilità testo

**Altezza**: 250px → 300px → 350px (responsive)

---

### 6. **ServicesSection**
`@/components/landing/ServicesSection`

**Posizione**: Centro pagina  
**Descrizione**: Griglia servizi principali dell'academy

**Servizi Mostrati**:

1. **Affitto Campi**
   - Icona: Campo tennis SVG custom
   - Descrizione: Campi terra rossa e cemento

2. **Tornei e Sfide**
   - Icona: Trofeo SVG custom
   - Descrizione: Tornei e campionati

3. **Coaching e Scuola Tennis**
   - Icona: GraduationCap (Lucide)
   - Descrizione: Lezioni private e corsi gruppo

**Layout**:
- Grid 3 colonne su desktop
- 1 colonna su mobile
- Card centrate con icone grandi (64px)
- Typography: Title 4xl/5xl bold

---

### 7. **TournamentsSection**
`@/components/landing/TournamentsSection`

**Posizione**: Dopo Servizi  
**Descrizione**: Sezione tornei in evidenza

**Features**:
- Carica tornei upcoming via API (`/api/tournaments?upcoming=true`)
- Fallback a tornei default se API non disponibile
- Filtra tornei validi (titolo > 10 char, descrizione > 20 char)
- Card design con badge tipo torneo
- Mostra max 2 tornei in evidenza
- CTA "Vedi tutti i tornei" → `/tornei`

**Dati Mostrati per Torneo**:
- Tipo torneo (badge colorato)
- Titolo
- Data inizio (formato italiano)
- Descrizione
- Numero max partecipanti
- Link "Scopri di più" → `/tornei/[id]`

**Tornei Default**:
```typescript
1. Torneo Sociale di Primavera 2026
   - Tipo: Eliminazione diretta
   - Data: 5 Aprile 2026
   
2. Campionato Invernale a Squadre
   - Tipo: Girone + Eliminazione
   - Data: 15 Febbraio 2026
```

---

### 8. **StaffSection**
`@/components/landing/StaffSection`

**Posizione**: Dopo Tornei  
**Descrizione**: Team di maestri e staff

**Features**:
- Carica staff da database (`staff` table)
- Filtro solo staff attivi (`active = true`)
- Ordinamento per `order_index`
- Fallback a staff default (6 maestri)
- Grid 3 colonne su desktop, 2 su tablet, 1 su mobile
- Avatar circolari con immagini staff
- Nome, ruolo e bio per ogni membro

**Staff Default**:
1. Marco Rossi - Maestro FIT
2. Giulia Bianchi - Istruttrice PTR
3. Andrea Moretti - Maestro FIT
4. Francesca Gallo - Istruttrice PTR
5. Luca Ferrari - Maestro FIT
6. Valentina Conti - Istruttrice PTR

**Design**:
- Card con hover effect
- Avatar 80px su mobile, 96px su desktop
- Typography: Nome bold, ruolo regular, bio smaller

---

### 9. **NewsSection**
`@/components/landing/NewsSection`

**Posizione**: Dopo Staff  
**Descrizione**: Ultime news pubblicate

**Features**:
- Carica ultime 3 news via Supabase
- Solo news pubblicate (`is_published = true`)
- Ordinamento per `published_at` desc
- Fallback a news default
- Mostra timestamp relativo (es. "3 giorni fa")
- Card con badge categoria
- CTA "Leggi tutte le news" → `/news`

**Dati Mostrati per News**:
- Badge categoria (colorato per tipo)
- Titolo
- Excerpt/contenuto breve
- Timestamp relativo
- Link "Leggi di più" → `/news/[id]`

**News Default**:
1. Campionato invernale, i vincitori della settimana
2. Nuovi orari estivi a partire da lunedì
3. Iscrizioni aperte per i corsi estivi per bambini

---

### 10. **CTASection**
`@/components/landing/CTASection`

**Posizione**: Fine pagina  
**Descrizione**: Call-to-action finale con immagine hero

**Contenuto**:
- **Titolo**: "Inizia la tua partita oggi"
- **Descrizione**: CTA per registrazione
- **Buttons**:
  - "Scarica" → `/register`
  - "Prova gratis" → `/bookings`
- **Immagine footer**: `/images/3.jpeg` (full-width)

**Layout**:
- Sezione CTA centrata
- 2 button side-by-side su desktop
- Stacked su mobile
- Immagine full-width 500px → 600px → 700px

---

## 🎨 Design System

### Colori
```css
--secondary: Colore tema principale (usato per testi e backgrounds)
--primary: Colore hover/accent
--frozen-*: Palette per promo banner
```

### Typography
- **Hero**: text-7xl → text-[10rem] (ultra large)
- **Section Titles**: text-4xl → text-5xl
- **Body**: text-base → text-lg
- **Small**: text-sm

### Spacing
- **Sections**: py-16 sm:py-20 (vertical padding)
- **Container**: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

### Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

---

## ♿ Accessibilità

### Features Implementate

1. **Skip Link**
   ```html
   <a href="#main-content" className="sr-only focus:not-sr-only">
     Vai al contenuto
   </a>
   ```
   - Screen reader only di default
   - Visibile al focus tastiera
   - Salta direttamente al contenuto principale

2. **Semantic HTML**
   - Uso corretto di `<section>`, `<nav>`, `<main>`
   - Heading hierarchy (h1 → h2 → h3)

3. **Alt Text**
   - Tutte le immagini hanno alt text descrittivo

4. **Focus States**
   - Tutti i link e button hanno visible focus indicators
   - Keyboard navigation completa

5. **ARIA Labels**
   - Icon buttons hanno aria-label
   - Menu mobile ha aria-expanded

---

## 🚀 Performance

### Ottimizzazioni

1. **Image Optimization**
   - Next.js Image component per immagini staff/news
   - Lazy loading automatico
   - Responsive images

2. **Code Splitting**
   - Componenti caricati solo quando necessari
   - Dynamic imports per sezioni complesse

3. **Data Fetching**
   - Client-side fetch per dati dinamici (tornei, news, staff)
   - Fallback a dati statici per performance
   - No blocking SSR

4. **CSS**
   - Tailwind JIT per CSS minimo
   - No unused styles

---

## 🔧 Configurazione

### Modificare Contenuti

1. **Testi Hero/Sezioni**
   - Modificare direttamente nei componenti in `src/components/landing/`

2. **Immagini**
   - Sostituire file in `public/images/` (1.jpeg, 2.jpeg, 3.jpeg)
   - Mantenere stessi nomi o aggiornare riferimenti

3. **Dati Dinamici**
   - Tornei: Gestiti da database tramite `/dashboard/admin`
   - News: Gestite da CMS in `/dashboard/admin/news`
   - Staff: Gestiti in `/dashboard/admin/staff`
   - Promo Banner: Configurabile in `/dashboard/admin/promo-banner`

### Riordinare Sezioni

Modificare ordine in `src/app/page.tsx`:
```tsx
<div className="flex flex-col">
  <TextHeroSection />
  <ImageOnlySection />
  {/* Riordinare o rimuovere sezioni qui */}
</div>
```

### Aggiungere Nuove Sezioni

1. Creare nuovo componente in `src/components/landing/`
2. Importare in `src/app/page.tsx`
3. Aggiungere nel flex container

---

## 📊 Metriche

### Lighthouse Score Target
- **Performance**: > 90
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

---

## 🐛 Troubleshooting

### Immagini Non Visualizzate
- Verificare esistenza file in `public/images/`
- Controllare percorsi relativi
- Verificare permissions file system

### Tornei/News Non Caricano
- Controllare connessione Supabase
- Verificare RLS policies
- Fallback automatico a dati default attivo

### Promo Banner Non Appare
- Verificare `is_enabled` in database
- Controllare localStorage per dismissal
- Solo per utenti non autenticati

### Navbar Non Sticky
- Verificare class `sticky top-0 z-50`
- Controllare conflitti CSS parent

---

## 📝 Note Sviluppatori

### Client Components
Tutti i componenti landing sono `"use client"` perché:
- Usano hooks (useState, useEffect)
- Hanno interattività (click, hover)
- Fetching client-side per dati dinamici

### Fallback Data
Tutti i componenti con fetch hanno dati di fallback per:
- Sviluppo offline
- Performance (no blocking)
- Resilienza errori API/DB

### Testing
```bash
# Test specifici homepage
npx jest --testPathPattern="home|landing"

# Test accessibilità
npm run test:a11y
```

---

## 🔄 Changelog

### v2.0 (Gennaio 2026)
- ✅ Refactoring completo struttura modulare
- ✅ Aggiunto PromoBanner configurabile
- ✅ Migliorata accessibilità (skip links, ARIA)
- ✅ Ottimizzazioni performance
- ✅ Tornei/News/Staff da database con fallback
- ✅ Responsive design completo
- ✅ Dark overlay per ImageWithTextSection

### v1.0 (Dicembre 2025)
- Versione iniziale
- Sezioni base hero, servizi, CTA

---

## 📚 Link Utili

- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Mantenuto da**: GST Tennis Academy Team  
**Ultimo aggiornamento**: 3 Gennaio 2026
