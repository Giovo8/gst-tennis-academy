type AthleteBookingDeletionNotificationParams = {
  athleteName?: string | null;
  court?: string | null;
  startTime: string | Date;
};

type AthleteBookingDeletionNotificationContext = {
  actorUserId: string;
  bookingOwnerId: string;
  actorRole?: string | null;
  ownerRole?: string | null;
};

export function shouldNotifyAdminsForAthleteBookingDeletion({
  actorUserId,
  bookingOwnerId,
  actorRole,
  ownerRole,
}: AthleteBookingDeletionNotificationContext): boolean {
  if (actorUserId !== bookingOwnerId) {
    return false;
  }

  const normalizedActorRole = String(actorRole || "").toLowerCase();
  const normalizedOwnerRole = String(ownerRole || "").toLowerCase();

  return normalizedActorRole === "atleta" || normalizedOwnerRole === "atleta";
}

export function buildAdminsNotificationForAthleteBookingDeletion({
  athleteName,
  court,
  startTime,
}: AthleteBookingDeletionNotificationParams) {
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
    title: "Prenotazione eliminata da atleta",
    message: `${athleteName?.trim() || "Un atleta"} ha eliminato la prenotazione ${court?.trim() || "campo"} del ${dateLabel} alle ${timeLabel}.`,
    link: "/dashboard/admin/bookings",
  };
}