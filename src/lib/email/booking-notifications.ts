import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";
import { logEmailDispatch } from "@/lib/email/email-log";
import { getBookingDashboardLinkForRole } from "@/lib/notifications/links";

type SendBookingNotificationInput = {
  bookingId: string;
  athleteName: string;
  athleteEmail?: string | null;
  additionalAthleteNames?: string[];
  coachId?: string | null;
  coachName?: string | null;
  court: string;
  type: string;
  bookingMode?: "singolo" | "doppio";
  startTime: string;
  endTime: string;
  notes?: string | null;
};

type SendBookingDeletionNotificationInput = SendBookingNotificationInput & {
  deletedByName?: string | null;
  deletedByRole?: string | null;
};

type BookingEmailRecipientRole = "gestore" | "maestro";

type BookingEmailRecipient = {
  id: string;
  email: string;
  full_name?: string | null;
  role: BookingEmailRecipientRole;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getGestoreRecipients(): Promise<BookingEmailRecipient[]> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "gestore")
    .not("email", "is", null);

  if (error) {
    logger.error("Failed to fetch gestore recipients for booking emails", error);
    return [];
  }

  const byEmail = new Map<string, BookingEmailRecipient>();

  for (const item of data || []) {
    const normalizedEmail = item.email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
    if (byEmail.has(normalizedEmail)) continue;

    byEmail.set(normalizedEmail, {
      id: item.id,
      email: normalizedEmail,
      full_name: item.full_name || null,
      role: "gestore",
    });
  }

  return Array.from(byEmail.values());
}

async function getCoachRecipient(coachId: string): Promise<BookingEmailRecipient | null> {
  const normalizedCoachId = coachId.trim();
  if (!normalizedCoachId) return null;

  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", normalizedCoachId)
    .single();

  if (error) {
    logger.warn("Failed to fetch coach recipient for booking email", {
      coachId: normalizedCoachId,
      error: error.message,
    });
    return null;
  }

  const normalizedEmail = data?.email?.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    logger.warn("Coach email missing or invalid for booking email", {
      coachId: normalizedCoachId,
    });
    return null;
  }

  return {
    id: data.id,
    email: normalizedEmail,
    full_name: data.full_name || null,
    role: data.role === "gestore" ? "gestore" : "maestro",
  };
}

async function resolveBookingEmailRecipients(
  params: SendBookingNotificationInput
): Promise<BookingEmailRecipient[]> {
  const byEmail = new Map<string, BookingEmailRecipient>();

  const gestori = await getGestoreRecipients();
  for (const recipient of gestori) {
    byEmail.set(recipient.email, recipient);
  }

  if (params.type === "lezione_privata" && params.coachId?.trim()) {
    const coachRecipient = await getCoachRecipient(params.coachId);
    if (coachRecipient && !byEmail.has(coachRecipient.email)) {
      byEmail.set(coachRecipient.email, coachRecipient);
    }
  }

  return Array.from(byEmail.values());
}

