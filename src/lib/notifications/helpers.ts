// Helper functions to create notifications for various events
// These can be called from API routes or server actions

type NotificationType = "booking" | "tournament" | "course" | "message" | "info" | "success" | "warning" | "error";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create notification");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Specific notification creators for common events

export async function notifyBookingCreated(userId: string, bookingDetails: { court: string; startTime: string }) {
  return createNotification({
    userId,
    title: "Nuova Prenotazione",
    message: `La tua prenotazione per il Campo ${bookingDetails.court} alle ${new Date(bookingDetails.startTime).toLocaleString("it-IT")} è stata creata.`,
    type: "booking",
    link: "/bookings",
  });
}

export async function notifyBookingConfirmed(userId: string, bookingDetails: { court: string; startTime: string }) {
  return createNotification({
    userId,
    title: "Prenotazione Confermata",
    message: `La tua prenotazione per il Campo ${bookingDetails.court} è stata confermata!`,
    type: "success",
    link: "/bookings",
  });
}

export async function notifyTournamentEnrollment(userId: string, tournamentTitle: string) {
  return createNotification({
    userId,
    title: "Iscrizione Torneo",
    message: `Ti sei iscritto al torneo "${tournamentTitle}". Buona fortuna!`,
    type: "tournament",
    link: "/tornei",
  });
}

export async function notifyTournamentMatchScheduled(userId: string, tournamentTitle: string, opponent: string) {
  return createNotification({
    userId,
    title: "Nuovo Match Programmato",
    message: `Il tuo match contro ${opponent} nel torneo "${tournamentTitle}" è stato programmato.`,
    type: "tournament",
    link: "/tornei",
  });
}

export async function notifyCourseEnrollment(userId: string, courseTitle: string) {
  return createNotification({
    userId,
    title: "Iscrizione Corso",
    message: `Ti sei iscritto al corso "${courseTitle}".`,
    type: "course",
    link: "/courses",
  });
}

export async function notifyNewMessage(userId: string, senderName: string) {
  return createNotification({
    userId,
    title: "Nuovo Messaggio",
    message: `Hai ricevuto un nuovo messaggio da ${senderName}.`,
    type: "message",
    link: "/chat",
  });
}

export async function notifyLessonAssigned(userId: string, coachName: string, startTime: string) {
  return createNotification({
    userId,
    title: "Lezione Assegnata",
    message: `${coachName} ti ha assegnato una lezione per ${new Date(startTime).toLocaleString("it-IT")}.`,
    type: "booking",
    link: "/bookings",
  });
}

export async function notifyVideoAssigned(userId: string, videoTitle: string) {
  return createNotification({
    userId,
    title: "Nuovo Video Assegnato",
    message: `Ti è stato assegnato un nuovo video di allenamento: "${videoTitle}".`,
    type: "info",
    link: "/dashboard/atleta/i-miei-video",
  });
}

// Notify admins/gestori
export async function notifyAdmins(title: string, message: string, link?: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/notify-admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, link }),
    });

    if (!response.ok) {
      throw new Error("Failed to notify admins");
    }

    return await response.json();
  } catch (error) {
    console.error("Error notifying admins:", error);
    return null;
  }
}
