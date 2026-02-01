/**
 * Rate limiting implementation
 * Protects against brute force and DoS attacks
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param maxRequests - Maximum requests allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns true if rate limited, false if allowed
   */
  public isRateLimited(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return false;
    }

    if (entry.count >= maxRequests) {
      return true;
    }

    entry.count++;
    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  public getRemainingRequests(
    identifier: string,
    maxRequests: number
  ): number {
    const entry = this.store.get(identifier);
    if (!entry) return maxRequests;
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get time until reset in seconds
   */
  public getResetTime(identifier: string): number {
    const entry = this.store.get(identifier);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000));
  }

  /**
   * Manually reset rate limit for identifier
   */
  public reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear cleanup interval
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

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

/**
 * Helper function to get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  return (
    forwardedFor?.split(',')[0].trim() ||
    realIp ||
    cfConnectingIp ||
    'unknown'
  );
}

/**
 * Apply rate limiting to request
 */
export function applyRateLimit(
  identifier: string,
  limitConfig: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]
): {
  allowed: boolean;
  remaining: number;
  reset: number;
} {
  const { maxRequests, windowMs } = limitConfig;
  const isLimited = rateLimiter.isRateLimited(identifier, maxRequests, windowMs);
  
  return {
    allowed: !isLimited,
    remaining: rateLimiter.getRemainingRequests(identifier, maxRequests),
    reset: rateLimiter.getResetTime(identifier),
  };
}

export default rateLimiter;
