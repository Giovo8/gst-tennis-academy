# Analisi Gerarchia Ruoli e Permessi

## 📊 Gerarchia Ruoli

```
┌─────────────────────────────────────┐
│         ADMIN / GESTORE             │  ← Massimi permessi
│  (Stesso dashboard /dashboard/admin)│
└──────────────┬──────────────────────┘
               │
         ┌─────▼──────┐
         │  MAESTRO   │  ← Permessi intermedi
         └─────┬──────┘
               │
         ┌─────▼──────┐
         │   ATLETA   │  ← Permessi base
         └────────────┘
```

## 🔑 Definizioni Ruoli (src/lib/roles.ts)

```typescript
type UserRole = "atleta" | "maestro" | "gestore" | "admin"

roleDestinations:
- atleta  → /dashboard/atleta
- maestro → /dashboard/maestro
- gestore → /dashboard/admin  ← Stesso di admin
- admin   → /dashboard/admin

Funzioni permessi:
- isAdmin(role): admin OR gestore
- isCoach(role): maestro OR admin OR gestore
- canManageUsers(role): admin OR gestore
```

## 📋 Navigazione per Ruolo

### ADMIN / GESTORE (12 voci)
```
1. Dashboard              → /dashboard/admin
2. Prenotazioni          → /dashboard/admin/bookings
3. Competizioni          → /dashboard/admin/tornei
4. Arena                 → /dashboard/admin/arena
5. Utenti                → /dashboard/admin/users
6. Video Lezioni         → /dashboard/admin/video-lessons
7. Chat                  → /dashboard/admin/chat
8. Mail Marketing        → /dashboard/admin/mail-marketing
9. News                  → /dashboard/admin/news
10. Annunci              → /dashboard/admin/announcements
11. Staff                → /dashboard/admin/staff
12. Profilo (implicito)  → /dashboard/admin/profile
```

**Primary NavItems (4 voci in alto):**
- Dashboard, Prenotazioni, Competizioni, Arena

**Features Uniche:**
- ✅ Gestione utenti completa
- ✅ Mail marketing
- ✅ Gestione staff
- ✅ Gestione news
- ✅ Creazione/modifica tornei
- ✅ Conferma prenotazioni
- ✅ Blocco campi
- ✅ Codici invito

### MAESTRO (9 voci)
```
1. Dashboard             → /dashboard/maestro
2. Arena                 → /dashboard/maestro/arena
3. Agenda                → /dashboard/maestro/agenda
4. Prenotazioni          → /dashboard/maestro/bookings
5. Competizioni          → /dashboard/maestro/tornei
6. Video Lab             → /dashboard/maestro/video-lab
7. Chat                  → /dashboard/maestro/mail
8. Annunci               → /dashboard/maestro/annunci
9. Messaggi              → /dashboard/maestro/messages
10. Profilo              → /dashboard/maestro/profile
```

**Features Uniche:**
- ✅ Video Lab (upload video lezioni)
- ✅ Agenda personale
- ✅ Arena sfide coach
- ⚠️ Prenotazioni (solo visualizzazione/creazione, non conferma)
- ⚠️ Tornei (visualizzazione, no creazione)

**Limitazioni vs Admin:**
- ❌ NO gestione utenti
- ❌ NO mail marketing
- ❌ NO gestione staff
- ❌ NO creazione news
- ❌ NO conferma prenotazioni
- ❌ NO blocco campi

### ATLETA (9 voci)
```
1. Dashboard             → /dashboard/atleta
2. Prenotazioni          → /dashboard/atleta/bookings (+ badge pending)
3. Tornei                → /dashboard/atleta/tornei
4. Arena                 → /dashboard/atleta/arena
5. Chat                  → /dashboard/atleta/mail (+ badge unread)
6. I Miei Video          → /dashboard/atleta/videos
7. Annunci               → /dashboard/atleta/annunci (+ badge unread)
8. Abbonamento           → /dashboard/atleta/subscription
9. Profilo               → /dashboard/atleta/profile
```

**Features Uniche:**
- ✅ Abbonamento (gestione proprio abbonamento)
- ✅ Badge notifiche (prenotazioni pending, messaggi non letti, annunci non letti)
- ✅ I Miei Video (visualizzazione video personali)

**Limitazioni vs Maestro:**
- ❌ NO agenda
- ❌ NO video lab (upload)
- ❌ NO messaggi diretti (solo chat)

**Limitazioni vs Admin:**
- ❌ NO gestione utenti
- ❌ NO creazione tornei
- ❌ NO conferma prenotazioni
- ❌ NO gestione staff/news
- ❌ NO mail marketing

## 🎨 Differenze Styling Attuali

### Tutti usano `DashboardShell` ma:

**AdminLayout:**
```typescript
- Loading spinner: border-cyan-500
- primaryNavItems: prime 4 voci
- No avatar
- No badge notifications
```

**CoachLayout:**
```typescript
- Loading spinner: border-cyan-500
- No primaryNavItems
- No avatar
- No badge notifications
```

