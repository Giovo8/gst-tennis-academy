import { Resend } from "resend";
import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";

let resendClient: Resend | null = null;
let missingApiKeyWarned = false;

export function getResendClient(): Resend | null {
  const apiKey = env.resendApiKey;

  if (!apiKey) {
    if (!missingApiKeyWarned) {
      logger.warn("RESEND_API_KEY is missing. Email delivery is disabled.");
      missingApiKeyWarned = true;
    }
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function getEmailFromAddress(): string {
  const configuredFrom = env.emailFrom?.trim();
  return configuredFrom || "GST Tennis Academy <onboarding@resend.dev>";
}