type PrivateLessonCoachNotificationParams = {
  athleteName?: string | null;
  court?: string | null;
  startTime: string | Date;
};

type PrivateLessonCoachBatchNotificationParams = {
  athleteName?: string | null;
  court?: string | null;
  lessonCount: number;
  firstStartTime: string | Date;
};

export function shouldNotifyCoachForPrivateLesson({
  bookingType,
  coachId,
}: {
  bookingType?: string | null;
  coachId?: string | null;
}): boolean {
  return bookingType === "lezione_privata" && Boolean(coachId?.trim());
}

export function buildCoachNotificationForPrivateLesson({
  athleteName,
  court,
  startTime,
}: PrivateLessonCoachNotificationParams) {
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
  const courtLabel = court?.trim() || "campo";

  return {
    type: "booking" as const,
    title: "Nuova lezione privata",
    message: `${athleteName?.trim() || "Un utente"} ti ha selezionato per una lezione privata su ${courtLabel} il ${dateLabel} alle ${timeLabel}.`,
    link: "/dashboard/maestro/agenda",
  };
}

export function buildCoachNotificationForPrivateLessonBatch({
  athleteName,
  court,
  lessonCount,
  firstStartTime,
}: PrivateLessonCoachBatchNotificationParams) {
  const bookingDate = new Date(firstStartTime);
  const dateLabel = bookingDate.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeLabel = bookingDate.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const courtLabel = court?.trim() || "campo";

  return {
    type: "booking" as const,
    title: "Nuove lezioni private",
    message: `${athleteName?.trim() || "Un utente"} ti ha selezionato per ${lessonCount} lezioni private su ${courtLabel} a partire dal ${dateLabel} alle ${timeLabel}.`,
    link: "/dashboard/maestro/agenda",
  };
}