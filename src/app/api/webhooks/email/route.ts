import { NextRequest, NextResponse } from "next/server";
import { updateEmailStatus } from "@/lib/email/service";

export const dynamic = "force-dynamic";

/**
 * Resend Webhook Handler
 * Receives delivery status updates from Resend
 * 
 * Webhook Events:
 * - email.sent
 * - email.delivered
 * - email.delivery_delayed
 * - email.bounced
 * - email.complained
 * - email.opened
 * - email.clicked
 */

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    opened_at?: string;
    clicked_at?: string;
    bounce?: {
      type: string;
      message: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if configured)
    const signature = request.headers.get("svix-signature");
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      // In production, verify the signature
      // For now, we'll accept all requests
    }

    const payload: ResendWebhookEvent = await request.json();

    // Map Resend events to our email statuses
    let status: string;
    let metadata: Record<string, any> = {};

    switch (payload.type) {
      case "email.sent":
        status = "sent";
        break;
      case "email.delivered":
        status = "delivered";
        break;
      case "email.delivery_delayed":
        status = "queued";
        metadata = { delayed: true };
        break;
      case "email.bounced":
        status = "bounced";
        metadata = {
          bounce_type: payload.data.bounce?.type,
          bounce_message: payload.data.bounce?.message,
        };
        break;
      case "email.complained":
        status = "failed";
        metadata = { complained: true };
        break;
      case "email.opened":
        status = "opened";
        metadata = { opened_at: payload.data.opened_at };
        break;
      case "email.clicked":
        status = "clicked";
        metadata = { clicked_at: payload.data.clicked_at };
        break;
      default:
        // Unknown event type, acknowledge receipt
        return NextResponse.json({ received: true });
    }

    // Update email status in database
    await updateEmailStatus(
      payload.data.email_id,
      status as any,
      metadata
    );

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", message: error.message },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "email-webhooks",
    timestamp: new Date().toISOString(),
  });
}
