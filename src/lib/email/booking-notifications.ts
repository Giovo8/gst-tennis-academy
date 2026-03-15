import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";
import { logEmailDispatch } from "@/lib/email/email-log";

type SendBookingNotificationInput = {
  bookingId: string;
  athleteName: string;
  athleteEmail?: string | null;
  court: string;
  type: string;
  bookingMode?: "singolo" | "doppio";
  startTime: string;
  endTime: string;
  notes?: string | null;
};

type GestoreRecipient = {
  id: string;
  email: string;
  full_name?: string | null;
  role: "gestore";
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getGestoreRecipients(): Promise<GestoreRecipient[]> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "gestore")
    .not("email", "is", null);

  if (error) {
    logger.error("Failed to fetch gestore recipients for booking emails", error);
    return [];
  }

  const byEmail = new Map<string, GestoreRecipient>();

  for (const item of data || []) {
    const normalizedEmail = item.email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
    if (byEmail.has(normalizedEmail)) continue;

    byEmail.set(normalizedEmail, {
      id: item.id,
      email: normalizedEmail,
      full_name: item.full_name || null,
      role: item.role as "gestore",
    });
  }

  return Array.from(byEmail.values());
}

export async function sendBookingCreatedEmailToGestore(params: SendBookingNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await getGestoreRecipients();
    if (recipients.length === 0) {
      logger.warn("No gestore recipients found for booking email", {
        bookingId: params.bookingId,
      });
      return;
    }

    const recipientEmails = recipients.map((recipient) => recipient.email);

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

    const appBaseUrl = env.appUrl.replace(/\/$/, "");
    const bookingUrl = `${appBaseUrl}/dashboard/admin/bookings`;
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const notes = params.notes?.trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const bookingMode = params.bookingMode || "singolo";

    const subject = `Nuova prenotazione registrata - ${params.court} - ${dateLabel} ${startLabel}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #f3f7fa; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;">
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
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Modalità</strong></td><td style="padding: 8px 10px;">${escapeHtml(bookingMode)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Data</strong></td><td style="padding: 8px 10px;">${escapeHtml(dateLabel)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Orario</strong></td><td style="padding: 8px 10px;">${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>ID prenotazione</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.bookingId)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Creata il</strong></td><td style="padding: 8px 10px;">${escapeHtml(createdAtLabel)}</td></tr>
          </table>
          ${notes ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
          <p style="margin: 10px 0 0 0;">
            <a href="${bookingUrl}" style="display: inline-block; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri gestione prenotazioni</a>
          </p>
          <p style="margin: 12px 0 0 0; color: #64748b; font-size: 12px;">Questa notifica è stata inviata automaticamente agli account gestore della piattaforma.</p>
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
      `Modalità: ${bookingMode}`,
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
      to: recipientEmails,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error("Failed to send booking email notification", error, {
        bookingId: params.bookingId,
        recipients: recipientEmails.length,
      });

      await Promise.all(
        recipients.map((recipient) =>
          logEmailDispatch({
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
              court: params.court,
              bookingMode,
              startTime: params.startTime,
              endTime: params.endTime,
            },
          })
        )
      );
      return;
    }

    await Promise.all(
      recipients.map((recipient) =>
        logEmailDispatch({
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
            court: params.court,
            bookingMode,
            startTime: params.startTime,
            endTime: params.endTime,
          },
        })
      )
    );

    logger.info("Booking email notification sent", {
      bookingId: params.bookingId,
      recipients: recipientEmails.length,
      actorEmail: params.athleteEmail || null,
      providerMessageId: data?.id || null,
    });
  } catch (error) {
    logger.error("Unexpected error while sending booking email", error, {
      bookingId: params.bookingId,
    });
  }
}