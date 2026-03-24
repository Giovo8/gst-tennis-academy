import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyAdmins } from "@/lib/notifications/notifyAdmins";
import { sendBookingCreatedEmailToGestore, sendBookingCreatedEmailToAthlete, sendBookingCreatedEmailToMaestro } from "@/lib/email/booking-notifications";
import { getAdminBookingNotificationLink } from "@/lib/notifications/links";
import { resolveBookingEmailAthleteContext } from "@/lib/bookings/bookingEmailAthleteContext";
import {
  buildCoachNotificationForPrivateLesson,
  buildCoachNotificationForPrivateLessonBatch,
  shouldNotifyCoachForPrivateLesson,
} from "@/lib/bookings/privateLessonNotifications";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * API per creare prenotazioni multiple in una transazione atomica
 * POST /api/bookings/batch
 * Body: { bookings: Array<BookingData> }
 */
export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { bookings } = body;

    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid bookings array" },
        { status: 400 }
      );
    }

    // Validazione base su tutti i booking
    for (const booking of bookings) {
      if (!booking.user_id || !booking.court || !booking.start_time || !booking.end_time) {
        return NextResponse.json(
          { error: "Missing required fields in booking" },
          { status: 400 }
        );
      }
    }

    // Check conflitti per TUTTI gli slot prima di inserire
    const conflicts = [];
    
    for (const booking of bookings) {
      const { data: existingBookings, error: conflictError } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, court, status")
        .eq("court", booking.court)
        .neq("status", "cancelled")
        .neq("status", "rejected")
        .or(`and(start_time.lt.${booking.end_time},end_time.gt.${booking.start_time})`);

      if (conflictError) {
        return NextResponse.json(
          { error: "Error checking conflicts", details: conflictError.message },
          { status: 500 }
        );
      }

      if ((existingBookings || []).length > 0) {
        conflicts.push({
          start_time: booking.start_time,
          court: booking.court,
          conflict_count: existingBookings?.length || 0,
        });
      }
    }

    // Se ci sono conflitti, blocca TUTTA l'operazione
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `${conflicts.length} slot non disponibili`,
          conflicts,
        },
        { status: 409 }
      );
    }

    // Nessun conflitto: inserisci TUTTE le prenotazioni
    const { data: insertedBookings, error: insertError } = await supabase
      .from("bookings")
      .insert(
        bookings.map((b) => ({
          user_id: b.user_id,
          coach_id: b.coach_id || null,
          court: b.court,
          type: b.type || "campo",
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status === "cancelled" || b.status === "cancellation_requested" ? b.status : "confirmed",
          coach_confirmed: true,
          manager_confirmed: true,
          notes: b.notes || null,
        }))
      )
      .select();

    if (insertError) {
      console.error("Batch insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create bookings", details: insertError.message },
        { status: 500 }
      );
    }

    if (insertedBookings && insertedBookings.length > 0) {
      const firstBooking = insertedBookings[0];
      const startDate = new Date(firstBooking.start_time).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const startTime = new Date(firstBooking.start_time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", firstBooking.user_id)
        .single();

      const bookingCount = insertedBookings.length;
      const athleteName = userProfile?.full_name || "Un utente";
      const firstSourceBooking = bookings[0];
      const athleteContextForBatchNotifications = resolveBookingEmailAthleteContext({
        owner: userProfile,
        participants: Array.isArray(firstSourceBooking?.participants) ? firstSourceBooking.participants : [],
        fallbackName: athleteName,
      });
      const countLabel = bookingCount > 1 ? `${bookingCount} prenotazioni` : "una prenotazione";
      const notificationLink = bookingCount === 1
        ? getAdminBookingNotificationLink(firstBooking.id)
        : getAdminBookingNotificationLink();

      await notifyAdmins({
        type: "booking",
        title: bookingCount > 1 ? "Nuove prenotazioni multiple" : "Nuova prenotazione",
        message: `${athleteContextForBatchNotifications.athleteName} ha creato ${countLabel} sul ${firstBooking.court} a partire dal ${startDate} alle ${startTime}`,
        link: notificationLink,
      });

      const privateLessonBookings = insertedBookings.filter((booking) =>
        shouldNotifyCoachForPrivateLesson({
          bookingType: booking.type,
          coachId: booking.coach_id,
        })
      );

      const bookingsByCoach = new Map<string, typeof privateLessonBookings>();
      for (const booking of privateLessonBookings) {
        const coachId = booking.coach_id as string;
        const coachBookings = bookingsByCoach.get(coachId) || [];
        coachBookings.push(booking);
        bookingsByCoach.set(coachId, coachBookings);
      }

      for (const [coachId, coachBookings] of bookingsByCoach.entries()) {
        const sortedCoachBookings = [...coachBookings].sort(
          (left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime()
        );
        const firstCoachBooking = sortedCoachBookings[0];
        const firstCoachBookingIndex = insertedBookings.findIndex((booking) => booking.id === firstCoachBooking.id);
        const firstCoachSourceBooking = firstCoachBookingIndex >= 0 ? bookings[firstCoachBookingIndex] : null;
        const athleteContextForCoachNotification = resolveBookingEmailAthleteContext({
          owner: userProfile,
          participants: Array.isArray(firstCoachSourceBooking?.participants)
            ? firstCoachSourceBooking.participants
            : [],
          fallbackName: athleteName,
        });

        const coachNotification = sortedCoachBookings.length === 1
          ? buildCoachNotificationForPrivateLesson({
              athleteName: athleteContextForCoachNotification.athleteName,
              court: firstCoachBooking.court,
              startTime: firstCoachBooking.start_time,
            })
          : buildCoachNotificationForPrivateLessonBatch({
              athleteName: athleteContextForCoachNotification.athleteName,
              court: firstCoachBooking.court,
              lessonCount: sortedCoachBookings.length,
              firstStartTime: firstCoachBooking.start_time,
            });

        const { error: coachNotificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: coachId,
            ...coachNotification,
            is_read: false,
          });

        if (coachNotificationError) {
          console.error("Failed to create coach private lesson notification:", coachNotificationError);
        }
      }

      if (userProfile?.role === "atleta") {
        const privateLessonCoachIds = Array.from(
          new Set(
            insertedBookings
              .filter((booking) => booking.type === "lezione_privata" && Boolean(booking.coach_id))
              .map((booking) => booking.coach_id as string)
          )
        );

        const participantUserIds = Array.from(
          new Set(
            bookings
              .flatMap((sourceBooking) =>
                Array.isArray(sourceBooking?.participants)
                  ? sourceBooking.participants
                      .map((participant: { user_id?: string | null }) => participant?.user_id)
                      .filter((participantUserId): participantUserId is string => Boolean(participantUserId))
                  : []
              )
          )
        );

        const coachNamesById = new Map<string, string>();
        const participantEmailsById = new Map<string, string>();

        if (privateLessonCoachIds.length > 0) {
          const { data: coachProfiles, error: coachProfilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", privateLessonCoachIds);

          if (coachProfilesError) {
            console.warn("Failed to resolve coach names for booking emails:", coachProfilesError.message);
          } else {
            for (const coachProfile of coachProfiles || []) {
              const normalizedName = coachProfile.full_name?.trim();
              if (!normalizedName) continue;
              coachNamesById.set(coachProfile.id, normalizedName);
            }
          }
        }

        if (participantUserIds.length > 0) {
          const { data: participantProfiles, error: participantProfilesError } = await supabase
            .from("profiles")
            .select("id, email")
            .in("id", participantUserIds);

          if (participantProfilesError) {
            console.warn("Failed to resolve participant emails for booking emails:", participantProfilesError.message);
          } else {
            for (const participantProfile of participantProfiles || []) {
              const normalizedEmail = participantProfile.email?.trim().toLowerCase();
              if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
              participantEmailsById.set(participantProfile.id, normalizedEmail);
            }
          }
        }

        await Promise.all(
          insertedBookings.map((booking, index) => {
            const sourceBooking = bookings[index];
            const participantsCount = Array.isArray(sourceBooking?.participants)
              ? sourceBooking.participants.length
              : 0;
            const bookingMode = booking.type === "campo"
              ? (participantsCount > 2 ? "doppio" : "singolo")
              : undefined;
            const normalizedAthleteName = athleteName.trim().toLowerCase();
            const additionalAthleteNames: string[] = Array.from(
              new Set<string>(
                (Array.isArray(sourceBooking?.participants) ? sourceBooking.participants : [])
                  .map((participant: { full_name?: string | null }) => participant?.full_name?.trim())
                  .filter((name): name is string => Boolean(name))
                  .filter((name) => name.toLowerCase() !== normalizedAthleteName)
              )
            );
            const athleteRecipientEmails = Array.from(
              new Set(
                [
                  userProfile.email?.trim().toLowerCase(),
                  ...(Array.isArray(sourceBooking?.participants) ? sourceBooking.participants : [])
                    .map((participant: { email?: string | null }) => participant?.email?.trim().toLowerCase())
                    .filter((email): email is string => Boolean(email && email.includes("@"))),
                  ...(Array.isArray(sourceBooking?.participants) ? sourceBooking.participants : [])
                    .map((participant: { user_id?: string | null }) => participant?.user_id)
                    .filter((participantUserId): participantUserId is string => Boolean(participantUserId))
                    .map((participantUserId) => participantEmailsById.get(participantUserId))
                    .filter((email): email is string => Boolean(email)),
                ].filter((email): email is string => Boolean(email && email.includes("@")))
              )
            );
            const coachName = booking.type === "lezione_privata" && booking.coach_id
              ? coachNamesById.get(booking.coach_id as string) || null
              : null;

            return sendBookingCreatedEmailToGestore({
              bookingId: booking.id,
              bookedByName: athleteName,
              athleteName,
              athleteEmail: userProfile.email || null,
              athleteRecipientEmails,
              additionalAthleteNames,
              coachId: booking.coach_id || null,
              coachName,
              court: booking.court,
              type: booking.type || "campo",
              bookingMode,
              startTime: booking.start_time,
              endTime: booking.end_time,
              notes: booking.notes || null,
            });
          })
        );
      } else {
        // Gestore/admin batch: send confirmation to athlete + notify maestri for private lessons
        // Resolve coach names once for both athlete emails and maestro emails
        const privateLessonBookingsWithCoach = insertedBookings.filter(
          (b) => b.type === "lezione_privata" && Boolean(b.coach_id)
        );
        const coachNamesForAthleteEmail = new Map<string, string>();
        if (privateLessonBookingsWithCoach.length > 0) {
          const coachIdsForEmail = Array.from(
            new Set(privateLessonBookingsWithCoach.map((b) => b.coach_id as string))
          );
          const { data: coachProfilesForEmail } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", coachIdsForEmail);
          for (const c of coachProfilesForEmail || []) {
            if (c.full_name?.trim()) coachNamesForAthleteEmail.set(c.id, c.full_name.trim());
          }
        }

        await Promise.all(
          insertedBookings.map((booking) => {
            const sourceBooking = bookings[insertedBookings.indexOf(booking)];
            const athleteEmailContext = resolveBookingEmailAthleteContext({
              owner: userProfile,
              participants: Array.isArray(sourceBooking?.participants) ? sourceBooking.participants : [],
              fallbackName: athleteName,
            });
            if (athleteEmailContext.athleteRecipientEmails.length === 0) {
              return Promise.resolve();
            }
              const participantsCount = Array.isArray(sourceBooking?.participants)
                ? sourceBooking.participants.length
                : 0;
            const bookingModeForBatch = booking.type === "campo"
              ? (participantsCount > 2 ? "doppio" : "singolo")
              : undefined;
            return sendBookingCreatedEmailToAthlete({
              bookingId: booking.id,
              bookedByName: userProfile?.full_name || athleteEmailContext.athleteName,
              athleteName: athleteEmailContext.athleteName,
              athleteEmail: athleteEmailContext.athleteEmail,
              athleteRecipientEmails: athleteEmailContext.athleteRecipientEmails,
              additionalAthleteNames: athleteEmailContext.additionalAthleteNames,
              coachId: booking.coach_id || null,
              coachName: booking.type === "lezione_privata" && booking.coach_id
                ? (coachNamesForAthleteEmail.get(booking.coach_id as string) || null)
                : null,
              court: booking.court,
              type: booking.type || "campo",
              bookingMode: bookingModeForBatch,
              startTime: booking.start_time,
              endTime: booking.end_time,
              notes: booking.notes || null,
            });
          })
        );

        if (privateLessonBookingsWithCoach.length > 0) {
          await Promise.all(
            privateLessonBookingsWithCoach.map((booking) => {
              const sourceBooking = bookings[insertedBookings.indexOf(booking)];
              const athleteEmailContext = resolveBookingEmailAthleteContext({
                owner: userProfile,
                participants: Array.isArray(sourceBooking?.participants) ? sourceBooking.participants : [],
                fallbackName: athleteName,
              });

              return sendBookingCreatedEmailToMaestro({
                bookingId: booking.id,
                bookedByName: userProfile?.full_name || athleteEmailContext.athleteName,
                athleteName: athleteEmailContext.athleteName,
                athleteEmail: athleteEmailContext.athleteEmail,
                coachId: booking.coach_id as string,
                coachName: coachNamesForAthleteEmail.get(booking.coach_id as string) || null,
                court: booking.court,
                type: booking.type,
                startTime: booking.start_time,
                endTime: booking.end_time,
                notes: booking.notes || null,
              });
            })
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        bookings: insertedBookings,
        count: insertedBookings?.length || 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Batch booking error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
