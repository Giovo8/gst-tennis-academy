/**
 * @jest-environment node
 * 
 * Test per le funzioni di autenticazione e autorizzazione
 */

import { UserRole } from "./types";

function isAdminOrGestore(role: UserRole | undefined): boolean {
  return role === "admin" || role === "gestore";
}

function canManageUsers(role: UserRole | undefined): boolean {
  return role === "admin" || role === "gestore" || role === "maestro";
}

describe("Auth Helper Functions", () => {
  describe("isAdminOrGestore", () => {
    it("returns true for admin role", () => {
      expect(isAdminOrGestore("admin")).toBe(true);
    });

    it("returns true for gestore role", () => {
      expect(isAdminOrGestore("gestore")).toBe(true);
    });

    it("returns false for maestro role", () => {
      expect(isAdminOrGestore("maestro")).toBe(false);
    });

    it("returns false for atleta role", () => {
      expect(isAdminOrGestore("atleta")).toBe(false);
    });

    it("returns false for undefined role", () => {
      expect(isAdminOrGestore(undefined)).toBe(false);
    });
  });

  describe("canManageUsers", () => {
    it("returns true for admin role", () => {
      expect(canManageUsers("admin")).toBe(true);
    });

    it("returns true for gestore role", () => {
      expect(canManageUsers("gestore")).toBe(true);
    });

    it("returns true for maestro role", () => {
      expect(canManageUsers("maestro")).toBe(true);
    });

    it("returns false for atleta role", () => {
      expect(canManageUsers("atleta")).toBe(false);
    });

    it("returns false for undefined role", () => {
      expect(canManageUsers(undefined)).toBe(false);
    });
  });

  describe("Role Hierarchy", () => {
    const roles: UserRole[] = ["admin", "gestore", "maestro", "atleta"];

    it("admin has highest privileges", () => {
      expect(isAdminOrGestore("admin")).toBe(true);
      expect(canManageUsers("admin")).toBe(true);
    });

    it("gestore has management privileges", () => {
      expect(isAdminOrGestore("gestore")).toBe(true);
      expect(canManageUsers("gestore")).toBe(true);
    });

    it("maestro can manage users but is not admin/gestore", () => {
      expect(isAdminOrGestore("maestro")).toBe(false);
      expect(canManageUsers("maestro")).toBe(true);
    });

    it("atleta has minimal privileges", () => {
      expect(isAdminOrGestore("atleta")).toBe(false);
      expect(canManageUsers("atleta")).toBe(false);
    });
  });
});
