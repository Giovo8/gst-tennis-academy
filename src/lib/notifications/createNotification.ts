import { supabase } from "@/lib/supabase/client";
import logger from '@/lib/logger/secure-logger';

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
    logger.info("📤 Sending notification to API:", { userId, type, title });
    
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

    logger.info("📥 Response status: " + response.status);

    if (!response.ok) {
      const error = await response.json();
      logger.error("❌ Error creating notification:", error);
    } else {
      const result = await response.json();
      logger.info("✅ Notification created:", result);
    }
  } catch (error) {
    logger.error("❌ Exception creating notification:", error);
  }
}
