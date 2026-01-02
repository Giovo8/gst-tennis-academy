"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Bell, Loader2, CheckCircle2, Info, AlertTriangle, Trash2, CheckCheck } from "lucide-react";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }

  const typeConfig: Record<string, { color: string; icon: React.ElementType }> = {
    success: { color: "text-emerald-400", icon: CheckCircle2 },
    info: { color: "text-blue-400", icon: Info },
    warning: { color: "text-amber-400", icon: AlertTriangle },
    error: { color: "text-red-400", icon: AlertTriangle },
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} min fa`;
    if (hours < 24) return `${hours} ore fa`;
    if (days < 7) return `${days} giorni fa`;
    return date.toLocaleDateString("it-IT");
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Notifiche
          </h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} notifiche non lette` : "Tutte le notifiche sono state lette"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            Segna tutte come lette
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              filter === f
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
            }`}
          >
            {f === "all" ? "Tutte" : f === "unread" ? "Non lette" : "Lette"}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="mt-4 text-white/50">Caricamento notifiche...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <Bell className="w-16 h-16 mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nessuna notifica</h3>
          <p className="text-white/50">
            {filter === "unread" ? "Nessuna notifica non letta" : "Non hai ancora ricevuto notifiche"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const config = typeConfig[notification.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={notification.id}
                className={`group rounded-xl border backdrop-blur-xl p-5 transition-all ${
                  notification.is_read
                    ? "border-white/10 bg-white/5"
                    : "border-cyan-500/30 bg-cyan-500/5"
                } hover:border-cyan-500/50`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${notification.is_read ? "text-white/80" : "text-white"}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-white/50 mt-1">{notification.message}</p>
                      </div>
                      <span className="text-xs text-white/40 whitespace-nowrap">{formatDate(notification.created_at)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Segna come letta
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                        Elimina
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
