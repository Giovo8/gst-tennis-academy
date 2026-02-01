import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export type UserRole = "atleta" | "maestro" | "gestore" | "admin";

export interface AuthResult {
  user: {
    id: string;
    email: string;
  };
  profile: {
    role: UserRole;
    full_name: string | null;
  } | null;
}

export interface AuthErrorResponse {
  success: false;
  response: NextResponse;
}

export interface AuthSuccessResponse {
  success: true;
  data: AuthResult;
}

/**
 * Verifica l'autenticazione dell'utente da un header Authorization Bearer token.
 * Restituisce i dati utente e profilo se autenticato, altrimenti un errore.
 */
export async function verifyAuth(
  req: Request,
  allowedRoles?: UserRole[]
): Promise<any> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Non autorizzato: token mancante" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Non autorizzato: token non valido" },
          { status: 401 }
        ),
      };
    }

    // Fetch profile to get role
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Check role authorization if specified
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = profile?.role as UserRole;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Non autorizzato: permessi insufficienti" },
            { status: 403 }
          ),
        };
      }
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email ?? "",
        },
        profile: profile
          ? {
              role: profile.role as UserRole,
              full_name: profile.full_name,
            }
          : null,
      },
    };
  } catch (err) {
    console.error("Auth verification error:", err);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Errore durante la verifica dell'autenticazione" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Verifica se l'utente è admin o gestore
 */
export function isAdminOrGestore(role: UserRole | undefined): boolean {
  return role === "admin" || role === "gestore";
}

/**
 * Verifica se l'utente può gestire altri utenti (admin, gestore, maestro)
 */
export function canManageUsers(role: UserRole | undefined): boolean {
  return role === "admin" || role === "gestore" || role === "maestro";
}
