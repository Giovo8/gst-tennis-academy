import {
  getBookingDashboardLinkForRole,
  getAdminUsersNotificationLink,
  getUsersDashboardLinkForRole,
  resolveNotificationLink,
} from '@/lib/notifications/links';

describe('notification links', () => {
  it('builds the canonical admin users link', () => {
    expect(getAdminUsersNotificationLink('user-123')).toBe('/dashboard/admin/users/user-123');
    expect(getAdminUsersNotificationLink()).toBe('/dashboard/admin/users');
  });

  it('keeps stored links unchanged', () => {
    expect(resolveNotificationLink('/dashboard/admin/users/user-123')).toBe(
      '/dashboard/admin/users/user-123',
    );
    expect(resolveNotificationLink('/dashboard/atleta/bookings/booking-1')).toBe(
      '/dashboard/atleta/bookings/booking-1',
    );
    expect(resolveNotificationLink(null)).toBeNull();
  });

  it('redirects legacy maestro agenda links to bookings', () => {
    expect(resolveNotificationLink('/dashboard/maestro/agenda')).toBe(
      '/dashboard/maestro/bookings',
    );
  });

  it('builds booking dashboard links by recipient role', () => {
    expect(getBookingDashboardLinkForRole('atleta', 'booking-1')).toBe(
      '/dashboard/atleta/bookings/booking-1',
    );
    expect(getBookingDashboardLinkForRole('gestore', 'booking-1')).toBe(
      '/dashboard/admin/bookings/booking-1',
    );
    expect(getBookingDashboardLinkForRole('maestro', 'booking-1')).toBe(
      '/dashboard/maestro/bookings/booking-1',
    );
    expect(getBookingDashboardLinkForRole('admin', 'booking-1')).toBe(
      '/dashboard/admin/bookings/booking-1',
    );
  });

  it('builds users dashboard links by recipient role', () => {
    expect(getUsersDashboardLinkForRole('atleta', 'user-123')).toBe('/dashboard/atleta/profile');
    expect(getUsersDashboardLinkForRole('gestore', 'user-123')).toBe(
      '/dashboard/admin/users/user-123',
    );
    expect(getUsersDashboardLinkForRole('admin', 'user-123')).toBe(
      '/dashboard/admin/users/user-123',
    );
  });
});
