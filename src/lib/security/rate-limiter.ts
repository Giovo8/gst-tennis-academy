// Rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  AUTH_SIGNUP: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  AUTH_PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour

  // API endpoints
  API_READ: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  API_WRITE: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  API_SEARCH: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute

  // File uploads
  FILE_UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour

  // Email sending
  EMAIL_SEND: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
} as const;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) store.delete(key);
    }
  }, 60_000);
}

/**
 * Returns a unique identifier for the client from request headers.
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0].trim() ||
    realIp ||
    cfConnectingIp ||
    "unknown"
  );
}

/**
 * Apply rate limiting to a request.
 * Uses a sliding-window in-memory store. Suitable for single-instance deployments.
 */
export async function applyRateLimit(
  identifier: string,
  limitConfig: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const { maxRequests, windowMs } = limitConfig;
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, reset: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, reset: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, reset: Math.ceil((entry.resetTime - now) / 1000) };
}

export default { getClientIdentifier, applyRateLimit, RATE_LIMITS };
