"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications(limit = 6) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (limit > 0) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (cancelled) return;
        if (!error) {
          const list = (data || []) as DashboardNotification[];
          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.is_read).length);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Realtime: nuove notifiche per l'utente
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as DashboardNotification;
            setNotifications((prev) => {
              const next = [newNotif, ...prev];
              return limit > 0 ? next.slice(0, limit) : next;
            });
            if (!newNotif.is_read) setUnreadCount((c) => c + 1);
          }
        )
        .subscribe();
    }

    load();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [limit]);

  async function markRead(notificationId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
    } catch (e) {
      console.error("Error marking notification read", e);
    }
  }

  async function markAllRead() {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) {
        // rollback
        setNotifications(previous);
        setUnreadCount(previous.filter((n) => !n.is_read).length);
      }
    } catch (e) {
      console.error("Error marking all notifications read", e);
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.is_read).length);
    }
  }

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
