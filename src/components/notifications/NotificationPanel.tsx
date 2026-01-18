"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  Bell,
  Swords,
  Trash2
} from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
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
  arena_challenge: Swords,
  success: CheckCircle,
  info: Info,
  warning: AlertCircle,
  error: XCircle,
};

const colorMap: { [key: string]: string } = {
  booking: "text-blue-500 bg-blue-500/10",
  tournament: "text-secondary bg-secondary/10",
  message: "text-secondary bg-secondary/10",
  course: "text-secondary bg-secondary/10",
  arena_challenge: "text-orange-500 bg-orange-500/10",
  success: "text-green-500 bg-green-500/10",
  info: "text-blue-500 bg-blue-500/10",
  warning: "text-yellow-500 bg-yellow-500/10",
  error: "text-red-500 bg-red-500/10",
};

export default function NotificationPanel({
  userId,
  onClose,
  onNotificationRead
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

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

  async function deleteNotification(notificationId: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-white" />
            <h3 className="text-lg font-bold text-white">Notifiche</h3>
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold text-white">
                {unreadCount} non lette
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        {notifications.some(n => !n.is_read) && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm text-secondary/70">
              {unreadCount} {unreadCount === 1 ? 'notifica non letta' : 'notifiche non lette'}
            </p>
            <button
              onClick={markAllAsRead}
              className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Segna tutte come lette
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-secondary/60 font-medium">Nessuna notifica</p>
              <p className="mt-1 text-sm text-secondary/40">Le tue notifiche appariranno qui</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifications.map((notification) => {
                const IconComponent = Icon(notification.type);
                const colorClass = colorMap[notification.type] || colorMap.info;

                const content = (
                  <div
                    className={`group relative rounded-lg border p-4 cursor-pointer transition-all ${
                      !notification.is_read
                        ? 'border-secondary/30 bg-secondary/5 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-secondary/30 hover:shadow-sm'
                    }`}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                      if (notification.action_url) onClose();
                    }}
                  >
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-lg" />
                    )}

                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`rounded-xl p-3 ${colorClass} flex-shrink-0`}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold ${!notification.is_read ? 'text-secondary' : 'text-secondary/80'}`}>
                          {notification.title}
                        </h4>
                        <p className="mt-1 text-sm text-secondary/60 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-secondary/40">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: it,
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              markAsRead(notification.id);
                            }}
                            className="rounded-lg p-2 text-secondary/50 hover:bg-secondary/10 hover:text-secondary transition-all"
                            title="Segna come letta"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="rounded-lg p-2 text-secondary/50 hover:bg-red-50 hover:text-red-500 transition-all"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );

                return notification.action_url ? (
                  <Link key={notification.id} href={notification.action_url}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-secondary hover:bg-gray-50 transition-all"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
