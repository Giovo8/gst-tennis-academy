export function getMessageNotificationLink(role?: string | null): string {
  const normalizedRole = String(role || '').toLowerCase();

  switch (normalizedRole) {
    case 'atleta':
      return '/dashboard/atleta/mail';
    case 'maestro':
      return '/dashboard/maestro/mail';
    case 'admin':
    case 'gestore':
      return '/dashboard/admin/chat';
    default:
      return '/dashboard/admin/chat';
  }
}

export function getAdminBookingNotificationLink(bookingId?: string | null): string {
  if (bookingId && bookingId.trim().length > 0) {
    return `/dashboard/admin/bookings/${bookingId}`;
  }

  return '/dashboard/admin/bookings';
}

export function getAdminUsersNotificationLink(userId?: string | null): string {
  if (userId && userId.trim().length > 0) {
    return `/dashboard/admin/users/${userId}`;
  }

  return '/dashboard/admin/users';
}

export function getBookingDashboardLinkForRole(
  role?: string | null,
  bookingId?: string | null,
): string {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'atleta') {
    if (bookingId && bookingId.trim().length > 0) {
      return `/dashboard/atleta/bookings/${bookingId}`;
    }

    return '/dashboard/atleta/bookings';
  }

  if (normalizedRole === 'maestro') {
    if (bookingId && bookingId.trim().length > 0) {
      return `/dashboard/maestro/bookings/${bookingId}`;
    }

    return '/dashboard/maestro/bookings';
  }

  return getAdminBookingNotificationLink(bookingId);
}

export function getUsersDashboardLinkForRole(role?: string | null, userId?: string | null): string {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'atleta') {
    return userId ? '/dashboard/atleta/profile' : '/dashboard/atleta';
  }

  return getAdminUsersNotificationLink(userId);
}

// Pagine rimosse ma ancora presenti nei link delle notifiche già salvate a DB.
const LEGACY_LINKS: Record<string, string> = {
  '/dashboard/maestro/agenda': '/dashboard/maestro/bookings',
};

/** Link di una notifica salvata, con i vecchi percorsi riportati a pagine esistenti. */
export function resolveNotificationLink(link?: string | null): string | null {
  if (!link) {
    return null;
  }

  return LEGACY_LINKS[link] ?? link;
}
