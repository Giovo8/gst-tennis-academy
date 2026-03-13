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

type AdminRecipient = {
  id: string;
  email: string;
  full_name?: string | null;
  role: "admin" | "gestore";
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getAdminRecipients(): Promise<AdminRecipient[]> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role")
    .in("role", ["admin", "gestore"])
    .not("email", "is", null);

  if (error) {
    logger.error("Failed to fetch admin recipients for booking emails", error);
    return [];
  }

  const byEmail = new Map<string, AdminRecipient>();

  for (const item of data || []) {
    const normalizedEmail = item.email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
    if (byEmail.has(normalizedEmail)) continue;

    byEmail.set(normalizedEmail, {
      id: item.id,
      email: normalizedEmail,
      full_name: item.full_name || null,
      role: item.role as "admin" | "gestore",
    });
  }

  return Array.from(byEmail.values());
}

export async function sendBookingCreatedEmailToAdminAndGestore(params: SendBookingNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await getAdminRecipients();
    if (recipients.length === 0) {
      logger.warn("No admin or gestore recipients found for booking email", {
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

    const bookingUrl = `${env.appUrl.replace(/\/$/, "")}/dashboard/admin/bookings`;
    const notes = params.notes?.trim();
    const safeAthleteEmail = (params.athleteEmail || "n/d").trim();
    const bookingMode = params.bookingMode || "singolo";

    const subject = `Nuova prenotazione atleta - ${params.court} - ${dateLabel} ${startLabel}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #111827; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 14px 18px;">
          <div style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">GST Tennis Academy</div>
          <div style="color: #bfdbfe; font-size: 12px; margin-top: 2px;">Notifica nuova prenotazione</div>
        </div>
        <div style="padding: 18px; background: #ffffff;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px;">Nuova prenotazione atleta</h2>
          <p style="margin-bottom: 16px; color: #334155;">Un atleta ha effettuato una nuova prenotazione in piattaforma.</p>
          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px 0; width: 170px;"><strong>Atleta</strong></td><td style="padding: 6px 0;">${escapeHtml(params.athleteName)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Email atleta</strong></td><td style="padding: 6px 0;">${escapeHtml(safeAthleteEmail)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Campo</strong></td><td style="padding: 6px 0;">${escapeHtml(params.court)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Tipo</strong></td><td style="padding: 6px 0;">${escapeHtml(params.type)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Modalita</strong></td><td style="padding: 6px 0;">${escapeHtml(bookingMode)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Data</strong></td><td style="padding: 6px 0;">${escapeHtml(dateLabel)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Orario</strong></td><td style="padding: 6px 0;">${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>ID prenotazione</strong></td><td style="padding: 6px 0;">${escapeHtml(params.bookingId)}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Creata il</strong></td><td style="padding: 6px 0;">${escapeHtml(createdAtLabel)}</td></tr>
          </table>
          ${notes ? `<p style="margin: 0 0 16px 0;"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
          <p style="margin-top: 10px;">
            <a href="${bookingUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri gestione prenotazioni</a>
          </p>
        </div>
      </div>
    `;

    const text = [
      "Nuova prenotazione atleta",
      "",
      `Atleta: ${params.athleteName}`,
      `Email atleta: ${safeAthleteEmail}`,
      `Campo: ${params.court}`,
      `Tipo: ${params.type}`,
      `Modalita: ${bookingMode}`,
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
            templateName: "booking_created_admin_notification",
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
          templateName: "booking_created_admin_notification",
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