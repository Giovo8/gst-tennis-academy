# 🔐 GUIDA ALLA SICUREZZA E REFACTORING

## 📋 Sommario dei Problemi Risolti

Questa guida documenta i problemi di sicurezza critici identificati e le soluzioni implementate nel refactoring completo dell'applicazione GST Tennis Academy.

---

## 🚨 PROBLEMI CRITICI IDENTIFICATI

### 1. **SQL Injection (OWASP A03:2021)**

**Problema**: Input utente non sanitizzato usato direttamente nelle query SQL.

```typescript
// ❌ VULNERABILE
.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
```

**Soluzione**: Sanitizzazione input con escape dei caratteri speciali SQL.

```typescript
// ✅ SICURO
import { sanitizeSearchQuery } from '@/lib/security/sanitize';
const sanitized = sanitizeSearchQuery(query);
.or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
```

### 2. **XSS - Cross-Site Scripting (OWASP A07:2021)**

**Problema**: Utilizzo di `dangerouslySetInnerHTML` senza sanitizzazione.

**Soluzione**: Sanitizzazione HTML con DOMPurify prima del rendering.

```typescript
// ✅ SICURO
import { sanitizeHtml } from '@/lib/security/sanitize';
const cleanHtml = sanitizeHtml(userContent);
<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
```

### 3. **Weak Password Policy (OWASP A07:2021)**

**Problema**: Password minima di 6 caratteri, nessun requisito di complessità.

**Soluzione**: Password policy robusta con Zod validation.

```typescript
// ✅ PASSWORD SICURA
passwordSchema = z.string()
  .min(8, 'Minimo 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una maiuscola')
  .regex(/[a-z]/, 'Almeno una minuscola')
  .regex(/[0-9]/, 'Almeno un numero')
  .regex(/[^A-Za-z0-9]/, 'Almeno un carattere speciale')
```

### 4. **Mancanza di Rate Limiting (OWASP A04:2021)**

**Problema**: Nessuna protezione contro brute force o DoS.

**Soluzione**: Implementato rate limiter con limiti differenziati per endpoint.

```typescript
// ✅ RATE LIMITING
const rateLimit = applyRateLimit(clientId, RATE_LIMITS.AUTH_LOGIN);
if (!rateLimit.allowed) {
  return NextResponse.json(
    { error: 'Troppe richieste' },
    { status: 429 }
  );
}
```

### 5. **Esposizione di Informazioni Sensibili (OWASP A05:2021)**

**Problema**: Console.log/error in produzione, errori dettagliati esposti all'utente.

**Soluzione**: Logger strutturato con redazione automatica di dati sensibili.

```typescript
// ✅ LOGGING SICURO
logger.error('Database error', error, { userId });
// Password, token, etc. vengono automaticamente redatti
```

### 6. **Hardcoded Secrets & Magic Numbers**

**Problema**: Stringhe e numeri ripetuti ovunque nel codice.

**Soluzione**: Costanti centralizzate in `@/lib/constants/app.ts`.

```typescript
// ✅ COSTANTI CENTRALIZZATE
import { USER_ROLES, HTTP_STATUS, TIME_CONSTANTS } from '@/lib/constants/app';

if (role === USER_ROLES.ADMIN) { ... }
return NextResponse.json(error, { status: HTTP_STATUS.UNAUTHORIZED });
```

### 7. **Validazione Input Insufficiente**

**Problema**: Validazione manuale inconsistente, facilmente bypassabile.

**Soluzione**: Validazione con Zod schemas type-safe.

```typescript
// ✅ VALIDAZIONE ROBUSTA
import { signupSchema } from '@/lib/validation/schemas';
const result = signupSchema.safeParse(body);
if (!result.success) {
  return errors;
}
```

---

## ✅ FILE CREATI

### 1. **Costanti Centralizzate**
- `src/lib/constants/app.ts` - Tutti i valori hardcoded ora sono costanti

### 2. **Validazione & Sanitizzazione**
- `src/lib/validation/schemas.ts` - Schemi Zod per validazione type-safe
- `src/lib/security/sanitize.ts` - Funzioni di sanitizzazione input

### 3. **Sicurezza**
- `src/lib/security/rate-limiter.ts` - Protezione contro brute force e DoS
- `src/lib/logger/secure-logger.ts` - Logging strutturato con redazione automatica

### 4. **Configurazione**
- `src/lib/config/env.ts` - Gestione type-safe delle variabili d'ambiente
- `.env.example` - Template per configurazione

---

## 📦 DIPENDENZE NECESSARIE

Aggiungi queste dipendenze al progetto:

```bash
npm install zod isomorphic-dompurify
```

**Zod**: Validazione schema type-safe  
**isomorphic-dompurify**: Sanitizzazione HTML (funziona sia client che server)

---

## 🔧 FILE REFACTORED

### File Critici Aggiornati:

