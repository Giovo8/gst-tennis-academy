import { supabase } from "@/lib/supabase/client";

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  type: "message" | "tournament" | "announcement" | "booking" | "general";
  title: string;
  message: string;
  link?: string;
}) {
  try {
    console.log("📤 Sending notification to API:", { userId, type, title });
    
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        type,
        title,
        message,
        link,
      }),
    });

    console.log("📥 Response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Error creating notification:", error);
    } else {
      const result = await response.json();
      console.log("✅ Notification created:", result);
    }
  } catch (error) {
    console.error("❌ Exception creating notification:", error);
  }
}
