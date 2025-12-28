"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function ChatNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    
    // Setup realtime subscription for unread updates
    const channel = supabase
      .channel("conversation_participants:unread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadUnreadCount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/conversations", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const total = (data.conversations || []).reduce(
          (sum: number, conv: any) => sum + (conv.unread_count || 0),
          0
        );
        setUnreadCount(total);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  }

  return (
    <Link
      href="/chat"
      className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
    >
      <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-cyan-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
