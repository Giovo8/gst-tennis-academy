import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const steps: { step: string; status: string; error?: string }[] = [];
  
  try {
    // Step 1: Test serverClient import
    try {
      const { supabaseServer } = await import("@/lib/supabase/serverClient");
      steps.push({ step: "1-supabase-server", status: supabaseServer ? "ok" : "null client" });
    } catch (e: any) {
      steps.push({ step: "1-supabase-server", status: "error", error: e.message });
    }

    // Step 2: Test verifyAuth import
    try {
      const { verifyAuth, isAdminOrGestore } = await import("@/lib/auth/verifyAuth");
      steps.push({ 
        step: "2-verifyAuth", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "2-verifyAuth", status: "error", error: e.message });
    }

    // Step 3: Test validation schemas
    try {
      const { createBookingSchema, updateBookingSchema } = await import("@/lib/validation/schemas");
      steps.push({ 
        step: "3-validation", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "3-validation", status: "error", error: e.message });
    }

    // Step 4: Test sanitize-server
    try {
      const { sanitizeObject, sanitizeUuid } = await import("@/lib/security/sanitize-server");
      steps.push({ 
        step: "4-sanitize-server", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "4-sanitize-server", status: "error", error: e.message });
    }

    // Step 5: Test rate-limiter
    try {
      const { applyRateLimit, RATE_LIMITS, getClientIdentifier } = await import("@/lib/security/rate-limiter");
      steps.push({ 
        step: "5-rate-limiter", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "5-rate-limiter", status: "error", error: e.message });
    }

    // Step 6: Test logger
    try {
      const logger = (await import("@/lib/logger/secure-logger")).default;
      steps.push({ 
        step: "6-logger", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "6-logger", status: "error", error: e.message });
    }

    // Step 7: Test notifications
    try {
      const { createNotification } = await import("@/lib/notifications/createNotification");
      const { notifyAdmins } = await import("@/lib/notifications/notifyAdmins");
      steps.push({ 
        step: "7-notifications", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "7-notifications", status: "error", error: e.message });
    }

    // Step 8: Test activity logging
    try {
      const { logActivityServer } = await import("@/lib/activity/logActivity");
      steps.push({ 
        step: "8-activity", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "8-activity", status: "error", error: e.message });
    }

    // Step 9: Test constants
    try {
      const { HTTP_STATUS, ERROR_MESSAGES, TIME_CONSTANTS, BOOKING_STATUS } = await import("@/lib/constants/app");
      steps.push({ 
        step: "9-constants", 
        status: "ok",
      });
    } catch (e: any) {
      steps.push({ step: "9-constants", status: "error", error: e.message });
    }

    // Step 10: Test DB query
    try {
      const { supabaseServer } = await import("@/lib/supabase/serverClient");
      const { data, error } = await supabaseServer
        .from("bookings")
        .select("id")
        .limit(1);
      
      if (error) {
        steps.push({ step: "10-db-query", status: "db-error", error: error.message });
      } else {
        steps.push({ step: "10-db-query", status: "ok", });
      }
    } catch (e: any) {
      steps.push({ step: "10-db-query", status: "error", error: e.message });
    }

    return NextResponse.json({ 
      success: true,
      steps,
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    return NextResponse.json({ 
      success: false,
      error: e.message,
      steps 
    }, { status: 500 });
  }
}
