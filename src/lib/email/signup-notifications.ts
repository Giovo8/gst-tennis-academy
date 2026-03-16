import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";
import { logEmailDispatch } from "@/lib/email/email-log";
import { getUsersDashboardLinkForRole } from "@/lib/notifications/links";

type SendSignupNotificationInput = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string | null;
  inviteCode?: string | null;
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
    logger.error("Failed to fetch gestore recipients for signup emails", error);
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
      role: "gestore",
    });
  }

  return Array.from(byEmail.values());
}

export async function sendSignupEmailToGestori(params: SendSignupNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await getGestoreRecipients();
    if (recipients.length === 0) {
      logger.warn("No gestore recipients found for signup email", {
        userId: params.userId,
      });
      return;
    }

    const recipientEmails = recipients.map((recipient) => recipient.email);
    const registeredAtLabel = new Date().toLocaleString("it-IT");
    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const userUrl = `${appBaseUrl}${getUsersDashboardLinkForRole("gestore", params.userId)}`;
    const usersUrl = `${appBaseUrl}${getUsersDashboardLinkForRole("gestore")}`;
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const safePhone = params.phone?.trim() || "n/d";
    const safeInviteCode = params.inviteCode?.trim() || "n/d";

    const subject = `Nuova registrazione utente - ${params.fullName}`;

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
                <div style="color: #d9effb; font-size: 12px; margin-top: 2px;">Notifica registrazione utente</div>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 18px; background: #ffffff;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0b1c2c;">Nuova registrazione completata</h2>
          <p style="margin: 0 0 16px 0; color: #334155;">Un nuovo utente si è registrato con successo sulla piattaforma.</p>
          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #edf2f7;">
            <tr><td style="padding: 8px 10px; width: 170px; background: #f8fbfd;"><strong>Nome completo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.fullName)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Email</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.email)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Ruolo</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.role)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Telefono</strong></td><td style="padding: 8px 10px;">${escapeHtml(safePhone)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Invite code</strong></td><td style="padding: 8px 10px;">${escapeHtml(safeInviteCode)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>ID utente</strong></td><td style="padding: 8px 10px;">${escapeHtml(params.userId)}</td></tr>
            <tr><td style="padding: 8px 10px; background: #f8fbfd;"><strong>Registrato il</strong></td><td style="padding: 8px 10px;">${escapeHtml(registeredAtLabel)}</td></tr>
          </table>
          <p style="margin: 10px 0 0 0;">
            <a href="${userUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri dettaglio utente</a>
          </p>
          <p style="margin: 10px 0 0 0;">
            <a href="${usersUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Apri elenco utenti</a>
          </p>
        </div>
      </div>
    `;

    const text = [
      "Nuova registrazione completata",
      "",
      `Nome completo: ${params.fullName}`,
      `Email: ${params.email}`,
      `Ruolo: ${params.role}`,
      `Telefono: ${safePhone}`,
      `Invite code: ${safeInviteCode}`,
      `ID utente: ${params.userId}`,
      `Registrato il: ${registeredAtLabel}`,
      "",
      `Apri dettaglio utente: ${userUrl}`,
      `Apri elenco utenti: ${usersUrl}`,
    ].join("\n");

    const { data, error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: recipientEmails,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error("Failed to send signup email notification", error, {
        userId: params.userId,
        recipients: recipientEmails.length,
      });

      await Promise.all(
        recipients.map((recipient) =>
          logEmailDispatch({
            recipientEmail: recipient.email,
            recipientName: recipient.full_name || null,
            recipientUserId: recipient.id,
            subject,
            templateName: "user_registered_gestore_notification",
            status: "failed",
            provider: "resend",
            providerMessageId: null,
            errorMessage: (error as { message?: string })?.message || "send_failed",
            metadata: {
              userId: params.userId,
              recipientRole: recipient.role,
              registeredRole: params.role,
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
          templateName: "user_registered_gestore_notification",
          status: "sent",
          provider: "resend",
          providerMessageId: data?.id || null,
          metadata: {
            userId: params.userId,
            recipientRole: recipient.role,
            registeredRole: params.role,
          },
        })
      )
    );

    logger.info("Signup email notification sent", {
      userId: params.userId,
      recipients: recipientEmails.length,
      providerMessageId: data?.id || null,
    });
  } catch (error) {
    logger.error("Unexpected error while sending signup email", error, {
      userId: params.userId,
    });
  }
}