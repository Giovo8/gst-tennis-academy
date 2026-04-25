function isManagerRole(role: string): boolean {
  return role === "admin" || role === "gestore";
}

type UserBookingDeletionNotificationParams = {
  userName?: string | null;
  court?: string | null;
  startTime: string | Date;
};

type UserBookingDeletionNotificationContext = {
  actorUserId: string;
  bookingOwnerId: string;
  actorRole?: string | null;
  ownerRole?: string | null;
};

export function shouldNotifyAdminsForUserBookingDeletion({
  actorUserId,
  bookingOwnerId,
  actorRole,
  ownerRole,
}: UserBookingDeletionNotificationContext): boolean {
  if (actorUserId !== bookingOwnerId) {
    return false;
  }

  const normalizedActorRole = String(actorRole || "").toLowerCase();
  const normalizedOwnerRole = String(ownerRole || "").toLowerCase();

  if (normalizedActorRole) {
    return !isManagerRole(normalizedActorRole);
  }

  if (normalizedOwnerRole) {
    return !isManagerRole(normalizedOwnerRole);
  }

  return false;
}

export function buildAdminsNotificationForUserBookingDeletion({
  userName,
  court,
  startTime,
}: UserBookingDeletionNotificationParams) {
  const bookingDate = new Date(startTime);
  const dateLabel = bookingDate.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeLabel = bookingDate.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    type: "booking" as const,
    title: "Prenotazione eliminata da utente",
    message: `${userName?.trim() || "Un utente"} ha eliminato la prenotazione ${court?.trim() || "campo"} del ${dateLabel} alle ${timeLabel}.`,
    link: "/dashboard/admin/bookings",
  };
}

export const shouldNotifyAdminsForAthleteBookingDeletion = shouldNotifyAdminsForUserBookingDeletion;
export const buildAdminsNotificationForAthleteBookingDeletion = buildAdminsNotificationForUserBookingDeletion;