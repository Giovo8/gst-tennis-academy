import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";

export async function requireAdminOrGestore() {
  const auth = await getRouteAuth();
  if (!auth) {
    return { ok: false as const, response: unauthorized() };
  }

  if (!isAdmin(auth.role)) {
    return { ok: false as const, response: forbidden() };
  }

  return { ok: true as const, auth };
}
