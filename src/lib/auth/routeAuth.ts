import { createClient } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { NextResponse } from "next/server";

type UserRole = "admin" | "gestore" | "maestro" | "atleta";

interface RouteAuthResult {
  user: { id: string; email: string };
  role: UserRole | null;
}

/**
 * Verifica l'autenticazione tramite cookie di sessione (SSR/browser).
 * Usare in API route chiamate direttamente dal browser senza header Authorization.
 * Per route chiamate con fetch + header Bearer usare `verifyAuth` da `@/lib/auth/verifyAuth`.
 */
export async function getRouteAuth(): Promise<RouteAuthResult | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return {
      user: { id: user.id, email: user.email ?? "" },
      role: (profile?.role as UserRole) ?? null,
    };
  } catch {
    return null;
  }
}

export function isAdmin(role: string | null): boolean {
  return role === "admin" || role === "gestore";
}

export function unauthorized() {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
}
