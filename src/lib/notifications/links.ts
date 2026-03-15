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
