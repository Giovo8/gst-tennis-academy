/**
 * Registrazione degli eventi di sicurezza su `security_events`.
 *
 * Vengono registrate solo le anomalie (accessi negati, blocchi CSRF, rate limit
 * superati), non il traffico normale: su un DB Supabase free un log per ogni
 * richiesta farebbe di un attacco volumetrico anche un problema di quota.
 *
 * L'inserimento passa dall'API REST di Supabase invece che dal client
 * `@supabase/supabase-js` perché questo modulo viene importato anche da
 * `src/middleware.ts`, che gira su runtime Edge: `fetch` è disponibile ovunque,
 * l'SDK andrebbe incluso nel bundle del middleware.
 *
 * La scrittura non deve mai far fallire la richiesta che la origina: ogni errore
 * viene inghiottito e loggato, con un timeout per non allungare la risposta se
 * il database non risponde.
 */

import logger from '@/lib/logger/secure-logger';

export type SecurityEventType =
  /** Chiamata a route protetta senza header Authorization. */
  | 'auth.token_mancante'
  /** Token Bearer presente ma rifiutato da Supabase. */
  | 'auth.token_non_valido'
  /** Utente autenticato ma con ruolo non abilitato alla route. */
  | 'auth.ruolo_insufficiente'
  /** Nessuna sessione valida sulle route che usano i cookie. */
  | 'auth.sessione_assente'
  /** Mutazione API con header Origin fuori whitelist (vedi middleware). */
  | 'csrf.origin_rifiutata'
  /** Limite di richieste superato per un identificativo client. */
  | 'rate_limit.superato';

type Severita = 'info' | 'warning' | 'critical';

/** Severità di default per tipo: alza solo ciò che merita attenzione immediata. */
const SEVERITA_DEFAULT: Record<SecurityEventType, Severita> = {
  'auth.token_mancante': 'info',
  'auth.token_non_valido': 'warning',
  'auth.ruolo_insufficiente': 'critical',
  'auth.sessione_assente': 'info',
  'csrf.origin_rifiutata': 'critical',
  'rate_limit.superato': 'warning',
};

export interface SecurityEventParams {
  tipo: SecurityEventType;
  /** Da cui si ricavano path, metodo, IP e user agent. */
  request?: Request;
  statusCode?: number;
  severita?: Severita;
  userId?: string | null;
  /** Da passare quando l'IP è già noto e `request` non è disponibile. */
  ipAddress?: string | null;
  dettagli?: Record<string, unknown>;
}

/**
 * Estrae l'IP del client dagli header di proxy. Su Vercel `x-forwarded-for`
 * contiene la catena completa: il primo elemento è il client originale.
 */
export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || null;
}

/** Lo user agent finisce in un DB e in una tabella HTML: va troncato. */
const MAX_USER_AGENT = 300;

export async function logSecurityEvent({
  tipo,
  request,
  statusCode,
  severita,
  userId,
  ipAddress,
  dettagli,
}: SecurityEventParams): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Senza credenziali (es. build o ambiente di test) l'evento viene perso in
  // silenzio: è preferibile a un errore in un percorso già degradato.
  if (!supabaseUrl || !serviceRoleKey) return;

  let path: string | null = null;
  let method: string | null = null;
  let userAgent: string | null = null;

  if (request) {
    try {
      path = new URL(request.url).pathname;
    } catch {
      path = null;
    }
    method = request.method;
    userAgent = request.headers.get('user-agent')?.slice(0, MAX_USER_AGENT) ?? null;
  }

  const row = {
    tipo,
    severita: severita ?? SEVERITA_DEFAULT[tipo] ?? 'warning',
    path,
    method,
    status_code: statusCode ?? null,
    ip_address: ipAddress ?? (request ? getClientIp(request) : null),
    user_agent: userAgent,
    user_id: userId ?? null,
    dettagli: dettagli ?? null,
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/security_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        // Senza rappresentazione di ritorno: non serve e riduce il payload.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      logger.warn('Scrittura security_events fallita', {
        status: response.status,
        tipo,
      });
    }
  } catch (error) {
    logger.warn('Eccezione durante la scrittura di security_events', {
      tipo,
      error: error instanceof Error ? error.message : 'errore sconosciuto',
    });
  }
}
