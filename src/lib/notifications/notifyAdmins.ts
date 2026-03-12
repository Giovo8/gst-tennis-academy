import { supabaseServer } from "@/lib/supabase/serverClient";
import logger from '@/lib/logger/secure-logger';

export async function notifyAdmins({
  type,
  title,
  message,
  link,
}: {
  type: "message" | "tournament" | "announcement" | "booking" | "general";
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const { data: admins, error: adminsError } = await supabaseServer
      .from("profiles")
      .select("id")
      .in("role", ["admin", "gestore"]);

    if (adminsError) {
      logger.error("Error fetching admins for notifications:", adminsError);
      return;
    }

    if (!admins || admins.length === 0) return;

    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
    }));

    const { error: insertError } = await supabaseServer
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      logger.error("Error inserting admin notifications:", insertError);
    }
  } catch (error) {
    logger.error("Error notifying admins:", error);
  }
}