export async function sendBookingCreatedEmailToGestore(params: SendBookingNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await resolveBookingEmailRecipients(params);
    if (recipients.length === 0) {
      logger.warn("No recipients found for booking email", {
        bookingId: params.bookingId,
        bookingType: params.type,
        coachId: params.coachId || null,
      });
      return;
    }

    const start = new Date(params.startTime);
    const end = new Date(params.endTime);
    const dateLabel = start.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const startLabel = start.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endLabel = end.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const createdAtLabel = new Date().toLocaleString("it-IT");

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const isCourtBooking = params.type === "campo";
    const bookingMode = isCourtBooking ? (params.bookingMode || "singolo") : null;
    const normalizedAthleteName = params.athleteName.trim().toLowerCase();
    const additionalAthleteNames = Array.from(
      new Set(
        (params.additionalAthleteNames || [])
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
          .filter((name) => name.toLowerCase() !== normalizedAthleteName)
      )
    );
    const additionalAthletesLabel = additionalAthleteNames.join(", ");
    const isPrivateLesson = params.type === "lezione_privata";
    const safeCoachName = isPrivateLesson ? (params.coachName?.trim() || "Non specificato") : "";

    const subject = `Nuova prenotazione registrata - ${params.court} - ${dateLabel} ${startLabel}`;
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const bookingPath = getBookingDashboardLinkForRole(recipient.role, params.bookingId);
        const bookingUrl = `${appBaseUrl}${bookingPath}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;">
            <div style="background: #034863; padding: 14px 18px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 44px; vertical-align: middle;">
                    <img src="${logoUrl}" alt="Logo GST Academy" width="36" height="36" style="display: block; border: 0; outline: none; text-decoration: none; border-radius: 8px;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 10px;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
                    <div style="color: #d9effb; font-size: 12px; margin-top: 2px;">Notifica prenotazione</div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 18px; background: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0b1c2c;">Nuova prenotazione registrata</h2>
              <p style="margin: 0 0 16px 0; color: #334155;">È stata registrata una nuova prenotazione e il calendario campi è stato aggiornato.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
                <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.type)}</td></tr>
                ${bookingMode ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Modalità</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingMode)}</td></tr>` : ""}
                ${additionalAthleteNames.length > 0 ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Altri atleti</strong></td><td style="padding: 8px 10px;">${escapeHtml(additionalAthletesLabel)}</td></tr>` : ""}
                ${isPrivateLesson ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Maestro</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeCoachName)}</td></tr>` : ""}
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Data</strong></td><td style="padding: 8px 10px;">${escapeHtml(dateLabel)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Orario</strong></td><td style="padding: 8px 10px;">${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>ID prenotazione</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.bookingId)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Creata il</strong></td><td style="padding: 8px 10px;">${escapeHtml(createdAtLabel)}</td></tr>
              </table>
              ${notes ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
              <p style="margin: 10px 0 0 0;">
                <a href="${bookingUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri gestione prenotazioni</a>
              </p>
            </div>
          </div>
        `;
        const text = [
          "Nuova prenotazione registrata",
          "",
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${safeAthleteEmail}`,
          `Campo: ${params.court}`,
          `Tipo: ${params.type}`,
          bookingMode ? `Modalità: ${bookingMode}` : "",
          additionalAthleteNames.length > 0 ? `Altri atleti: ${additionalAthletesLabel}` : "",
          isPrivateLesson ? `Maestro: ${safeCoachName}` : "",
          `Data: ${dateLabel}`,
          `Orario: ${startLabel} - ${endLabel}`,
          `ID prenotazione: ${params.bookingId}`,
          `Creata il: ${createdAtLabel}`,
          notes ? `Note: ${notes}` : "",
          "",
          `Apri gestione prenotazioni: ${bookingUrl}`,
        ]
          .filter(Boolean)
          .join("\n");

        const { data, error } = await resend.emails.send({
          from: getEmailFromAddress(),
          to: recipient.email,
          subject,
          html,
          text,
        });

        if (error) {
          logger.error("Failed to send booking email notification", error, {
            bookingId: params.bookingId,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
          });

          await logEmailDispatch({
            recipientEmail: recipient.email,
            recipientName: recipient.full_name || null,
            recipientUserId: recipient.id,
            subject,
            templateName: "booking_created_gestore_notification",
            status: "failed",
            provider: "resend",
            providerMessageId: null,
            errorMessage: (error as { message?: string })?.message || "send_failed",
            metadata: {
              bookingId: params.bookingId,
              actorRole: "atleta",
              recipientRole: recipient.role,
              bookingPath,
              court: params.court,
              bookingMode,
              startTime: params.startTime,
              endTime: params.endTime,
            },
          });

          return { success: false, providerMessageId: null };
        }

        await logEmailDispatch({
          recipientEmail: recipient.email,
          recipientName: recipient.full_name || null,
          recipientUserId: recipient.id,
          subject,
          templateName: "booking_created_gestore_notification",
          status: "sent",
          provider: "resend",
          providerMessageId: data?.id || null,
          metadata: {
            bookingId: params.bookingId,
            actorRole: "atleta",
            recipientRole: recipient.role,
            bookingPath,
            court: params.court,
            bookingMode,
            startTime: params.startTime,
            endTime: params.endTime,
          },
        });

        return { success: true, providerMessageId: data?.id || null };
      })
    );

    const sentResults = results.filter((result) => result.success);

    logger.info("Booking email notification sent", {
      bookingId: params.bookingId,
      recipients: sentResults.length,
      actorEmail: params.athleteEmail || null,
      providerMessageIds: sentResults.map((result) => result.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking email", error, {
      bookingId: params.bookingId,
    });
  }
}

