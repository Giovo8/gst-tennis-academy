import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";
import { logEmailDispatch } from "@/lib/email/email-log";
import { getBookingDashboardLinkForRole } from "@/lib/notifications/links";
import {
  getBookingEmailCopy,
  getBookingTypeLabel,
  isPrivateLessonType,
} from "@/lib/email/booking-email-copy";
import { normalizeEmail, escapeHtml, getGestoreRecipients, type EmailRecipient } from "@/lib/email/email-utils";

type SendBookingNotificationInput = {
  bookingId: string;
  bookedByName?: string | null;
  athleteName: string;
  athleteEmail?: string | null;
  athleteRecipientEmails?: string[];
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

type SendBookingUpdateNotificationInput = SendBookingNotificationInput & {
  updatedByName?: string | null;
  updatedByRole?: string | null;
  /** Valori precedenti, usati per evidenziare cosa e cambiato. */
  previous?: {
    court?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
};

type BookingEmailRecipient = EmailRecipient;

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

  const normalizedEmail = normalizeEmail(data?.email);
  if (!normalizedEmail) {
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

function getAthleteRecipientsFromInput(params: SendBookingNotificationInput): BookingEmailRecipient[] {
  const emails = [params.athleteEmail, ...(params.athleteRecipientEmails || [])]
    .map((email) => normalizeEmail(email))
    .filter((email): email is string => Boolean(email));

  const uniqueEmails = Array.from(new Set(emails));

  return uniqueEmails.map((email) => ({
    id: null,
    email,
    full_name: null,
    role: "atleta",
  }));
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

  const athleteRecipients = getAthleteRecipientsFromInput(params);
  for (const recipient of athleteRecipients) {
    if (!byEmail.has(recipient.email)) {
      byEmail.set(recipient.email, recipient);
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
      timeZone: "Europe/Rome",
    });
    const startLabel = start.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const endLabel = end.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const createdAtLabel = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeBookedByName = (params.bookedByName || params.athleteName || "Utente piattaforma").trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const bookingTypeLabel = getBookingTypeLabel(params.type);
    const bookingEmailCopy = getBookingEmailCopy({ action: "created", bookingType: params.type });
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
    const isPrivateLesson = isPrivateLessonType(params.type);
    const safeCoachName = isPrivateLesson ? (params.coachName?.trim() || "Non specificato") : "";

    const subject = `${bookingEmailCopy.subjectPrefix} - ${params.court} - ${dateLabel} ${startLabel}`;
    const athleteRecipient = recipients.find((recipient) => recipient.role === "atleta");
    const gestoriRecipients = recipients.filter((recipient) => recipient.role === "gestore");
    const maestriRecipients = recipients.filter((recipient) => recipient.role === "maestro");
    const segreteriaRecipient = gestoriRecipients[0];
    const ccRecipientsForSegreteria = Array.from(
      new Set([
        ...gestoriRecipients.slice(1).map((recipient) => recipient.email),
        ...maestriRecipients.map((recipient) => recipient.email),
      ])
    ).filter((email) => email !== segreteriaRecipient?.email);

    const deliveryTargets: Array<{ recipient: BookingEmailRecipient; cc?: string[] }> = [];
    if (athleteRecipient) {
      deliveryTargets.push({ recipient: athleteRecipient });
    }
    if (segreteriaRecipient) {
      deliveryTargets.push({
        recipient: segreteriaRecipient,
        cc: ccRecipientsForSegreteria,
      });
    }

    if (deliveryTargets.length === 0) {
      logger.warn("No eligible recipients found for booking email dispatch", {
        bookingId: params.bookingId,
        recipientsCount: recipients.length,
      });
      return;
    }

    const results = await Promise.all(
      deliveryTargets.map(async (target) => {
        const recipient = target.recipient;
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
                    <div style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 18px; background: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0b1c2c;">${bookingEmailCopy.title}</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
                <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeBookedByName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingTypeLabel)}</td></tr>
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
          bookingEmailCopy.textLead,
          "",
          `Prenotata da: ${safeBookedByName}`,
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${safeAthleteEmail}`,
          `Campo: ${params.court}`,
          `Tipo: ${bookingTypeLabel}`,
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
          cc: target.cc && target.cc.length > 0 ? target.cc : undefined,
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
            templateName:
              recipient.role === "atleta"
                ? "booking_created_athlete_notification"
                : "booking_created_gestore_notification",
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
              ccRecipients: target.cc || [],
            },
          });

          return { success: false, providerMessageId: null };
        }

        await logEmailDispatch({
          recipientEmail: recipient.email,
          recipientName: recipient.full_name || null,
          recipientUserId: recipient.id,
          subject,
          templateName:
            recipient.role === "atleta"
              ? "booking_created_athlete_notification"
              : "booking_created_gestore_notification",
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
            ccRecipients: target.cc || [],
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
      ccRecipientsForSegreteria,
      providerMessageIds: sentResults.map((result) => result.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking email", error, {
      bookingId: params.bookingId,
    });
  }
}

/**
 * Invia una email di conferma prenotazione direttamente all'atleta quando la
 * prenotazione è creata da un gestore o admin.
 */
export async function sendBookingCreatedEmailToAthlete(params: SendBookingNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const athleteRecipients = getAthleteRecipientsFromInput(params);
    if (athleteRecipients.length === 0) {
      logger.warn("No athlete recipients for booking confirmation email", {
        bookingId: params.bookingId,
        bookingType: params.type,
      });
      return;
    }

    const start = new Date(params.startTime);
    const end = new Date(params.endTime);
    const dateLabel = start.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Rome",
    });
    const startLabel = start.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const endLabel = end.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const createdAtLabel = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeBookedByName = (params.bookedByName || params.athleteName || "Utente piattaforma").trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const bookingTypeLabel = getBookingTypeLabel(params.type);
    const bookingEmailCopy = getBookingEmailCopy({ action: "created", bookingType: params.type });
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
    const isPrivateLesson = isPrivateLessonType(params.type);
    const safeCoachName = isPrivateLesson ? (params.coachName?.trim() || "Non specificato") : "";

    const subject = `${bookingEmailCopy.subjectPrefix} - ${params.court} - ${dateLabel} ${startLabel}`;

    const results = await Promise.all(
      athleteRecipients.map(async (recipient) => {
        const bookingPath = getBookingDashboardLinkForRole("atleta", params.bookingId);
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
                    <div style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 18px; background: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0b1c2c;">${bookingEmailCopy.title}</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
                <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeBookedByName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingTypeLabel)}</td></tr>
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
                <a href="${bookingUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri le mie prenotazioni</a>
              </p>
            </div>
          </div>
        `;
        const text = [
          bookingEmailCopy.textLead,
          "",
          `Prenotata da: ${safeBookedByName}`,
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${safeAthleteEmail}`,
          `Campo: ${params.court}`,
          `Tipo: ${bookingTypeLabel}`,
          bookingMode ? `Modalità: ${bookingMode}` : "",
          additionalAthleteNames.length > 0 ? `Altri atleti: ${additionalAthletesLabel}` : "",
          isPrivateLesson ? `Maestro: ${safeCoachName}` : "",
          `Data: ${dateLabel}`,
          `Orario: ${startLabel} - ${endLabel}`,
          `ID prenotazione: ${params.bookingId}`,
          `Creata il: ${createdAtLabel}`,
          notes ? `Note: ${notes}` : "",
          "",
          `Apri le mie prenotazioni: ${bookingUrl}`,
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
          logger.error("Failed to send booking confirmation email to athlete", error, {
            bookingId: params.bookingId,
            recipientEmail: recipient.email,
          });

          await logEmailDispatch({
            recipientEmail: recipient.email,
            recipientName: recipient.full_name || null,
            recipientUserId: recipient.id,
            subject,
            templateName: "booking_created_athlete_notification",
            status: "failed",
            provider: "resend",
            providerMessageId: null,
            errorMessage: (error as { message?: string })?.message || "send_failed",
            metadata: {
              bookingId: params.bookingId,
              actorRole: "gestore",
              recipientRole: "atleta",
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
          templateName: "booking_created_athlete_notification",
          status: "sent",
          provider: "resend",
          providerMessageId: data?.id || null,
          metadata: {
            bookingId: params.bookingId,
            actorRole: "gestore",
            recipientRole: "atleta",
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

    const sentResults = results.filter((r) => r.success);
    logger.info("Booking confirmation email sent to athlete", {
      bookingId: params.bookingId,
      recipients: sentResults.length,
      providerMessageIds: sentResults.map((r) => r.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking confirmation email to athlete", error, {
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
      timeZone: "Europe/Rome",
    });
    const startLabel = start.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const endLabel = end.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const deletedAtLabel = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeBookedByName = (params.bookedByName || params.athleteName || "Utente piattaforma").trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const bookingTypeLabel = getBookingTypeLabel(params.type);
    const bookingEmailCopy = getBookingEmailCopy({ action: "deleted", bookingType: params.type });
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
    const isPrivateLesson = isPrivateLessonType(params.type);
    const safeCoachName = isPrivateLesson ? (params.coachName?.trim() || "Non specificato") : "";

    const subject = `${bookingEmailCopy.subjectPrefix} - ${params.court} - ${dateLabel} ${startLabel}`;
    const athleteRecipient = recipients.find((recipient) => recipient.role === "atleta");
    const gestoriRecipients = recipients.filter((recipient) => recipient.role === "gestore");
    const maestriRecipients = recipients.filter((recipient) => recipient.role === "maestro");
    const segreteriaRecipient = gestoriRecipients[0];
    const ccRecipientsForSegreteria = Array.from(
      new Set([
        ...gestoriRecipients.slice(1).map((recipient) => recipient.email),
        ...maestriRecipients.map((recipient) => recipient.email),
      ])
    ).filter((email) => email !== segreteriaRecipient?.email);

    const deliveryTargets: Array<{ recipient: BookingEmailRecipient; cc?: string[] }> = [];
    if (athleteRecipient) {
      deliveryTargets.push({ recipient: athleteRecipient });
    }
    if (segreteriaRecipient) {
      deliveryTargets.push({
        recipient: segreteriaRecipient,
        cc: ccRecipientsForSegreteria,
      });
    }

    if (deliveryTargets.length === 0) {
      logger.warn("No eligible recipients found for booking deletion email dispatch", {
        bookingId: params.bookingId,
        recipientsCount: recipients.length,
      });
      return;
    }

    const results = await Promise.all(
      deliveryTargets.map(async (target) => {
        const recipient = target.recipient;
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
                    <div style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 18px; background: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #034863;">${bookingEmailCopy.title}</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
                <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Eliminata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(deletedByName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingTypeLabel)}</td></tr>
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
          bookingEmailCopy.textLead,
          "",
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${safeAthleteEmail}`,
          `Eliminata da: ${deletedByName}`,
          `Campo: ${params.court}`,
          `Tipo: ${bookingTypeLabel}`,
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
          cc: target.cc && target.cc.length > 0 ? target.cc : undefined,
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
            templateName:
              recipient.role === "atleta"
                ? "booking_deleted_athlete_notification"
                : "booking_deleted_recipients_notification",
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
              ccRecipients: target.cc || [],
            },
          });

          return { success: false, providerMessageId: null };
        }

        await logEmailDispatch({
          recipientEmail: recipient.email,
          recipientName: recipient.full_name || null,
          recipientUserId: recipient.id,
          subject,
          templateName:
            recipient.role === "atleta"
              ? "booking_deleted_athlete_notification"
              : "booking_deleted_recipients_notification",
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
            ccRecipients: target.cc || [],
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
      ccRecipientsForSegreteria,
      providerMessageIds: sentResults.map((result) => result.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking deletion email", error, {
      bookingId: params.bookingId,
    });
  }
}

/**
 * Invia una email di notifica quando una prenotazione viene modificata
 * (spostata, ridimensionata o aggiornata dalla pagina di modifica).
 * Evidenzia campo e orario precedenti quando sono effettivamente cambiati.
 */
export async function sendBookingUpdatedEmailToRecipients(
  params: SendBookingUpdateNotificationInput
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await resolveBookingEmailRecipients(params);
    if (recipients.length === 0) {
      logger.warn("No recipients found for booking update email", {
        bookingId: params.bookingId,
        bookingType: params.type,
        coachId: params.coachId || null,
      });
      return;
    }

    const formatDate = (value: Date) =>
      value.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Europe/Rome",
      });
    const formatTime = (value: Date) =>
      value.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome",
      });

    const start = new Date(params.startTime);
    const end = new Date(params.endTime);
    const dateLabel = formatDate(start);
    const startLabel = formatTime(start);
    const endLabel = formatTime(end);
    const updatedAtLabel = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    // Confronto con i valori precedenti: mostriamo una riga "prima" solo per
    // cio che e realmente cambiato, per non appesantire l'email.
    const previousCourt = params.previous?.court?.trim() || null;
    const courtChanged = Boolean(previousCourt && previousCourt !== params.court.trim());
    const previousStart = params.previous?.startTime ? new Date(params.previous.startTime) : null;
    const previousEnd = params.previous?.endTime ? new Date(params.previous.endTime) : null;
    const scheduleChanged = Boolean(
      (previousStart && previousStart.getTime() !== start.getTime()) ||
        (previousEnd && previousEnd.getTime() !== end.getTime())
    );
    const previousScheduleLabel =
      previousStart && previousEnd
        ? `${formatDate(previousStart)} ${formatTime(previousStart)} - ${formatTime(previousEnd)}`
        : null;

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const bookingTypeLabel = getBookingTypeLabel(params.type);
    const bookingEmailCopy = getBookingEmailCopy({ action: "updated", bookingType: params.type });
    const updatedByName = (params.updatedByName || "Utente piattaforma").trim();
    const updatedByRole = (params.updatedByRole || "utente").trim();
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
    const isPrivateLesson = isPrivateLessonType(params.type);
    const safeCoachName = isPrivateLesson ? (params.coachName?.trim() || "Non specificato") : "";

    const subject = `${bookingEmailCopy.subjectPrefix} - ${params.court} - ${dateLabel} ${startLabel}`;
    const athleteRecipient = recipients.find((recipient) => recipient.role === "atleta");
    const gestoriRecipients = recipients.filter((recipient) => recipient.role === "gestore");
    const maestriRecipients = recipients.filter((recipient) => recipient.role === "maestro");
    const segreteriaRecipient = gestoriRecipients[0];
    const ccRecipientsForSegreteria = Array.from(
      new Set([
        ...gestoriRecipients.slice(1).map((recipient) => recipient.email),
        ...maestriRecipients.map((recipient) => recipient.email),
      ])
    ).filter((email) => email !== segreteriaRecipient?.email);

    const deliveryTargets: Array<{ recipient: BookingEmailRecipient; cc?: string[] }> = [];
    if (athleteRecipient) {
      deliveryTargets.push({ recipient: athleteRecipient });
    }
    if (segreteriaRecipient) {
      deliveryTargets.push({
        recipient: segreteriaRecipient,
        cc: ccRecipientsForSegreteria,
      });
    }

    if (deliveryTargets.length === 0) {
      logger.warn("No eligible recipients found for booking update email dispatch", {
        bookingId: params.bookingId,
        recipientsCount: recipients.length,
      });
      return;
    }

    const results = await Promise.all(
      deliveryTargets.map(async (target) => {
        const recipient = target.recipient;
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
                    <div style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 18px; background: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #034863;">${bookingEmailCopy.title}</h2>
              <p style="margin: 0 0 14px 0;">${escapeHtml(bookingEmailCopy.intro)}</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
                <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Modificata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(updatedByName)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
                ${courtChanged ? `<tr><td style="padding: 8px 10px; background: #fff7ed;"><strong>Campo precedente</strong></td><td style="padding: 8px 10px; color: #9a3412; text-decoration: line-through;">${escapeHtml(previousCourt || "")}</td></tr>` : ""}
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingTypeLabel)}</td></tr>
                ${bookingMode ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Modalità</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingMode)}</td></tr>` : ""}
                ${additionalAthleteNames.length > 0 ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Altri atleti</strong></td><td style="padding: 8px 10px;">${escapeHtml(additionalAthletesLabel)}</td></tr>` : ""}
                ${isPrivateLesson ? `<tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Maestro</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeCoachName)}</td></tr>` : ""}
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Data</strong></td><td style="padding: 8px 10px;">${escapeHtml(dateLabel)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Orario</strong></td><td style="padding: 8px 10px;">${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</td></tr>
                ${scheduleChanged && previousScheduleLabel ? `<tr><td style="padding: 8px 10px; background: #fff7ed;"><strong>Orario precedente</strong></td><td style="padding: 8px 10px; color: #9a3412; text-decoration: line-through;">${escapeHtml(previousScheduleLabel)}</td></tr>` : ""}
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>ID prenotazione</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.bookingId)}</td></tr>
                <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Modificata il</strong></td><td style="padding: 8px 10px;">${escapeHtml(updatedAtLabel)}</td></tr>
              </table>
              ${notes ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
              <p style="margin: 10px 0 0 0;">
                <a href="${bookingUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri gestione prenotazioni</a>
              </p>
            </div>
          </div>
        `;
        const text = [
          bookingEmailCopy.textLead,
          "",
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${safeAthleteEmail}`,
          `Modificata da: ${updatedByName}`,
          `Campo: ${params.court}`,
          courtChanged ? `Campo precedente: ${previousCourt}` : "",
          `Tipo: ${bookingTypeLabel}`,
          bookingMode ? `Modalità: ${bookingMode}` : "",
          additionalAthleteNames.length > 0 ? `Altri atleti: ${additionalAthletesLabel}` : "",
          isPrivateLesson ? `Maestro: ${safeCoachName}` : "",
          `Data: ${dateLabel}`,
          `Orario: ${startLabel} - ${endLabel}`,
          scheduleChanged && previousScheduleLabel ? `Orario precedente: ${previousScheduleLabel}` : "",
          `ID prenotazione: ${params.bookingId}`,
          `Modificata il: ${updatedAtLabel}`,
          notes ? `Note: ${notes}` : "",
          "",
          `Apri gestione prenotazioni: ${bookingUrl}`,
        ]
          .filter(Boolean)
          .join("\n");

        const templateName =
          recipient.role === "atleta"
            ? "booking_updated_athlete_notification"
            : "booking_updated_recipients_notification";
        const dispatchMetadata = {
          bookingId: params.bookingId,
          action: "updated",
          actorRole: updatedByRole,
          recipientRole: recipient.role,
          bookingPath,
          court: params.court,
          bookingMode,
          startTime: params.startTime,
          endTime: params.endTime,
          courtChanged,
          scheduleChanged,
          ccRecipients: target.cc || [],
        };

        const { data, error } = await resend.emails.send({
          from: getEmailFromAddress(),
          to: recipient.email,
          cc: target.cc && target.cc.length > 0 ? target.cc : undefined,
          subject,
          html,
          text,
        });

        if (error) {
          logger.error("Failed to send booking update email notification", error, {
            bookingId: params.bookingId,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
          });

          await logEmailDispatch({
            recipientEmail: recipient.email,
            recipientName: recipient.full_name || null,
            recipientUserId: recipient.id,
            subject,
            templateName,
            status: "failed",
            provider: "resend",
            providerMessageId: null,
            errorMessage: (error as { message?: string })?.message || "send_failed",
            metadata: dispatchMetadata,
          });

          return { success: false, providerMessageId: null };
        }

        await logEmailDispatch({
          recipientEmail: recipient.email,
          recipientName: recipient.full_name || null,
          recipientUserId: recipient.id,
          subject,
          templateName,
          status: "sent",
          provider: "resend",
          providerMessageId: data?.id || null,
          metadata: dispatchMetadata,
        });

        return { success: true, providerMessageId: data?.id || null };
      })
    );

    const sentResults = results.filter((result) => result.success);

    logger.info("Booking update email notification sent", {
      bookingId: params.bookingId,
      recipients: sentResults.length,
      actorRole: updatedByRole,
      courtChanged,
      scheduleChanged,
      providerMessageIds: sentResults.map((result) => result.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking update email", error, {
      bookingId: params.bookingId,
    });
  }
}

