import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/atleta";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user profile to determine redirect
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        let destination = next;
        if (profile?.role === "admin" || profile?.role === "gestore") {
          destination = "/dashboard/admin";
        } else if (profile?.role === "maestro") {
          destination = "/dashboard/maestro";
        }

        return NextResponse.redirect(`${origin}${destination}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    // Code exchange failed - check if user is already logged in
    const { data: { user: existingUser } } = await supabase.auth.getUser();
    if (existingUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", existingUser.id)
        .single();

      let destination = next;
      if (profile?.role === "admin" || profile?.role === "gestore") {
        destination = "/dashboard/admin";
      } else if (profile?.role === "maestro") {
        destination = "/dashboard/maestro";
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