export async function sendBookingDeletedEmailToRecipients(
  params: SendBookingDeletionNotificationInput
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await resolveBookingEmailRecipients(params);
    if (recipients.length === 0) {
      logger.warn("No recipients found for booking deletion email", {
        bookingId: params.bookingId,
        bookingType: params.type,
        coachId: params.coachId || null,
      });
      return;
    }

    const start = new Date(params.startTime);
    const end = new Date(params.endTime);
    const dateLabel = start.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const startLabel = start.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endLabel = end.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const deletedAtLabel = new Date().toLocaleString("it-IT");

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const deletedByName = (params.deletedByName || "Utente piattaforma").trim();
    const deletedByRole = (params.deletedByRole || "utente").trim();
    const isCourtBooking = params.type === "campo";
    const bookingMode = isCourtBooking ? (params.bookingMode || "singolo") : null;
    const normalizedAthleteName = params.athleteName.trim().toLowerCase();
    const additionalAthleteNames = Array.from(
      new Set(
        (params.additionalAthleteNames || [])
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
          .filter((name) => name.toLowerCase() !== normalizedAthleteName)
      )
    );
    const additionalAthletesLabel = additionalAthleteNames.join(", ");
    const isPrivateLesson = params.type === "lezione_privata";
    const safeCoachName = isPrivateLesson ? (params.coachName?.trim() || "Non specificato") : "";

    const subject = `Prenotazione eliminata - ${params.court} - ${dateLabel} ${startLabel}`;
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const bookingPath = getBookingDashboardLinkForRole(recipient.role, params.bookingId);
        const bookingUrl = `${appBaseUrl}${bookingPath}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;">
            <div style="background: #034863; padding: 14px 18px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 44px; vertical-align: middle;">
                    <img src="${logoUrl}" alt="Logo GST Academy" width="36" height="36" style="display: block; border: 0; outline: none; text-decoration: none; border-radius: 8px;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 10px;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
                    <div style="color: #d9effb; font-size: 12px; margin-top: 2px;">Notifica eliminazione prenotazione</div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 18px; background: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #034863;">Prenotazione eliminata</h2>
              <p style="margin: 0 0 16px 0; color: #334155;">Una prenotazione è stata eliminata dal calendario campi.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
                <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Eliminata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(deletedByName)} (${escapeHtml(deletedByRole)})</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.type)}</td></tr>
                ${bookingMode ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Modalità</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingMode)}</td></tr>` : ""}
                ${additionalAthleteNames.length > 0 ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Altri atleti</strong></td><td style="padding: 8px 10px;">${escapeHtml(additionalAthletesLabel)}</td></tr>` : ""}
                ${isPrivateLesson ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Maestro</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeCoachName)}</td></tr>` : ""}
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Data</strong></td><td style="padding: 8px 10px;">${escapeHtml(dateLabel)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Orario</strong></td><td style="padding: 8px 10px;">${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>ID prenotazione</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.bookingId)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Eliminata il</strong></td><td style="padding: 8px 10px;">${escapeHtml(deletedAtLabel)}</td></tr>
              </table>
              ${notes ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
              <p style="margin: 10px 0 0 0;">
                <a href="${bookingUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri gestione prenotazioni</a>
              </p>
            </div>
          </div>
        `;
        const text = [
          "Prenotazione eliminata",
          "",
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${safeAthleteEmail}`,
          `Eliminata da: ${deletedByName} (${deletedByRole})`,
          `Campo: ${params.court}`,
          `Tipo: ${params.type}`,
          bookingMode ? `Modalità: ${bookingMode}` : "",
          additionalAthleteNames.length > 0 ? `Altri atleti: ${additionalAthletesLabel}` : "",
          isPrivateLesson ? `Maestro: ${safeCoachName}` : "",
          `Data: ${dateLabel}`,
          `Orario: ${startLabel} - ${endLabel}`,
          `ID prenotazione: ${params.bookingId}`,
          `Eliminata il: ${deletedAtLabel}`,
          notes ? `Note: ${notes}` : "",
          "",
          `Apri gestione prenotazioni: ${bookingUrl}`,
        ]
          .filter(Boolean)
          .join("\n");

        const { data, error } = await resend.emails.send({
          from: getEmailFromAddress(),
          to: recipient.email,
          subject,
          html,
          text,
        });

        if (error) {
          logger.error("Failed to send booking deletion email notification", error, {
            bookingId: params.bookingId,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
          });

          await logEmailDispatch({
            recipientEmail: recipient.email,
            recipientName: recipient.full_name || null,
            recipientUserId: recipient.id,
            subject,
            templateName: "booking_deleted_recipients_notification",
            status: "failed",
            provider: "resend",
            providerMessageId: null,
            errorMessage: (error as { message?: string })?.message || "send_failed",
            metadata: {
              bookingId: params.bookingId,
              action: "deleted",
              actorRole: deletedByRole,
              recipientRole: recipient.role,
              bookingPath,
              court: params.court,
              bookingMode,
              startTime: params.startTime,
              endTime: params.endTime,
            },
          });

          return { success: false, providerMessageId: null };
        }

        await logEmailDispatch({
          recipientEmail: recipient.email,
          recipientName: recipient.full_name || null,
          recipientUserId: recipient.id,
          subject,
          templateName: "booking_deleted_recipients_notification",
          status: "sent",
          provider: "resend",
          providerMessageId: data?.id || null,
          metadata: {
            bookingId: params.bookingId,
            action: "deleted",
            actorRole: deletedByRole,
            recipientRole: recipient.role,
            bookingPath,
            court: params.court,
            bookingMode,
            startTime: params.startTime,
            endTime: params.endTime,
          },
        });

        return { success: true, providerMessageId: data?.id || null };
      })
    );

    const sentResults = results.filter((result) => result.success);

    logger.info("Booking deletion email notification sent", {
      bookingId: params.bookingId,
      recipients: sentResults.length,
      actorRole: deletedByRole,
      providerMessageIds: sentResults.map((result) => result.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking deletion email", error, {
      bookingId: params.bookingId,
    });
  }
}