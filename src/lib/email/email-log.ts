import logger from "@/lib/logger/secure-logger";
import { supabaseServer } from "@/lib/supabase/serverClient";

type EmailDispatchStatus = "sent" | "failed";

type EmailDispatchLogInput = {
  recipientEmail: string;
  recipientName?: string | null;
  recipientUserId?: string | null;
  subject: string;
  templateName: string;
  status: EmailDispatchStatus;
  provider?: string;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logEmailDispatch(input: EmailDispatchLogInput): Promise<void> {
  const provider = input.provider || "resend";
  const nowIso = new Date().toISOString();

  const primaryPayload = {
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName || null,
    recipient_user_id: input.recipientUserId || null,
    subject: input.subject,
    template_name: input.templateName,
    template_data: {},
    status: input.status,
    provider,
    provider_message_id: input.providerMessageId || null,
    sent_at: input.status === "sent" ? nowIso : null,
    error_message: input.errorMessage || null,
    metadata: input.metadata || {},
  };

  const { error: primaryError } = await supabaseServer
    .from("email_logs")
    .insert(primaryPayload);

  if (!primaryError) return;

  const fallbackPayload = {
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName || null,
    subject: input.subject,
    template_name: input.templateName,
    status: input.status,
    provider,
    sent_at: input.status === "sent" ? nowIso : null,
    failed_at: input.status === "failed" ? nowIso : null,
    error_message: input.errorMessage || null,
  };

  const { error: fallbackError } = await supabaseServer
    .from("email_log")
    .insert(fallbackPayload);

  if (!fallbackError) return;

  logger.error("Failed to persist email dispatch log", fallbackError, {
    primaryError: primaryError.message,
    recipientEmail: input.recipientEmail,
    templateName: input.templateName,
    status: input.status,
  });
}