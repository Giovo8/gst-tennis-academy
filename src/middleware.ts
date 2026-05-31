import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // --- Protezione CSRF per richieste state-changing verso API route ---
  // Si applica solo quando l'header Origin è presente (richieste browser con cookie).
  // Le chiamate server-to-server (webhook, integrazioni) non inviano Origin e vengono lasciate passare.
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const isApiRoute = pathname.startsWith("/api/");
  const isWebhook = pathname.startsWith("/api/webhooks/");

  if (isMutating && isApiRoute && !isWebhook) {
    const origin = request.headers.get("origin");
    if (origin) {
      const host = request.headers.get("host");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const allowed = [
        host ? `https://${host}` : null,
        host ? `http://${host}` : null,
        siteUrl ?? null,
      ].filter(Boolean) as string[];

      if (!allowed.some((a) => origin === a)) {
        return NextResponse.json(
          { error: "Richiesta non autorizzata (CSRF)" },
          { status: 403 }
        );
      }
    }
  }
  // --- Fine protezione CSRF ---

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if the access token has expired.
  // This keeps the session alive across requests.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
