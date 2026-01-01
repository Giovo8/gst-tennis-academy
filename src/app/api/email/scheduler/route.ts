import { NextRequest, NextResponse } from "next/server";
import { sendBookingReminders } from "@/lib/email/triggers";

export const dynamic = "force-dynamic";

/**
 * Email Scheduler API
 * Triggered by cron jobs or external schedulers to send batch reminders
 * 
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/email/scheduler",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 * 
 * Or use external service like GitHub Actions, AWS EventBridge, etc.
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (use a secret token)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET || "development_secret";

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { action } = await request.json().catch(() => ({ action: "booking_reminders" }));

    let result;

    switch (action) {
      case "booking_reminders":
        result = await sendBookingReminders();
        break;

      case "tournament_reminders":
        // TODO: Implement tournament reminders
        result = { success: true, message: "Tournament reminders not yet implemented" };
        break;

      case "retry_failed":
        // Retry failed emails
        result = await retryFailedEmails();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Scheduler error:", error);
    return NextResponse.json(
      { error: "Scheduler failed", message: error.message },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint for testing
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET || "development_secret";

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action") || "booking_reminders";

  try {
    let result;

    switch (action) {
      case "booking_reminders":
        result = await sendBookingReminders();
        break;
      case "retry_failed":
        result = await retryFailedEmails();
        break;
      default:
        result = { error: "Invalid action" };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Retry failed emails that haven't exceeded max retry count
 */
async function retryFailedEmails() {
  try {
    const { supabaseServer } = await import("@/lib/supabase/serverClient");
    const { retryFailedEmail } = await import("@/lib/email/service");
    const supabase = supabaseServer;

    // Get failed emails that can be retried
    const { data: failedEmails, error } = await supabase
      .from("email_logs")
      .select("id, retry_count")
      .eq("status", "failed")
      .lt("retry_count", 3)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(50);

    if (error || !failedEmails) {
      console.error("Error fetching failed emails:", error);
      return { success: false, error: error?.message };
    }

    let successCount = 0;
    let failCount = 0;

    for (const email of failedEmails) {
      const success = await retryFailedEmail(email.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return { success: true, retried: successCount, failed: failCount };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return { success: false, error: message };
  }
}
