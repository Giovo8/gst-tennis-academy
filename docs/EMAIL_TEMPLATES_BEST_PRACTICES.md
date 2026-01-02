# Email Templates - Best Practices

## Utilizzo delle Costanti

I template email devono utilizzare le costanti definite in `src/lib/email/constants.ts` per garantire consistenza visiva.

### Import delle Costanti

```typescript
import { EMAIL_COLORS, EMAIL_FONTS, EMAIL_GRADIENTS } from '../constants';
```

### Esempi di Utilizzo

#### Colori
```typescript
// ❌ NON FARE
style="color: #1e40af"

// ✅ FARE
style="color: ${EMAIL_COLORS.primary}"
```

#### Font
```typescript
// ❌ NON FARE  
font-family: Arial, sans-serif

// ✅ FARE
font-family: ${EMAIL_FONTS.system}
```

#### Gradienti
```typescript
// ❌ NON FARE
background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)

// ✅ FARE
background: ${EMAIL_GRADIENTS.primary}
```

## Colori Disponibili

### Brand Colors
- `EMAIL_COLORS.primary` - Colore principale brand (#1e40af)
- `EMAIL_COLORS.primaryHover` - Hover state (#2563eb)
- `EMAIL_COLORS.primaryDark` - Variante scura (#1e3a8a)
- `EMAIL_COLORS.primaryLight` - Variante chiara (#3b82f6)

### Status Colors
- `EMAIL_COLORS.success` - Verde successo (#10b981)
- `EMAIL_COLORS.warning` - Giallo warning (#f59e0b)
- `EMAIL_COLORS.error` - Rosso errore (#ef4444)
- `EMAIL_COLORS.info` - Blu info (#3b82f6)

### Priority Colors (Notifiche)
- `EMAIL_COLORS.urgent` - Urgente (#dc2626)
- `EMAIL_COLORS.high` - Alta (#ea580c)
- `EMAIL_COLORS.medium` - Media (#3b82f6)
- `EMAIL_COLORS.low` - Bassa (#64748b)

## Migrazione dei Template Esistenti

Per migliorare i template esistenti:

1. Sostituire tutti i colori hex hardcoded con `EMAIL_COLORS.*`
2. Sostituire font-family inline con `EMAIL_FONTS.system`
3. Utilizzare `EMAIL_SHADOWS.*` per le ombre
4. Utilizzare `EMAIL_BORDER_RADIUS.*` per i bordi arrotondati

### Esempio di Migrazione

```typescript
// PRIMA
const template = `
  <div style="background-color: #1e40af; color: #ffffff;">
    <h1 style="color: #333333;">Titolo</h1>
  </div>
`;

// DOPO
import { EMAIL_COLORS } from '../constants';

const template = `
  <div style="background-color: ${EMAIL_COLORS.primary}; color: ${EMAIL_COLORS.textWhite};">
    <h1 style="color: ${EMAIL_COLORS.text};">Titolo</h1>
  </div>
`;
```

## Testing

Testare sempre le email su:
- Gmail (web, mobile)
- Outlook (desktop, web)
- Apple Mail
- Mobile devices (iOS, Android)

## Note Tecniche

- Le email HTML non supportano CSS moderno (no variables, no flexbox complesso)
- Usare sempre stili inline
- Testare su client email principali
- Mantenere larghezza massima 600px
- Utilizzare tabelle per layout complessi
