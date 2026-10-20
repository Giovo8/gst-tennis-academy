import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logSecurityEvent, getClientIp } from '@/lib/security/securityEvents';
import { applyRateLimit } from '@/lib/security/rate-limiter';
import { resolveRateLimitRule } from '@/lib/security/rateLimitRules';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // --- Protezione CSRF per richieste state-changing verso API route ---
  // Si applica solo quando l'header Origin è presente (richieste browser con cookie).
  // Le chiamate server-to-server (webhook, integrazioni) non inviano Origin e vengono lasciate passare.
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isApiRoute = pathname.startsWith('/api/');
  const isWebhook = pathname.startsWith('/api/webhooks/');

  if (isMutating && isApiRoute && !isWebhook) {
    const origin = request.headers.get('origin');
    if (origin) {
      const host = request.headers.get('host');
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const allowed = [
        host ? `https://${host}` : null,
        host ? `http://${host}` : null,
        siteUrl ?? null,
      ].filter(Boolean) as string[];

      if (!allowed.some((a) => origin === a)) {
        // Attesa volutamente: capita solo su richiesta già bloccata, quindi la
        // latenza aggiunta non tocca il traffico legittimo.
        await logSecurityEvent({
          tipo: 'csrf.origin_rifiutata',
          request,
          statusCode: 403,
          dettagli: { origin },
        });
        return NextResponse.json({ error: 'Richiesta non autorizzata (CSRF)' }, { status: 403 });
      }
    }
  }
  // --- Fine protezione CSRF ---

  // --- Rate limiting su tutte le route API ---
  // Applicato qui e non nelle singole route: sono 89 e ne nascono di nuove,
  // agganciarlo a mano lascerebbe scoperte quelle dimenticate. Le regole per
  // path stanno in `src/lib/security/rateLimitRules.ts`.
  if (isApiRoute) {
    const rule = resolveRateLimitRule(pathname, method);

    if (rule) {
      const ip = getClientIp(request) ?? 'unknown';
      const { allowed, reset } = await applyRateLimit(`${ip}:${rule.bucket}`, rule.limit, request);

      if (!allowed) {
        return NextResponse.json(
          { error: 'Troppe richieste. Riprova più tardi.' },
          {
            status: 429,
            headers: { 'Retry-After': String(reset) },
          },
        );
      }
    }
  }
  // --- Fine rate limiting ---

  // Le API si autenticano col Bearer token (verifyAuth): il refresh della
  // sessione via cookie qui sarebbe solo un round-trip in più verso Supabase Auth.
  if (isApiRoute) return NextResponse.next();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Rinnova la sessione se l'access token è scaduto, mantenendola viva tra le
  // richieste. getClaims() verifica il JWT in locale (chiavi asimmetriche) e va
  // in rete solo per il refresh; getUser() interrogava Supabase Auth ogni volta.
  // Il middleware non decide nulla sui permessi: la protezione resta in
  // verifyAuth e nella RLS.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
