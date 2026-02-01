"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Bell, X, Mail, Trophy, Megaphone, Check, Calendar, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data && !error) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "message":
        return <Mail className="h-5 w-5" style={{ color: '#08b3f7' }} />;
      case "tournament":
        return <Trophy className="h-5 w-5" style={{ color: '#39c3f9' }} />;
      case "announcement":
        return <Megaphone className="h-5 w-5" style={{ color: '#0690c6' }} />;
      case "booking":
        return <Calendar className="h-5 w-5" style={{ color: '#056c94' }} />;
      case "video":
        return <Video className="h-5 w-5" style={{ color: '#6bd2fa' }} />;
      default:
        return <Bell className="h-5 w-5" style={{ color: '#034863' }} />;
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadNotifications();
          }
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifiche"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Desktop Dropdown */}
          <div className="hidden sm:block absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[100]">
            {/* Header */}
            <div className="px-4 py-3 bg-secondary flex items-center justify-between rounded-t-lg">
              <h3 className="font-semibold text-white">Notifiche</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-white/80 hover:text-white hover:underline flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Segna tutte come lette
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nessuna notifica</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900 mb-1">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: it,
                                  })}
                                </span>
                                {notification.link && (
                                  <Link
                                    href={notification.link}
                                    className="text-xs text-secondary hover:underline"
                                    onClick={() => {
                                      markAsRead(notification.id);
                                      setIsOpen(false);
                                    }}
                                  >
                                    Vai
                                  </Link>
                                )}
                              </div>
                            </div>
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                                title="Segna come letto"
                              >
                                <Check className="h-4 w-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Modal - stile come menu hamburger */}
          <div 
            className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top duration-300"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-secondary flex items-center justify-between">
              <h3 className="font-semibold text-white">Notifiche</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Notifications List */}
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nessuna notifica</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 rounded-lg border transition-colors ${
                      !notification.is_read ? "bg-blue-50 border-secondary/20" : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: it,
                            })}
                          </span>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1"
                              title="Segna come letto"
                            >
                              <Check className="h-4 w-4 text-secondary" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {unreadCount > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-2">
                <button
                  onClick={markAllAsRead}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                >
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">Segna tutte come lette</span>
                </button>
              </div>
            )}
          </div>

          {/* Overlay per chiudere il dropdown (Mobile) */}
          <div
            className="lg:hidden fixed inset-0 z-[99998] bg-transparent"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </>
  );
}
