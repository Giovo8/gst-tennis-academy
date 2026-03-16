export function getMessageNotificationLink(role?: string | null): string {
  const normalizedRole = String(role || "").toLowerCase();

  switch (normalizedRole) {
    case "atleta":
      return "/dashboard/atleta/mail";
    case "maestro":
      return "/dashboard/maestro/mail";
    case "admin":
    case "gestore":
      return "/dashboard/admin/chat";
    default:
      return "/dashboard/admin/chat";
  }
}

export function getAdminBookingNotificationLink(bookingId?: string | null): string {
  if (bookingId && bookingId.trim().length > 0) {
    return `/dashboard/admin/bookings/${bookingId}`;
  }

  return "/dashboard/admin/bookings";
}

export function getAdminUsersNotificationLink(userId?: string | null): string {
  if (userId && userId.trim().length > 0) {
    return `/dashboard/admin/users/${userId}`;
  }

  return "/dashboard/admin/users";
}

export function getBookingDashboardLinkForRole(role?: string | null, bookingId?: string | null): string {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "maestro") {
    return "/dashboard/maestro/agenda";
  }

  if (normalizedRole === "gestore") {
    if (bookingId && bookingId.trim().length > 0) {
      return `/dashboard/gestore/bookings/${bookingId}`;
    }

    return "/dashboard/gestore/bookings";
  }

  return getAdminBookingNotificationLink(bookingId);
}

export function getUsersDashboardLinkForRole(role?: string | null, userId?: string | null): string {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "gestore") {
    if (userId && userId.trim().length > 0) {
      return `/dashboard/gestore/users/${userId}`;
    }

    return "/dashboard/gestore/users";
  }

  return getAdminUsersNotificationLink(userId);
}

export function resolveDashboardLinkForRole(link?: string | null, role?: string | null): string | null {
  if (!link) {
    return null;
  }

  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "gestore" && link.startsWith("/dashboard/admin/")) {
    return link.replace("/dashboard/admin/", "/dashboard/gestore/");
  }

  if (normalizedRole === "admin" && link.startsWith("/dashboard/gestore/")) {
    return link.replace("/dashboard/gestore/", "/dashboard/admin/");
  }

  return link;
}
