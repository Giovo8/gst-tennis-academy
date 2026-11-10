/**
 * @jest-environment node
 *
 * Test per le funzioni di ruolo in /lib/roles.ts
 */

import {
  isAdminOrGestore,
  isStaffRole,
  getSecondaryRoles,
  isBookableCoachProfile,
  getDestinationForRole,
} from '@/lib/roles';

// ─────────────────────────────────────────────
// isAdminOrGestore
// ─────────────────────────────────────────────
describe('isAdminOrGestore', () => {
  it('ritorna true per admin', () => {
    expect(isAdminOrGestore('admin')).toBe(true);
  });

  it('ritorna true per gestore', () => {
    expect(isAdminOrGestore('gestore')).toBe(true);
  });

  it('ritorna false per maestro', () => {
    expect(isAdminOrGestore('maestro')).toBe(false);
  });

  it('ritorna false per atleta', () => {
    expect(isAdminOrGestore('atleta')).toBe(false);
  });

  it('ritorna false per null', () => {
    expect(isAdminOrGestore(null)).toBe(false);
  });

  it('ritorna false per undefined', () => {
    expect(isAdminOrGestore(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// isStaffRole
// ─────────────────────────────────────────────
describe('isStaffRole', () => {
  it('riconosce admin', () => {
    expect(isStaffRole('admin')).toBe(true);
  });

  it('riconosce gestore', () => {
    expect(isStaffRole('gestore')).toBe(true);
  });

  it('riconosce maestro', () => {
    expect(isStaffRole('maestro')).toBe(true);
  });

  it('è case-insensitive', () => {
    expect(isStaffRole('Admin')).toBe(true);
    expect(isStaffRole('MAESTRO')).toBe(true);
  });

  it('ritorna false per atleta', () => {
    expect(isStaffRole('atleta')).toBe(false);
  });

  it('ritorna false per stringa vuota', () => {
    expect(isStaffRole('')).toBe(false);
  });

  it('ritorna false per null', () => {
    expect(isStaffRole(null)).toBe(false);
  });

  it('ritorna false per undefined', () => {
    expect(isStaffRole(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// getSecondaryRoles
// ─────────────────────────────────────────────
describe('getSecondaryRoles', () => {
  it('ritorna array vuoto per null', () => {
    expect(getSecondaryRoles(null)).toEqual([]);
  });

  it('ritorna array vuoto per undefined', () => {
    expect(getSecondaryRoles(undefined)).toEqual([]);
  });

  it('ritorna array vuoto se secondary_roles manca', () => {
    expect(getSecondaryRoles({ other: 'field' })).toEqual([]);
  });

  it('ritorna i ruoli secondari in lowercase', () => {
    const result = getSecondaryRoles({ secondary_roles: ['Maestro', 'GESTORE'] });
    expect(result).toEqual(['maestro', 'gestore']);
  });

  it('ritorna array vuoto se secondary_roles non è un array', () => {
    expect(getSecondaryRoles({ secondary_roles: 'maestro' })).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// isBookableCoachProfile
// ─────────────────────────────────────────────
describe('isBookableCoachProfile', () => {
  it('ritorna false per null', () => {
    expect(isBookableCoachProfile(null)).toBe(false);
  });

  it('ritorna false per undefined', () => {
    expect(isBookableCoachProfile(undefined)).toBe(false);
  });

  it('usa is_bookable_coach=true se presente', () => {
    expect(isBookableCoachProfile({ is_bookable_coach: true })).toBe(true);
  });

  it('usa is_bookable_coach=false se presente', () => {
    expect(isBookableCoachProfile({ is_bookable_coach: false })).toBe(false);
  });

  it('maestro senza flag esplicito è prenotabile', () => {
    expect(isBookableCoachProfile({ role: 'maestro' })).toBe(true);
  });

  it('atleta non è prenotabile', () => {
    expect(isBookableCoachProfile({ role: 'atleta' })).toBe(false);
  });

  it('gestore con ruolo secondario maestro è prenotabile', () => {
    expect(
      isBookableCoachProfile({
        role: 'gestore',
        metadata: { secondary_roles: ['maestro'] },
      }),
    ).toBe(true);
  });

  it('gestore senza ruolo secondario maestro NON è prenotabile', () => {
    expect(isBookableCoachProfile({ role: 'gestore', metadata: {} })).toBe(false);
  });
});

// ─────────────────────────────────────────────
// getDestinationForRole
// ─────────────────────────────────────────────
describe('getDestinationForRole', () => {
  it('atleta → /dashboard/atleta', () => {
    expect(getDestinationForRole('atleta')).toBe('/dashboard/atleta');
  });

  it('maestro → /dashboard/maestro', () => {
    expect(getDestinationForRole('maestro')).toBe('/dashboard/maestro');
  });

  it('admin → /dashboard/admin', () => {
    expect(getDestinationForRole('admin')).toBe('/dashboard/admin');
  });

  it('gestore → /dashboard/admin', () => {
    expect(getDestinationForRole('gestore')).toBe('/dashboard/admin');
  });
});
