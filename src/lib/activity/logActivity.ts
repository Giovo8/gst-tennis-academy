import { supabase } from "@/lib/supabase/client";

export type ActivityAction =
  | "user.register"
  | "user.login"
  | "user.logout"
  | "user.update_profile"
  | "booking.create"
  | "booking.update"
  | "booking.cancel"
  | "booking.confirm"
  | "tournament.create"
  | "tournament.join"
  | "tournament.leave"
  | "tournament.start"
  | "tournament.complete"
  | "email.send"
  | "email.campaign.create"
  | "email.campaign.delete"
  | "court.block"
  | "court.unblock"
  | "invite_code.create"
  | "invite_code.use"
  | "video_lesson.create"
  | "video_lesson.view"
  | "notification.create"
  | "notification.read";

export interface LogActivityParams {
  action: ActivityAction | string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs user activity to the activity_log table
 *
 * @example
 * await logActivity({
 *   action: "booking.create",
 *   entityType: "booking",
 *   entityId: bookingId,
 *   metadata: { court: "Campo 1", date: "2026-01-10" }
 * });
 */
export async function logActivity({
  action,
  entityType,
  entityId,
  metadata,
}: LogActivityParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user" };
    }

    // Get IP address and user agent from browser
    const ipAddress = null; // Not available in client-side
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    // Insert activity log
    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("Error logging activity:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception logging activity:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Server-side version of logActivity for API routes
 * Accepts user_id as parameter instead of getting from session
 */
export async function logActivityServer({
  userId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  userAgent,
}: LogActivityParams & {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Lazy import to avoid loading server client in client-side bundles
    const { supabaseServer } = await import("@/lib/supabase/serverClient");

    const { error } = await supabaseServer.from("activity_log").insert({
      user_id: userId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });

    if (error) {
      console.error("Error logging activity (server):", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception logging activity (server):", error);
    return { success: false, error: String(error) };
  }
}