**AthleteLayout:**
```typescript
- Loading spinner: border-frozen-500  ← DIVERSO!
- No primaryNavItems
- HAS avatar (userAvatar)
- HAS badge notifications (3 tipi)
- Event listeners per real-time badges
```

## 🔒 Logiche di Accesso

### Route Protection
Ogni layout verifica:
1. User autenticato
2. Ruolo corretto nel profilo
3. Redirect a /login se fallisce

### Permission Checks nei Componenti
```typescript
// Comune pattern:
if (!isAdmin(role)) {
  return <AccessDenied />
}

// Nei modali/azioni:
if (role === 'admin' || role === 'gestore') {
  // Mostra pulsante conferma
}
```

### API Route Protection
```typescript
// Pattern comune in API routes:
const { user, profile } = await getUserProfile()

if (!profile || !['admin', 'gestore'].includes(profile.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## 📊 Matrice Permessi Funzionalità

| Funzionalità | Atleta | Maestro | Admin/Gestore |
|--------------|--------|---------|---------------|
| **Prenotazioni** |
| - Creare | ✅ | ✅ | ✅ |
| - Modificare proprie | ✅ | ✅ | ✅ |
| - Confermare | ❌ | ❌ | ✅ |
| - Cancellare proprie | ✅ | ✅ | ✅ |
| - Bloccare campi | ❌ | ❌ | ✅ |
| **Tornei** |
| - Visualizzare | ✅ | ✅ | ✅ |
| - Iscriversi | ✅ | ✅ | ✅ |
| - Creare | ❌ | ❌ | ✅ |
| - Modificare | ❌ | ❌ | ✅ |
| - Gestire bracket | ❌ | ❌ | ✅ |
| **Arena** |
| - Partecipare | ✅ | ✅ | ✅ |
| - Sfidare | ✅ | ✅ | ✅ |
| - Vedere ranking | ✅ | ✅ | ✅ |
| **Video** |
| - Visualizzare propri | ✅ | ✅ | ✅ |
| - Upload lezioni | ❌ | ✅ | ✅ |
| - Gestire tutti | ❌ | ❌ | ✅ |
| **Utenti** |
| - Vedere profilo proprio | ✅ | ✅ | ✅ |
| - Vedere lista utenti | ❌ | ❌ | ✅ |
| - Modificare utenti | ❌ | ❌ | ✅ |
| - Codici invito | ❌ | ❌ | ✅ |
| **Comunicazioni** |
| - Chat 1:1 | ✅ | ✅ | ✅ |
| - Vedere annunci | ✅ | ✅ | ✅ |
| - Creare annunci | ❌ | ⚠️ | ✅ |
| - Mail marketing | ❌ | ❌ | ✅ |
| **Gestione** |
| - Staff | ❌ | ❌ | ✅ |
| - News | ❌ | ❌ | ✅ |
| - Statistiche globali | ❌ | ❌ | ✅ |

## 🎯 Raccomandazioni per Unificazione Stile

### ✅ Da Mantenere Differente per Ruolo:
1. **NavItems specifici** - Ogni ruolo ha pagine diverse
2. **Badge notifications** - Solo atleta ha questo sistema
3. **Primary section** - Solo admin ha sezione primaria
4. **Avatar** - Atleta mostra avatar, altri no (da uniformare?)

### ✅ Da Uniformare:
1. **Loading spinner color** - Usare stesso colore per tutti (secondary)
2. **Layout structure** - Già unificato con DashboardShell ✓
3. **Colori sidebar/navbar** - Stesso design system
4. **Spacing e padding** - Uniformare margini/padding
5. **Font sizes** - Stessa tipografia
6. **Hover states** - Stessi effetti hover
7. **Active states** - Stesso stile per voce attiva

### ⚠️ Da Valutare:
1. **Badge system** - Estendere a maestro/admin?
2. **Avatar display** - Mostrare per tutti i ruoli?
3. **Event listeners** - Centralizzare logica real-time?

## 🚧 Problemi Attuali

1. **Spinner color inconsistent**: atleta usa `border-frozen-500`, altri `border-cyan-500`
2. **Avatar solo per atleta**: Admin/Coach non mostrano avatar nella sidebar
3. **Badge logic duplicata**: AthleteLayout ha logica badge complessa da solo
4. **No primaryNavItems** per maestro/atleta: Potrebbero beneficiare della sezione primaria
5. **Event listeners solo atleta**: Sistema notifiche real-time solo per atleta

## 📝 Note Implementative

### Shared Component Structure
Tutti e 3 i layout usano **DashboardShell** che fornisce:
- Sidebar collapsible
- Search modal
- User profile section
- Logout button
- Dark mode toggle (presente ma non implementato)
- Notification dropdown

### Loading States
Pattern comune:
```typescript
if (loading) {
  return <LoadingSpinner />
}

return <DashboardShell>{children}</DashboardShell>
```

### Role Verification
Pattern comune a tutti:
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("full_name, role")
  .eq("id", user.id)
  .single();

if (!profile || profile.role !== expectedRole) {
  router.push("/login");
}
```
