/**
 * @jest-environment node
 *
 * Test per le funzioni di ruolo in /lib/roles.ts
 */

import {
  isAdmin,
  isAdminOrGestore,
  isCoach,
  isStaffRole,
  canManageUsers,
  getSecondaryRoles,
  isBookableCoachProfile,
  getDestinationForRole,
  roleLabels,
  roleDestinations,
} from "@/lib/roles";

// ─────────────────────────────────────────────
// isAdmin / isAdminOrGestore
// ─────────────────────────────────────────────
describe("isAdmin", () => {
  it("ritorna true per admin", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("ritorna true per gestore", () => {
    expect(isAdmin("gestore")).toBe(true);
  });

  it("ritorna false per maestro", () => {
    expect(isAdmin("maestro")).toBe(false);
  });

  it("ritorna false per atleta", () => {
    expect(isAdmin("atleta")).toBe(false);
  });

  it("ritorna false per null", () => {
    expect(isAdmin(null)).toBe(false);
  });

  it("ritorna false per undefined", () => {
    expect(isAdmin(undefined)).toBe(false);
  });

  it("isAdminOrGestore è un alias di isAdmin", () => {
    expect(isAdminOrGestore("admin")).toBe(isAdmin("admin"));
    expect(isAdminOrGestore("gestore")).toBe(isAdmin("gestore"));
    expect(isAdminOrGestore("atleta")).toBe(isAdmin("atleta"));
  });
});

// ─────────────────────────────────────────────
// isCoach
// ─────────────────────────────────────────────
describe("isCoach", () => {
  it("ritorna true per maestro", () => {
    expect(isCoach("maestro")).toBe(true);
  });

  it("ritorna true per admin (può gestire tutto)", () => {
    expect(isCoach("admin")).toBe(true);
  });

  it("ritorna true per gestore", () => {
    expect(isCoach("gestore")).toBe(true);
  });

  it("ritorna false per atleta", () => {
    expect(isCoach("atleta")).toBe(false);
  });

  it("ritorna false per null", () => {
    expect(isCoach(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// isStaffRole
// ─────────────────────────────────────────────
describe("isStaffRole", () => {
  it("riconosce admin", () => {
    expect(isStaffRole("admin")).toBe(true);
  });

  it("riconosce gestore", () => {
    expect(isStaffRole("gestore")).toBe(true);
  });

  it("riconosce maestro", () => {
    expect(isStaffRole("maestro")).toBe(true);
  });

  it("è case-insensitive", () => {
    expect(isStaffRole("Admin")).toBe(true);
    expect(isStaffRole("MAESTRO")).toBe(true);
  });

  it("ritorna false per atleta", () => {
    expect(isStaffRole("atleta")).toBe(false);
  });

  it("ritorna false per stringa vuota", () => {
    expect(isStaffRole("")).toBe(false);
  });

  it("ritorna false per null", () => {
    expect(isStaffRole(null)).toBe(false);
  });

  it("ritorna false per undefined", () => {
    expect(isStaffRole(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// canManageUsers
// ─────────────────────────────────────────────
describe("canManageUsers", () => {
  it("admin può gestire utenti", () => {
    expect(canManageUsers("admin")).toBe(true);
  });

  it("gestore può gestire utenti", () => {
    expect(canManageUsers("gestore")).toBe(true);
  });

  it("maestro può gestire utenti", () => {
    expect(canManageUsers("maestro")).toBe(true);
  });

  it("atleta NON può gestire utenti", () => {
    expect(canManageUsers("atleta")).toBe(false);
  });

  it("null NON può gestire utenti", () => {
    expect(canManageUsers(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// getSecondaryRoles
// ─────────────────────────────────────────────
describe("getSecondaryRoles", () => {
  it("ritorna array vuoto per null", () => {
    expect(getSecondaryRoles(null)).toEqual([]);
  });

  it("ritorna array vuoto per undefined", () => {
    expect(getSecondaryRoles(undefined)).toEqual([]);
  });

  it("ritorna array vuoto se secondary_roles manca", () => {
    expect(getSecondaryRoles({ other: "field" })).toEqual([]);
  });

  it("ritorna i ruoli secondari in lowercase", () => {
    const result = getSecondaryRoles({ secondary_roles: ["Maestro", "GESTORE"] });
    expect(result).toEqual(["maestro", "gestore"]);
  });

  it("ritorna array vuoto se secondary_roles non è un array", () => {
    expect(getSecondaryRoles({ secondary_roles: "maestro" })).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// isBookableCoachProfile
// ─────────────────────────────────────────────
describe("isBookableCoachProfile", () => {
  it("ritorna false per null", () => {
    expect(isBookableCoachProfile(null)).toBe(false);
  });

  it("ritorna false per undefined", () => {
    expect(isBookableCoachProfile(undefined)).toBe(false);
  });

  it("usa is_bookable_coach=true se presente", () => {
    expect(isBookableCoachProfile({ is_bookable_coach: true })).toBe(true);
  });

  it("usa is_bookable_coach=false se presente", () => {
    expect(isBookableCoachProfile({ is_bookable_coach: false })).toBe(false);
  });

  it("maestro senza flag esplicito è prenotabile", () => {
    expect(isBookableCoachProfile({ role: "maestro" })).toBe(true);
  });

  it("atleta non è prenotabile", () => {
    expect(isBookableCoachProfile({ role: "atleta" })).toBe(false);
  });

  it("gestore con ruolo secondario maestro è prenotabile", () => {
    expect(
      isBookableCoachProfile({
        role: "gestore",
        metadata: { secondary_roles: ["maestro"] },
      })
    ).toBe(true);
  });

  it("gestore senza ruolo secondario maestro NON è prenotabile", () => {
    expect(isBookableCoachProfile({ role: "gestore", metadata: {} })).toBe(false);
  });
});

// ─────────────────────────────────────────────
// getDestinationForRole
// ─────────────────────────────────────────────
describe("getDestinationForRole", () => {
  it("atleta → /dashboard/atleta", () => {
    expect(getDestinationForRole("atleta")).toBe("/dashboard/atleta");
  });

  it("maestro → /dashboard/maestro", () => {
    expect(getDestinationForRole("maestro")).toBe("/dashboard/maestro");
  });

  it("admin → /dashboard/admin", () => {
    expect(getDestinationForRole("admin")).toBe("/dashboard/admin");
  });

  it("gestore → /dashboard/admin", () => {
    expect(getDestinationForRole("gestore")).toBe("/dashboard/admin");
  });
});

// ─────────────────────────────────────────────
// Costanti
// ─────────────────────────────────────────────
describe("roleLabels", () => {
  it("contiene etichette per tutti i ruoli", () => {
    const expectedRoles = ["atleta", "maestro", "gestore", "admin"] as const;
    for (const role of expectedRoles) {
      expect(roleLabels[role]).toBeDefined();
      expect(typeof roleLabels[role]).toBe("string");
    }
  });
});

describe("roleDestinations", () => {
  it("ogni ruolo ha una destinazione valida", () => {
    for (const dest of Object.values(roleDestinations)) {
      expect(dest).toMatch(/^\//);
    }
  });
});
