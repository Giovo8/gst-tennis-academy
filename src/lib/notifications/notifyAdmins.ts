import { supabase } from "@/lib/supabase/client";

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
    // Get all admin users
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (!admins || admins.length === 0) return;

    // Create notification for each admin using API
    for (const admin of admins) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: admin.id,
          type,
          title,
          message,
          link,
        }),
      });
    }
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
}
