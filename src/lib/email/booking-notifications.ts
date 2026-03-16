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

type BookingEmailRecipientRole = "gestore" | "maestro" | "atleta";

type BookingEmailRecipient = {
  id?: string | null;
  email: string;
  full_name?: string | null;
  role: BookingEmailRecipientRole;
};

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized;
}

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
    const normalizedEmail = normalizeEmail(item.email);
    if (!normalizedEmail) continue;
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
      logger.warn("No recipients found for booking deletion email", {
        bookingId: params.bookingId,
        bookingType: params.type,
        coachId: params.coachId || null,
      });
      return;
    }

    const gestori = recipients.filter(r => r.role === "gestore");
    const atleti = recipients.filter(r => r.role === "atleta");

    // Mail per atleta principale (solo a lui, nessun CC)
    if (atleti.length > 0) {
      const atleta = atleti[0];
      const bookingPath = getBookingDashboardLinkForRole(atleta.role, params.bookingId);
      const bookingUrl = `${env.publicSiteUrl.replace(/\/$/, "")}${bookingPath}`;
      const html = /* ...existing code for html ... */
        `<div style=\"font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;\">` +
        // ...existing code for html...
        `</div>`;
      const text = [
        "Prenotazione eliminata",
        "",
        `Atleta: ${params.athleteName}`,
        `Email atleta: ${(params.athleteEmail || "n/d").trim()}`,
        `Eliminata da: ${(params.deletedByName || "Utente piattaforma").trim()} (${(params.deletedByRole || "utente").trim()})`,
        `Campo: ${params.court}`,
        `Tipo: ${params.type}`,
        params.bookingMode ? `Modalità: ${params.bookingMode}` : "",
        (params.additionalAthleteNames || []).length > 0 ? `Altri atleti: ${(params.additionalAthleteNames || []).join(", ")}` : "",
        params.type === "lezione_privata" ? `Maestro: ${params.coachName?.trim() || "Non specificato"}` : "",
        `Data: ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
        `Orario: ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} - ${new Date(params.endTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
        `ID prenotazione: ${params.bookingId}`,
        `Eliminata il: ${new Date().toLocaleString("it-IT")}`,
        params.notes ? `Note: ${params.notes}` : "",
        "",
        `Apri gestione prenotazioni: ${bookingUrl}`,
      ].filter(Boolean).join("\n");
      await resend.emails.send({
        from: getEmailFromAddress(),
        to: atleta.email,
        subject: `Prenotazione eliminata - ${params.court} - ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })} ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
        html,
        text,
      });
    }

    // Mail per segreteria (gestore principale) con altri gestori in CC
    if (gestori.length > 0) {
      const segreteria = gestori[0];
      const ccGestori = gestori.slice(1).map(g => g.email);
      const bookingPath = getBookingDashboardLinkForRole(segreteria.role, params.bookingId);
      const bookingUrl = `${env.publicSiteUrl.replace(/\/$/, "")}${bookingPath}`;
      const html = /* ...existing code for html ... */
        `<div style=\"font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;\">` +
        // ...existing code for html...
        `</div>`;
      const text = [
        "Prenotazione eliminata",
        "",
        `Atleta: ${params.athleteName}`,
        `Email atleta: ${(params.athleteEmail || "n/d").trim()}`,
        `Eliminata da: ${(params.deletedByName || "Utente piattaforma").trim()} (${(params.deletedByRole || "utente").trim()})`,
        `Campo: ${params.court}`,
        `Tipo: ${params.type}`,
        params.bookingMode ? `Modalità: ${params.bookingMode}` : "",
        (params.additionalAthleteNames || []).length > 0 ? `Altri atleti: ${(params.additionalAthleteNames || []).join(", ")}` : "",
        params.type === "lezione_privata" ? `Maestro: ${params.coachName?.trim() || "Non specificato"}` : "",
        `Data: ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
        `Orario: ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} - ${new Date(params.endTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
        `ID prenotazione: ${params.bookingId}`,
        `Eliminata il: ${new Date().toLocaleString("it-IT")}`,
        params.notes ? `Note: ${params.notes}` : "",
        "",
        `Apri gestione prenotazioni: ${bookingUrl}`,
      ].filter(Boolean).join("\n");
      await resend.emails.send({
        from: getEmailFromAddress(),
        to: segreteria.email,
        cc: ccGestori,
        subject: `Prenotazione eliminata - ${params.court} - ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })} ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
        html,
        text,
      });
    }
      }

      // Separazione destinatari
      const gestori = recipients.filter(r => r.role === "gestore");
      const atleti = recipients.filter(r => r.role === "atleta");

      // Mail per atleta principale (solo a lui, nessun CC)
      if (atleti.length > 0) {
        const atleta = atleti[0];
        const bookingPath = getBookingDashboardLinkForRole(atleta.role, params.bookingId);
        const bookingUrl = `${env.publicSiteUrl.replace(/\/$/, "")}${bookingPath}`;
        const html = /* ...existing code for html ... */
          `<div style=\"font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;\">` +
          // ...existing code for html...
          `</div>`;
        const text = [
          "Nuova prenotazione registrata",
          "",
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${(params.athleteEmail || "n/d").trim()}`,
          `Campo: ${params.court}`,
          `Tipo: ${params.type}`,
          params.bookingMode ? `Modalità: ${params.bookingMode}` : "",
          (params.additionalAthleteNames || []).length > 0 ? `Altri atleti: ${(params.additionalAthleteNames || []).join(", ")}` : "",
          params.type === "lezione_privata" ? `Maestro: ${params.coachName?.trim() || "Non specificato"}` : "",
          `Data: ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
          `Orario: ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} - ${new Date(params.endTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          `ID prenotazione: ${params.bookingId}`,
          `Creata il: ${new Date().toLocaleString("it-IT")}`,
          params.notes ? `Note: ${params.notes}` : "",
          "",
          `Apri gestione prenotazioni: ${bookingUrl}`,
        ].filter(Boolean).join("\n");
        await resend.emails.send({
          from: getEmailFromAddress(),
          to: atleta.email,
          subject: `Nuova prenotazione registrata - ${params.court} - ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })} ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          html,
          text,
        });
      }

      // Mail per segreteria (gestore principale) con altri gestori in CC
      if (gestori.length > 0) {
        const segreteria = gestori[0];
        const ccGestori = gestori.slice(1).map(g => g.email);
        const bookingPath = getBookingDashboardLinkForRole(segreteria.role, params.bookingId);
        const bookingUrl = `${env.publicSiteUrl.replace(/\/$/, "")}${bookingPath}`;
        const html = /* ...existing code for html ... */
          `<div style=\"font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #dbe7ef; border-radius: 12px; overflow: hidden;\">` +
          // ...existing code for html...
          `</div>`;
        const text = [
          "Nuova prenotazione registrata",
          "",
          `Atleta: ${params.athleteName}`,
          `Email atleta: ${(params.athleteEmail || "n/d").trim()}`,
          `Campo: ${params.court}`,
          `Tipo: ${params.type}`,
          params.bookingMode ? `Modalità: ${params.bookingMode}` : "",
          (params.additionalAthleteNames || []).length > 0 ? `Altri atleti: ${(params.additionalAthleteNames || []).join(", ")}` : "",
          params.type === "lezione_privata" ? `Maestro: ${params.coachName?.trim() || "Non specificato"}` : "",
          `Data: ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
          `Orario: ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} - ${new Date(params.endTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          `ID prenotazione: ${params.bookingId}`,
          `Creata il: ${new Date().toLocaleString("it-IT")}`,
          params.notes ? `Note: ${params.notes}` : "",
          "",
          `Apri gestione prenotazioni: ${bookingUrl}`,
        ].filter(Boolean).join("\n");
        await resend.emails.send({
          from: getEmailFromAddress(),
          to: segreteria.email,
          cc: ccGestori,
          subject: `Nuova prenotazione registrata - ${params.court} - ${new Date(params.startTime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })} ${new Date(params.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          html,
          text,
        });
      }

      // ...logging e gestione errori possono essere aggiunti qui se necessario...
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