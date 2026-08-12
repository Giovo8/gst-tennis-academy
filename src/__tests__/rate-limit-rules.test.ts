import { resolveRateLimitRule } from '@/lib/security/rateLimitRules';
import { RATE_LIMITS } from '@/lib/security/rate-limiter';

describe('resolveRateLimitRule', () => {
  it('ignora le route non-API', () => {
    expect(resolveRateLimitRule('/dashboard/admin/users', 'GET')).toBeNull();
    expect(resolveRateLimitRule('/news', 'GET')).toBeNull();
  });

  it('esclude i webhook, che sono chiamate server-to-server da un solo IP', () => {
    expect(resolveRateLimitRule('/api/webhooks/resend', 'POST')).toBeNull();
  });

  it('applica il limite stretto agli endpoint di autenticazione', () => {
    expect(resolveRateLimitRule('/api/auth/login', 'POST')?.limit).toEqual(RATE_LIMITS.AUTH_LOGIN);
    expect(resolveRateLimitRule('/api/auth/signup', 'POST')?.limit).toEqual(
      RATE_LIMITS.AUTH_SIGNUP,
    );
  });

  it('limita gli upload solo sulle scritture', () => {
    expect(resolveRateLimitRule('/api/upload/news-image', 'POST')?.limit).toEqual(
      RATE_LIMITS.FILE_UPLOAD,
    );
    // Una GET sullo stesso path ricade nel limite generale di lettura.
    expect(resolveRateLimitRule('/api/upload/news-image', 'GET')?.bucket).toBe('api-read');
  });

  it('distingue lettura e scrittura per le route senza regola specifica', () => {
    const lettura = resolveRateLimitRule('/api/bookings', 'GET');
    const scrittura = resolveRateLimitRule('/api/bookings', 'POST');

    expect(lettura?.bucket).toBe('api-read');
    expect(scrittura?.bucket).toBe('api-write');
    // La scrittura deve essere più stretta della lettura.
    expect(scrittura!.limit.maxRequests).toBeLessThan(lettura!.limit.maxRequests);
  });

  it('protegge la generazione AI news, che consuma quota Gemini', () => {
    const rule = resolveRateLimitRule('/api/ai-news/genera', 'POST');
    expect(rule?.bucket).toBe('ai-news-genera');
    expect(rule!.limit.maxRequests).toBe(5);
  });

  it('assegna bucket distinti così endpoint diversi non condividono il contatore', () => {
    const auth = resolveRateLimitRule('/api/auth/login', 'POST');
    const generica = resolveRateLimitRule('/api/bookings', 'POST');

    expect(auth?.bucket).not.toBe(generica?.bucket);
  });

  it('copre ogni route API: nessun path resta senza regola', () => {
    const paths = [
      '/api/notifications',
      '/api/tornei/123',
      '/api/chat/messages',
      '/api/courts',
      '/api/security-events',
    ];

    for (const path of paths) {
      expect(resolveRateLimitRule(path, 'GET')).not.toBeNull();
      expect(resolveRateLimitRule(path, 'DELETE')).not.toBeNull();
    }
  });
});
