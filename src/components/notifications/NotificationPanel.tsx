"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Calendar, 
  Trophy, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  Info, 
  AlertCircle,
  XCircle,
  X,
  Bell
} from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationPanelProps = {
  userId: string;
  onClose: () => void;
  onNotificationRead: () => void;
};

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  booking: Calendar,
  tournament: Trophy,
  message: MessageSquare,
  course: Users,
  success: CheckCircle,
  info: Info,
  warning: AlertCircle,
  error: XCircle,
};

const colorMap: { [key: string]: string } = {
  booking: "text-blue-400 bg-blue-500/10",
  tournament: "text-primary-light bg-primary/10",
  message: "text-primary-light bg-primary/10",
  course: "text-primary-light bg-primary/10",
  success: "text-primary-light bg-primary/10",
  info: "text-blue-400 bg-blue-500/10",
  warning: "text-yellow-400 bg-yellow-500/10",
  error: "text-red-400 bg-red-500/10",
};

export default function NotificationPanel({ 
  userId, 
  onClose, 
  onNotificationRead 
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    // Close panel when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userId]);

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      onNotificationRead();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onNotificationRead();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      onNotificationRead();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }

  const Icon = (type: string) => {
    const IconComponent = iconMap[type] || Info;
    return IconComponent;
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-notification-bg/98 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Notifiche</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Segna tutte
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-400">Caricamento...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-2 text-sm text-gray-400">Nessuna notifica</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => {
              const IconComponent = Icon(notification.type);
              const colorClass = colorMap[notification.type] || colorMap.info;

              return (
                <div
                  key={notification.id}
                  className={`group relative px-4 py-3 hover:bg-white/5 transition-all ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400"></div>
                  )}

                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`rounded-xl p-2 ${colorClass} flex-shrink-0`}>
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            markAsRead(notification.id);
                            onClose();
                          }}
                          className="block"
                        >
                          <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                            {notification.title}
                          </h4>
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <h4 className="text-sm font-semibold text-white">
                            {notification.title}
                          </h4>
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                        </>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: it,
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-cyan-400 transition-all"
                          title="Segna come letta"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-red-400 transition-all"
                        title="Elimina"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-white/10 px-4 py-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