/**
 * Invia una email di notifica direttamente al maestro quando una lezione privata
 * viene creata da un gestore o admin (non da un atleta).
 */
export async function sendBookingCreatedEmailToMaestro(params: SendBookingNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    if (!params.coachId?.trim()) {
      logger.warn("sendBookingCreatedEmailToMaestro called without coachId", {
        bookingId: params.bookingId,
      });
      return;
    }

    const coachRecipient = await getCoachRecipient(params.coachId);
    if (!coachRecipient) {
      logger.warn("Coach recipient not found for maestro email", {
        bookingId: params.bookingId,
        coachId: params.coachId,
      });
      return;
    }

    const start = new Date(params.startTime);
    const end = new Date(params.endTime);
    const dateLabel = start.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Rome",
    });
    const startLabel = start.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const endLabel = end.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const createdAtLabel = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const safeBookedByName = (params.bookedByName || params.athleteName || "Utente piattaforma").trim();
    const bookingTypeLabel = getBookingTypeLabel(params.type);
    const bookingEmailCopy = getBookingEmailCopy({ action: "created", bookingType: params.type });
    const safeCoachName = params.coachName?.trim() || "Non specificato";

    const subject = `${bookingEmailCopy.subjectPrefix} - ${params.court} - ${dateLabel} ${startLabel}`;
    const bookingPath = getBookingDashboardLinkForRole("maestro", params.bookingId);
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
                <div style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">GST Academy</div>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 18px; background: #ffffff;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0b1c2c;">${bookingEmailCopy.title}</h2>
          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
            <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Prenotata da</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeBookedByName)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.athleteName)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email atleta</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeAthleteEmail)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Campo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.court)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Tipo</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingTypeLabel)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Maestro</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeCoachName)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Data</strong></td><td style="padding: 8px 10px;">${escapeHtml(dateLabel)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Orario</strong></td><td style="padding: 8px 10px;">${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>ID prenotazione</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.bookingId)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Creata il</strong></td><td style="padding: 8px 10px;">${escapeHtml(createdAtLabel)}</td></tr>
          </table>
          ${notes ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
          <p style="margin: 10px 0 0 0;">
            <a href="${bookingUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri la tua agenda</a>
          </p>
        </div>
      </div>
    `;

    const text = [
      bookingEmailCopy.textLead,
      "",
      `Prenotata da: ${safeBookedByName}`,
      `Atleta: ${params.athleteName}`,
      `Email atleta: ${safeAthleteEmail}`,
      `Campo: ${params.court}`,
      `Tipo: ${bookingTypeLabel}`,
      `Maestro: ${safeCoachName}`,
      `Data: ${dateLabel}`,
      `Orario: ${startLabel} - ${endLabel}`,
      `ID prenotazione: ${params.bookingId}`,
      `Creata il: ${createdAtLabel}`,
      notes ? `Note: ${notes}` : "",
      "",
      `Apri la tua agenda: ${bookingUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data, error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: coachRecipient.email,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error("Failed to send booking email notification to maestro", error, {
        bookingId: params.bookingId,
        coachId: params.coachId,
        recipientEmail: coachRecipient.email,
      });

      await logEmailDispatch({
        recipientEmail: coachRecipient.email,
        recipientName: coachRecipient.full_name || null,
        recipientUserId: coachRecipient.id,
        subject,
        templateName: "booking_created_maestro_notification",
        status: "failed",
        provider: "resend",
        providerMessageId: null,
        errorMessage: (error as { message?: string })?.message || "send_failed",
        metadata: {
          bookingId: params.bookingId,
          actorRole: "gestore",
          recipientRole: "maestro",
          bookingPath,
          court: params.court,
          startTime: params.startTime,
          endTime: params.endTime,
        },
      });

      return;
    }

    await logEmailDispatch({
      recipientEmail: coachRecipient.email,
      recipientName: coachRecipient.full_name || null,
      recipientUserId: coachRecipient.id,
      subject,
      templateName: "booking_created_maestro_notification",
      status: "sent",
      provider: "resend",
      providerMessageId: data?.id || null,
      metadata: {
        bookingId: params.bookingId,
        actorRole: "gestore",
        recipientRole: "maestro",
        bookingPath,
        court: params.court,
        startTime: params.startTime,
        endTime: params.endTime,
      },
    });

    logger.info("Booking email notification sent to maestro", {
      bookingId: params.bookingId,
      coachId: params.coachId,
      maestroEmail: coachRecipient.email,
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking email to maestro", error, {
      bookingId: params.bookingId,
    });
  }
}