/**
 * Regole di rate limiting per le route API, applicate centralmente dal
 * middleware invece che route per route.
 *
 * Perché centralizzate: le route API sono 89 e ne nascono di nuove; agganciare
 * il limitatore a mano in ognuna lascerebbe scoperte quelle dimenticate e quelle
 * future. Qui una route nuova è protetta dal momento in cui esiste.
 *
 * Le route che hanno già un `applyRateLimit` interno (signup, bookings,
 * tournaments, users/search, weather) lo mantengono: sono limiti più stretti e
 * specifici, e i due livelli si sommano come difesa in profondità.
 *
 * ⚠️ Il contatore vive nella memoria del processo: su Vercel ogni istanza ha il
 * proprio, quindi il limite effettivo è per-istanza e si azzera a ogni cold
 * start. Regge un singolo client insistente, non un attacco distribuito. Per
 * quello serve un contatore condiviso (Postgres o Redis) o il WAF di Vercel.
 */

import { RATE_LIMITS } from '@/lib/security/rate-limiter';

type LimitConfig = { maxRequests: number; windowMs: number };

export interface RateLimitRule {
  /** Valutata sul pathname della richiesta. */
  pattern: RegExp;
  /** Se assente, la regola vale per qualsiasi metodo. */
  methods?: string[];
  limit: LimitConfig;
  /** Bucket separato: senza, endpoint diversi condividerebbero il contatore. */
  bucket: string;
}

/**
 * Limiti generali, più larghi di quelli specifici: una dashboard aperta da più
 * utenti dietro la stessa rete (il wifi del circolo, NAT) condivide l'IP, e un
 * limite troppo stretto bloccherebbe utenti legittimi.
 */
const GENERALE_READ: LimitConfig = { maxRequests: 300, windowMs: 60 * 1000 };
const GENERALE_WRITE: LimitConfig = { maxRequests: 60, windowMs: 60 * 1000 };

/**
 * Valutate in ordine: vince la prima che combacia. Le più specifiche prima.
 */
export const RATE_LIMIT_RULES: RateLimitRule[] = [
  // --- Autenticazione: il bersaglio classico del credential stuffing ---
  {
    pattern: /^\/api\/auth\/(login|signin)/,
    limit: RATE_LIMITS.AUTH_LOGIN,
    bucket: 'auth-login',
  },
  {
    pattern: /^\/api\/auth\/signup/,
    limit: RATE_LIMITS.AUTH_SIGNUP,
    bucket: 'auth-signup',
  },
  {
    pattern: /^\/api\/auth\/(reset|password|recover)/,
    limit: RATE_LIMITS.AUTH_PASSWORD_RESET,
    bucket: 'auth-password',
  },

  // --- Upload: costano storage e CPU (sharp), vanno tenuti stretti ---
  {
    pattern: /^\/api\/(upload|messages\/upload)/,
    methods: ['POST', 'PUT', 'PATCH'],
    limit: RATE_LIMITS.FILE_UPLOAD,
    bucket: 'upload',
  },

  // --- Invio email: ogni chiamata consuma quota Resend ---
  {
    pattern: /^\/api\/(email|newsletter|contact|lavora-con-noi)/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    limit: RATE_LIMITS.EMAIL_SEND,
    bucket: 'email',
  },

  // --- Ricerca: query costose sul DB ---
  {
    pattern: /^\/api\/.*\/?(search|cerca)/,
    limit: RATE_LIMITS.API_SEARCH,
    bucket: 'search',
  },

  // --- Generazione AI news: ogni run consuma quota Gemini ---
  {
    pattern: /^\/api\/ai-news\/(genera|cron\/[^/]+\/esegui)/,
    methods: ['POST'],
    limit: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
    bucket: 'ai-news-genera',
  },

  // --- Default per tutto il resto di /api ---
  {
    pattern: /^\/api\//,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    limit: GENERALE_WRITE,
    bucket: 'api-write',
  },
  {
    pattern: /^\/api\//,
    limit: GENERALE_READ,
    bucket: 'api-read',
  },
];

/**
 * I webhook sono chiamate server-to-server da servizi esterni: limitarli per IP
 * bloccherebbe integrazioni legittime che arrivano tutte dallo stesso indirizzo.
 */
const ESCLUSI = [/^\/api\/webhooks\//];

export function resolveRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (!pathname.startsWith('/api/')) return null;
  if (ESCLUSI.some((pattern) => pattern.test(pathname))) return null;

  return (
    RATE_LIMIT_RULES.find(
      (rule) => rule.pattern.test(pathname) && (!rule.methods || rule.methods.includes(method)),
    ) ?? null
  );
}
