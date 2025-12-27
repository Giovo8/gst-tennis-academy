export type UserRole = "atleta" | "maestro" | "gestore" | "admin";

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