1. ✅ `src/app/api/users/search/route.ts` - SQL injection fix, rate limiting
2. ✅ `src/app/api/auth/signup/route.ts` - Password policy, validazione input
3. ✅ `src/lib/supabase/serverClient.ts` - Validazione env vars obbligatoria
4. ✅ `src/lib/email/client.ts` - Rimozione placeholder insicuri

### File da Aggiornare Manualmente:

I seguenti file richiedono refactoring simile (seguire il pattern implementato):

- `src/app/api/bookings/route.ts` - Validazione input, rate limiting
- `src/app/api/tournaments/route.ts` - Validazione input, gestione errori
- `src/app/api/tournaments/[id]/*` - Tutti gli endpoint tornei
- `src/app/dashboard/admin/news/create/page.tsx` - Sanitizzazione XSS
- `src/app/news/[id]/page.tsx` - Sanitizzazione XSS

---

## 🔐 CONFIGURAZIONE .env

### Setup Iniziale:

1. Copia `.env.example` in `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Compila **TUTTE** le variabili obbligatorie:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_REPLY_TO`

3. **IMPORTANTE**: Non usare mai placeholder o valori fake in produzione!

### Variabili Critiche:

```env
# ⚠️ ATTENZIONE: Queste chiavi NON devono MAI essere esposte al client
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your_api_key

# ✅ Queste possono essere esposte (sono pubbliche)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

---

## 🛡️ CHECKLIST DI SICUREZZA

### Prima di Andare in Produzione:

- [ ] Tutte le variabili `.env.local` sono configurate correttamente
- [ ] Nessun `console.log` rimasto nel codice (usa `logger`)
- [ ] Tutti gli endpoint API hanno rate limiting
- [ ] Tutti gli input utente sono validati con Zod
- [ ] Tutti gli input utente sono sanitizzati
- [ ] Password policy minimo 8 caratteri con complessità
- [ ] Errori generici restituiti all'utente (no stack trace)
- [ ] HTTPS abilitato (Vercel lo fa automaticamente)
- [ ] CORS configurato correttamente
- [ ] File `.env.local` è nel `.gitignore`
- [ ] Service role key NON è esposta al client
- [ ] Audit di sicurezza eseguito

### Test di Sicurezza:

```bash
# Test validazione input
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak"}'
# Deve restituire errore validazione

# Test rate limiting
for i in {1..10}; do
  curl http://localhost:3000/api/users/search?q=test
done
# Dopo alcuni tentativi deve restituire 429

# Test SQL injection
curl "http://localhost:3000/api/users/search?q=%27OR%201=1--"
# Non deve causare errori o leak di dati
```

---

## 📚 PATTERN DA SEGUIRE

### Pattern API Route Sicuro:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { yourSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/security/sanitize';
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '@/lib/security/rate-limiter';
import logger from '@/lib/logger/secure-logger';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/app';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = applyRateLimit(clientId, RATE_LIMITS.API_WRITE);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    // 2. Authentication (se necessario)
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // 3. Parse & sanitize input
    const rawBody = await request.json();
    const sanitized = sanitizeObject(rawBody);

    // 4. Validate with Zod
    const result = yourSchema.safeParse(sanitized);
    if (!result.success) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT, details: result.error.errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 5. Business logic
    const data = result.data;
    // ... esegui operazioni ...

    // 6. Return success
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/your-route', HTTP_STATUS.OK, duration);
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    // 7. Error handling
    logger.error('API error', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
```

---

## 🎯 PROSSIMI PASSI

### Immediati (Critici):

1. **Installare dipendenze**:
   ```bash
   npm install zod isomorphic-dompurify
   ```

2. **Configurare .env.local** con tutti i valori richiesti

3. **Refactorare file rimanenti** seguendo i pattern implementati

4. **Sostituire tutti i `console.log`** con `logger`

5. **Testare gli endpoint** con i nuovi controlli di sicurezza

### A Medio Termine:

1. Implementare CSRF protection
2. Aggiungere Content Security Policy (CSP)
3. Implementare 2FA per admin
4. Audit log completo di tutte le azioni sensibili
5. Backup automatici del database
6. Monitoring con Sentry o simili
7. Penetration testing

### Best Practices Ongoing:

- Code review obbligatorio per modifiche alla sicurezza
- Dependency audit regolare (`npm audit`)
- Update regolari delle dipendenze
- Training sicurezza per tutti gli sviluppatori

---

## 📞 SUPPORTO

Per domande o problemi relativi alla sicurezza:
1. Consulta questa documentazione
2. Verifica i file di esempio implementati
3. Segui i pattern stabiliti
4. In caso di dubbi, priorità sempre alla sicurezza

---

**Data Audit**: 31 Gennaio 2026  
**Versione**: 1.0.0  
**Status**: ✅ Implementazione iniziale completata
