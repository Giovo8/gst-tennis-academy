import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";
import { logEmailDispatch } from "@/lib/email/email-log";
import { getUsersDashboardLinkForRole } from "@/lib/notifications/links";
import { normalizeEmail, escapeHtml, getGestoreRecipients, type EmailRecipient } from "@/lib/email/email-utils";

type SendSignupNotificationInput = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string | null;
  inviteCode?: string | null;
  notifyAthlete?: boolean;
};

type SignupRecipientRole = "gestore" | "atleta";

type SignupRecipient = EmailRecipient & {
  role: SignupRecipientRole;
};

function getAthleteRecipient(params: SendSignupNotificationInput): SignupRecipient | null {
  const normalizedRole = String(params.role || "").toLowerCase();
  if (!params.notifyAthlete || normalizedRole !== "atleta") {
    return null;
  }

  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail) {
    return null;
  }

  return {
    id: params.userId,
    email: normalizedEmail,
    full_name: params.fullName,
    role: "atleta",
  };
}

async function resolveSignupRecipients(params: SendSignupNotificationInput): Promise<SignupRecipient[]> {
  const recipientsByEmail = new Map<string, SignupRecipient>();

  const gestoriRecipients = await getGestoreRecipients();
  for (const recipient of gestoriRecipients) {
    recipientsByEmail.set(recipient.email, { ...recipient, role: "gestore" as SignupRecipientRole });
  }

  const athleteRecipient = getAthleteRecipient(params);
  if (athleteRecipient && !recipientsByEmail.has(athleteRecipient.email)) {
    recipientsByEmail.set(athleteRecipient.email, athleteRecipient);
  }

  return Array.from(recipientsByEmail.values());
}

export async function sendSignupEmailToGestori(params: SendSignupNotificationInput): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) return;

    const recipients = await resolveSignupRecipients(params);
    if (recipients.length === 0) {
      logger.warn("No recipients found for signup email", {
        userId: params.userId,
      });
      return;
    }

    const registeredAtLabel = new Date().toLocaleString("it-IT");
    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const logoUrl = `${appBaseUrl}/images/logo-tennis.png`;
    const safePhone = params.phone?.trim() || "n/d";
    const safeInviteCode = params.inviteCode?.trim() || "n/d";

    const subject = `Nuova registrazione utente - ${params.fullName}`;

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const userUrl = `${appBaseUrl}${getUsersDashboardLinkForRole(recipient.role, params.userId)}`;
        const usersUrl = `${appBaseUrl}${getUsersDashboardLinkForRole(recipient.role)}`;
        const primaryCtaLabel = recipient.role === "atleta" ? "Apri il tuo profilo" : "Apri dettaglio utente";
        const secondaryCtaLabel = recipient.role === "atleta" ? "Apri dashboard atleta" : "Apri elenco utenti";

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
                <a href="${userUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">${primaryCtaLabel}</a>
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="${usersUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #034863; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">${secondaryCtaLabel}</a>
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
          `${primaryCtaLabel}: ${userUrl}`,
          `${secondaryCtaLabel}: ${usersUrl}`,
        ].join("\n");

        const { data, error } = await resend.emails.send({
          from: getEmailFromAddress(),
          to: recipient.email,
          subject,
          html,
          text,
        });

        if (error) {
          logger.error("Failed to send signup email notification", error, {
            userId: params.userId,
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
          });

          await logEmailDispatch({
            recipientEmail: recipient.email,
            recipientName: recipient.full_name || null,
            recipientUserId: recipient.id || null,
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
          });

          return { success: false, providerMessageId: null };
        }

        await logEmailDispatch({
          recipientEmail: recipient.email,
          recipientName: recipient.full_name || null,
          recipientUserId: recipient.id || null,
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
        });

        return { success: true, providerMessageId: data?.id || null };
      })
    );

    const sentResults = results.filter((result) => result.success);

    logger.info("Signup email notification sent", {
      userId: params.userId,
      recipients: sentResults.length,
      providerMessageIds: sentResults.map((result) => result.providerMessageId).filter(Boolean),
    });
  } catch (error) {
    logger.error("Unexpected error while sending signup email", error, {
      userId: params.userId,
    });
  }
}