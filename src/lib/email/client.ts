import { Resend } from "resend";
import env from "@/lib/config/env";
import logger from "@/lib/logger/secure-logger";

/**
 * Resend Email Client
 * Initialized with API key from environment variables
 * 
 * ⚠️ Security: RESEND_API_KEY must be set in environment
 */

let resendInstance: Resend | null = null;

function createResendClient(): Resend {
  try {
    const apiKey = env.resendApiKey;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    logger.debug('Initializing Resend email client');
    return new Resend(apiKey);
  } catch (error) {
    logger.error('Failed to initialize Resend client', error);
    throw error;
  }
}

// Lazy initialization
function getResendClient(): Resend {
  if (!resendInstance) {
    resendInstance = createResendClient();
  }
  return resendInstance;
}

export const resend = getResendClient();

// Email configuration from environment
export const EMAIL_CONFIG = {
  from: env.emailFrom,
  replyTo: env.emailReplyTo,
  defaultSubject: "GST Tennis Academy",
};

// Email categories
export const EMAIL_CATEGORIES = {
  TRANSACTIONAL: "transactional",
  MARKETING: "marketing",
  NOTIFICATION: "notification",
  SYSTEM: "system",
} as const;

// Email templates enum
export const EMAIL_TEMPLATES = {
  BOOKING_CONFIRMATION: "booking_confirmation",
  BOOKING_REMINDER: "booking_reminder",
  BOOKING_CANCELLED: "booking_cancelled",
  LESSON_REQUEST: "lesson_request",
  LESSON_CONFIRMED: "lesson_confirmed",
  TOURNAMENT_REGISTRATION: "tournament_registration",
  TOURNAMENT_REMINDER: "tournament_reminder",
  TOURNAMENT_RESULTS: "tournament_results",
  ANNOUNCEMENT_NOTIFICATION: "announcement_notification",
  SUBSCRIPTION_CREATED: "subscription_created",
  SUBSCRIPTION_EXPIRING: "subscription_expiring",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  NEWSLETTER: "newsletter",
  WELCOME: "welcome",
  PASSWORD_RESET: "password_reset",
} as const;

// Email status enum
export const EMAIL_STATUS = {
  PENDING: "pending",
  QUEUED: "queued",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  BOUNCED: "bounced",
  OPENED: "opened",
  CLICKED: "clicked",
} as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];
export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];
export type EmailCategory = (typeof EMAIL_CATEGORIES)[keyof typeof EMAIL_CATEGORIES];
