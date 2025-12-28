import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/service";
import {
  bookingConfirmationTemplate,
  bookingReminderTemplate,
  bookingCancelledTemplate,
  tournamentRegistrationTemplate,
  tournamentReminderTemplate,
  lessonConfirmedTemplate,
  welcomeEmailTemplate,
} from "@/lib/email/templates";

/**
 * Email Automation Triggers
 * These functions are called after specific events to send automated emails
 */

// Booking Events
export async function sendBookingConfirmation(bookingData: {
  userEmail: string;
  userName: string;
  userId: string;
  courtName: string;
  bookingDate: string;
  bookingTime: string;
  durationHours: number;
  totalPrice: string;
  bookingId: string;
}) {
  const html = bookingConfirmationTemplate({
    user_name: bookingData.userName,
    court_name: bookingData.courtName,
    booking_date: bookingData.bookingDate,
    booking_time: bookingData.bookingTime,
    duration_hours: bookingData.durationHours,
    total_price: bookingData.totalPrice,
    booking_id: bookingData.bookingId,
    site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  return await sendEmail({
    to: bookingData.userEmail,
    subject: `Prenotazione Confermata - ${bookingData.courtName}`,
    html,
    templateName: "booking_confirmation",
    templateData: bookingData,
    recipientUserId: bookingData.userId,
    recipientName: bookingData.userName,
    category: "transactional",
  });
}

export async function sendBookingCancellation(bookingData: {
  userEmail: string;
  userName: string;
  userId: string;
  courtName: string;
  bookingDate: string;
  bookingTime: string;
  cancellationReason?: string;
  refundAmount?: string;
}) {
  const html = bookingCancelledTemplate({
    user_name: bookingData.userName,
    court_name: bookingData.courtName,
    booking_date: bookingData.bookingDate,
    booking_time: bookingData.bookingTime,
    cancellation_reason: bookingData.cancellationReason,
    refund_amount: bookingData.refundAmount,
    site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  return await sendEmail({
    to: bookingData.userEmail,
    subject: `Prenotazione Cancellata - ${bookingData.courtName}`,
    html,
    templateName: "booking_cancelled",
    templateData: bookingData,
    recipientUserId: bookingData.userId,
    recipientName: bookingData.userName,
    category: "transactional",
  });
}

// Tournament Events
export async function sendTournamentRegistration(tournamentData: {
  userEmail: string;
  userName: string;
  userId: string;
  tournamentName: string;
  tournamentDate: string;
  tournamentLocation: string;
  category: string;
  registrationFee: string;
  tournamentId: string;
}) {
  const html = tournamentRegistrationTemplate({
    user_name: tournamentData.userName,
    tournament_name: tournamentData.tournamentName,
    tournament_date: tournamentData.tournamentDate,
    tournament_location: tournamentData.tournamentLocation,
    category: tournamentData.category,
    registration_fee: tournamentData.registrationFee,
    tournament_id: tournamentData.tournamentId,
    site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  return await sendEmail({
    to: tournamentData.userEmail,
    subject: `Iscrizione Confermata - ${tournamentData.tournamentName}`,
    html,
    templateName: "tournament_registration",
    templateData: tournamentData,
    recipientUserId: tournamentData.userId,
    recipientName: tournamentData.userName,
    category: "transactional",
  });
}

export async function sendTournamentMatchReminder(matchData: {
  userEmail: string;
  userName: string;
  userId: string;
  tournamentName: string;
  firstMatchDate: string;
  firstMatchTime: string;
  opponentName?: string;
  courtNumber: string;
}) {
  const html = tournamentReminderTemplate({
    user_name: matchData.userName,
    tournament_name: matchData.tournamentName,
    first_match_date: matchData.firstMatchDate,
    first_match_time: matchData.firstMatchTime,
    opponent_name: matchData.opponentName,
    court_number: matchData.courtNumber,
    site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  return await sendEmail({
    to: matchData.userEmail,
    subject: `Promemoria Match - ${matchData.tournamentName}`,
    html,
    templateName: "tournament_reminder",
    templateData: matchData,
    recipientUserId: matchData.userId,
    recipientName: matchData.userName,
    category: "notification",
  });
}

// Lesson Events
export async function sendLessonConfirmation(lessonData: {
  userEmail: string;
  userName: string;
  userId: string;
  coachName: string;
  lessonDate: string;
  lessonTime: string;
  courtName: string;
  lessonType: string;
  duration: string;
}) {
  const html = lessonConfirmedTemplate({
    student_name: lessonData.userName,
    coach_name: lessonData.coachName,
    lesson_date: lessonData.lessonDate,
    lesson_time: lessonData.lessonTime,
    court_name: lessonData.courtName,
    lesson_type: lessonData.lessonType,
    duration: lessonData.duration,
    site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  return await sendEmail({
    to: lessonData.userEmail,
    subject: `Lezione Confermata con ${lessonData.coachName}`,
    html,
    templateName: "lesson_confirmed",
    templateData: lessonData,
    recipientUserId: lessonData.userId,
    recipientName: lessonData.userName,
    category: "transactional",
  });
}

// User Events
export async function sendWelcomeEmail(userData: {
  userEmail: string;
  userName: string;
  userId: string;
}) {
  const html = welcomeEmailTemplate({
    user_name: userData.userName,
    site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  return await sendEmail({
    to: userData.userEmail,
    subject: "Benvenuto in GST Tennis Academy! 🎾",
    html,
    templateName: "welcome",
    templateData: userData,
    recipientUserId: userData.userId,
    recipientName: userData.userName,
    category: "transactional",
  });
}

// Batch reminder function (called by scheduler)
export async function sendBookingReminders() {
  try {
    const { supabaseServer } = await import("@/lib/supabase/serverClient");
    const supabase = supabaseServer;

    // Get bookings for tomorrow (24 hours from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        start_time,
        end_time,
        status,
        user_id,
        profiles:user_id (
          id,
          email,
          full_name
        ),
        courts (
          name
        )
      `)
      .eq("status", "confirmed")
      .gte("start_time", tomorrow.toISOString())
      .lt("start_time", dayAfterTomorrow.toISOString());

    if (error || !bookings) {
      console.error("Error fetching bookings for reminders:", error);
      return { success: false, error: error?.message };
    }

    let successCount = 0;
    let failCount = 0;

    for (const booking of bookings) {
      if (!booking.profiles || !booking.courts) continue;

      const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const court = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts;

      const startTime = new Date(booking.start_time);
      const hoursUntil = Math.round((startTime.getTime() - Date.now()) / (1000 * 60 * 60));

      const html = bookingReminderTemplate({
        user_name: profile.full_name,
        court_name: court.name,
        booking_date: startTime.toLocaleDateString("it-IT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        booking_time: startTime.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        hours_until: hoursUntil,
        site_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      });

      const result = await sendEmail({
        to: profile.email,
        subject: `Promemoria: Prenotazione di Domani - ${court.name}`,
        html,
        templateName: "booking_reminder",
        templateData: {
          booking_id: booking.id,
          court_name: court.name,
          booking_date: startTime.toISOString(),
        },
        recipientUserId: profile.id,
        recipientName: profile.full_name,
        category: "notification",
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`Booking reminders sent: ${successCount} successful, ${failCount} failed`);
    return { success: true, sent: successCount, failed: failCount };
  } catch (error: any) {
    console.error("Error in sendBookingReminders:", error);
    return { success: false, error: error.message };
  }
}
