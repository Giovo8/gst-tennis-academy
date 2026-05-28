import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { type UserRole, isAdminOrGestore, canManageUsers } from "@/lib/roles";

export type { UserRole };
export { isAdminOrGestore, canManageUsers };

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
  response?: never;
}

/**
 * Verifica l'autenticazione tramite header `Authorization: Bearer <token>`.
 * Usare in API route chiamate dal client JS con fetch + header esplicito.
 * Per route chiamate dal browser senza header (cookie automatico) usare `getRouteAuth`.
 */
export async function verifyAuth(
  req: Request,
  allowedRoles?: UserRole[]
): Promise<AuthSuccessResponse | AuthErrorResponse> {
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
