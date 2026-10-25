type PrivateLessonCoachNotificationParams = {
  athleteName?: string | null;
  court?: string | null;
  startTime: string | Date;
};

export function shouldNotifyCoachForPrivateLesson({
  bookingType,
  coachId,
}: {
  bookingType?: string | null;
  coachId?: string | null;
}): boolean {
  return bookingType === 'lezione_privata' && Boolean(coachId?.trim());
}

export function buildCoachNotificationForPrivateLesson({
  athleteName,
  court,
  startTime,
}: PrivateLessonCoachNotificationParams) {
  const bookingDate = new Date(startTime);
  // Fuso esplicito: lato server (Vercel) l'ora locale è UTC
  const dateLabel = bookingDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  });
  const timeLabel = bookingDate.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  });
  const courtLabel = court?.trim() || 'campo';

  return {
    type: 'booking' as const,
    title: 'Nuova lezione privata',
    message: `${
      athleteName?.trim() || 'Un utente'
    } ti ha selezionato per una lezione privata su ${courtLabel} il ${dateLabel} alle ${timeLabel}.`,
    link: '/dashboard/maestro/bookings',
  };
}
