export type UserRole = "atleta" | "maestro" | "gestore" | "admin";

export type RoleAwareProfile = {
  role?: string | null;
  metadata?: unknown;
  is_bookable_coach?: boolean | null;
};

export const roleLabels: Record<UserRole, string> = {
  atleta: "Atleta",
  maestro: "Coach",
  gestore: "Gestore",
  admin: "Admin",
};

export const roleDestinations: Record<UserRole, string> = {
  atleta: "/dashboard/atleta",
  maestro: "/dashboard/maestro",
  gestore: "/dashboard/admin",
  admin: "/dashboard/admin",
};

export function getDestinationForRole(role: UserRole) {
  return roleDestinations[role] ?? "/login";
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "gestore";
}

export function isCoach(role: UserRole | null | undefined): boolean {
  return role === "maestro" || isAdmin(role);
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

function getSecondaryRoles(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];

  const secondaryRoles = (metadata as { secondary_roles?: unknown }).secondary_roles;
  if (!Array.isArray(secondaryRoles)) return [];

  return secondaryRoles.map((value) => String(value).toLowerCase());
}

export function isBookableCoachProfile(profile: RoleAwareProfile | null | undefined): boolean {
  if (!profile) return false;

  if (typeof profile.is_bookable_coach === "boolean") {
    return profile.is_bookable_coach;
  }

  const role = String(profile.role || "").toLowerCase();
  if (role === "maestro") return true;
  if (role !== "gestore") return false;

  return getSecondaryRoles(profile.metadata).includes("maestro");
}


