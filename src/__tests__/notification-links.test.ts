import {
  getBookingDashboardLinkForRole,
  getAdminUsersNotificationLink,
  getUsersDashboardLinkForRole,
  resolveDashboardLinkForRole,
} from "@/lib/notifications/links";

describe("notification links", () => {
  it("builds the canonical admin users link", () => {
    expect(getAdminUsersNotificationLink("user-123")).toBe("/dashboard/admin/users/user-123");
    expect(getAdminUsersNotificationLink()).toBe("/dashboard/admin/users");
  });

  it("rewrites admin staff links for gestore recipients", () => {
    expect(resolveDashboardLinkForRole("/dashboard/admin/users/user-123", "gestore")).toBe(
      "/dashboard/gestore/users/user-123"
    );
    expect(resolveDashboardLinkForRole("/dashboard/admin/bookings/booking-1", "gestore")).toBe(
      "/dashboard/gestore/bookings/booking-1"
    );
  });

  it("leaves non-staff links unchanged", () => {
    expect(resolveDashboardLinkForRole("/dashboard/maestro/agenda", "maestro")).toBe(
      "/dashboard/maestro/agenda"
    );
  });

  it("builds booking dashboard links by recipient role", () => {
    expect(getBookingDashboardLinkForRole("gestore", "booking-1")).toBe(
      "/dashboard/gestore/bookings/booking-1"
    );
    expect(getBookingDashboardLinkForRole("maestro", "booking-1")).toBe(
      "/dashboard/maestro/agenda"
    );
    expect(getBookingDashboardLinkForRole("admin", "booking-1")).toBe(
      "/dashboard/admin/bookings/booking-1"
    );
  });

  it("builds users dashboard links by recipient role", () => {
    expect(getUsersDashboardLinkForRole("gestore", "user-123")).toBe(
      "/dashboard/gestore/users/user-123"
    );
    expect(getUsersDashboardLinkForRole("admin", "user-123")).toBe(
      "/dashboard/admin/users/user-123"
    );
  });
});