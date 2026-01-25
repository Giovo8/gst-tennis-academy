"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Trophy,
  Video,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Target,
  Award,
  BookOpen,
  CheckCircle2,
  Zap,
  Megaphone,
  Bell,
  Swords,
  MessageSquare,
  Users,
  CheckCircle,
  Info,
  AlertCircle,
  XCircle,
  X,
  ExternalLink,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

interface Stats {
  upcomingBookings: number;
  activeTournaments: number;
  completedLessons: number;
  arenaActivities: number;
}

interface Booking {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  created_at: string;
  is_pinned: boolean;
  has_viewed?: boolean;
  link_url?: string | null;
  link_text?: string | null;
  expiry_date?: string | null;
  profiles?: {
    full_name: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export default function AtletaDashboard() {
  const [stats, setStats] = useState<Stats>({
    upcomingBookings: 0,
    activeTournaments: 0,
    completedLessons: 0,
    arenaActivities: 0,
  });
  const [nextBookings, setNextBookings] = useState<Booking[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [nextEvents, setNextEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Atleta");

    // Load upcoming bookings
    const now = new Date().toISOString();
    const { data: bookings, count: bookingsCount } = await supabase
      .from("bookings")
      .select("id, court, type, start_time, end_time, status", { count: "exact" })
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(3);

    // Load tournament participations
    const { data: participations } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", user.id);
    // Load upcoming tournaments
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("id, name, start_date, category, type")
      .eq("status", "published")
      .gte("start_date", now)
      .order("start_date", { ascending: true })
      .limit(10);


    // Load completed video lessons count (assignments watched)
    const { data: videoAssignments } = await supabase
      .from("video_assignments")
      .select("watched_at")
      .eq("user_id", user.id);

    const completedCount = (videoAssignments || []).filter((va: any) => !!va.watched_at).length;

    // Load arena activities
    const { data: arenaActivities, count: arenaCount } = await supabase
      .from("arena_sessions")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", now);

    setStats({
      upcomingBookings: bookingsCount || 0,
      activeTournaments: participations?.length || 0,
      completedLessons: completedCount,
      arenaActivities: arenaCount || 0,
    });

    // Combine bookings and tournaments into events
    const events: Event[] = [];
    
    // Add bookings as events
    if (bookings) {
      bookings.forEach(booking => {
        events.push({
          id: booking.id,
          title: booking.court,
          start_time: booking.start_time,
          end_time: booking.end_time,
          court: booking.court,
          type: booking.type,
          eventType: 'booking'
        });
      });
    }

    // Add tournaments as events
    if (tournaments) {
      tournaments.forEach(tournament => {
        events.push({
          id: tournament.id,
          title: tournament.name,
          start_time: tournament.start_date,
          eventType: 'tournament',
          type: tournament.category || tournament.type
        });
      });
    }

    // Sort by start_time and limit to 5
    events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    setNextEvents(events.slice(0, 5));

    // Load recent announcements
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    try {
      const response = await fetch("/api/announcements", { headers });
      if (response.ok) {
        const data = await response.json();
        // Get only the first 3 announcements
        setRecentAnnouncements((data.announcements || []).slice(0, 3));
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    }

    // Load notifications center
    try {
      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!error) {
        setNotifications(notifs || []);
        setUnreadNotifications((notifs || []).filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }

    setLoading(false);
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  async function handleAnnouncementClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);

    if (!announcement.has_viewed) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
        await fetch(`/api/announcements/${announcement.id}`, {
          method: "PATCH",
          headers,
        });
        setRecentAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, has_viewed: true } : a));
      } catch (e) {
        console.error("Error marking announcement viewed", e);
      }
    }
  }

  async function handleNotificationClick(notification: Notification) {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id);
        if (!error) {
          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
          setUnreadNotifications(prev => Math.max(0, prev - 1));
        }
      } catch (e) {
        console.error("Error marking notification read", e);
      }
    }
  }

  async function markAllNotificationsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotifications(0);
      }
    } catch (e) {
      console.error("Error marking all notifications read", e);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Bentornato, {userName}
          </h1>
          <p className="text-secondary/70 font-medium">
            Ecco il riepilogo della tua attività
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/atleta/bookings" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Prenotazioni</p>
            <h3 className="text-2xl font-bold text-white">{stats.upcomingBookings}</h3>
          </div>
        </Link>

        <Link href="/dashboard/atleta/tornei" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Tornei Attivi</p>
            <h3 className="text-2xl font-bold text-white">{stats.activeTournaments}</h3>
          </div>
        </Link>

        <Link href="/dashboard/atleta/videos" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Video className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Video Completati</p>
            <h3 className="text-2xl font-bold text-white">{stats.completedLessons}</h3>
          </div>
        </Link>

        <Link href="/dashboard/atleta/arena" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Swords className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/70">Arena</p>
            <h3 className="text-xl font-bold text-white">{stats.arenaActivities}</h3>
          </div>
        </Link>
      </div>

      {/* Annunci + Centro Notifiche */}
      <div className="grid grid-cols-1 gap-6">
        {/* Annunci Recenti */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Annunci
            </h2>
          </div>

          <div className="px-6 pt-2 pb-6">
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex p-3 bg-gray-50 rounded-full mb-3">
                  <Megaphone className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Nessun annuncio</p>
                <p className="text-xs text-gray-600">Non ci sono annunci al momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="relative p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:border-secondary/30 hover:bg-blue-50/30 transition-all group cursor-pointer"
                    onClick={() => handleAnnouncementClick(announcement)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <Megaphone className="h-5 w-5 text-secondary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                      </div>

                      {announcement.priority === "urgent" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-md whitespace-nowrap">
                          URGENTE
                        </span>
                      )}

                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>
                            {new Date(announcement.created_at).toLocaleDateString("it-IT", {
                              weekday: "short",
                              day: "numeric",
                              month: "short"
                            })}
                          </span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="font-medium">
                          {new Date(announcement.created_at).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Centro Notifiche */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Centro Notifiche
            </h2>
            {unreadNotifications > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-semibold text-secondary hover:opacity-80 flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Segna tutte come lette ({unreadNotifications})
              </button>
            )}
          </div>

          <div className="px-6 pt-2 pb-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex p-3 bg-gray-50 rounded-full mb-3">
                  <Bell className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Nessuna notifica</p>
                <p className="text-xs text-gray-600">Non ci sono notifiche al momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const icon = (() => {
                    switch (n.type) {
                      case "booking": return <Calendar className="h-5 w-5 text-blue-600" />;
                      case "tournament": return <Trophy className="h-5 w-5 text-purple-600" />;
                      case "message": return <MessageSquare className="h-5 w-5 text-secondary" />;
                      case "course": return <Users className="h-5 w-5 text-secondary" />;
                      case "success": return <CheckCircle className="h-5 w-5 text-green-600" />;
                      case "warning": return <AlertCircle className="h-5 w-5 text-amber-600" />;
                      case "error": return <XCircle className="h-5 w-5 text-red-600" />;
                      default: return <Info className="h-5 w-5 text-secondary" />;
                    }
                  })();

                  return (
                    <div
                      key={n.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-l-4 border-l-secondary transition-all cursor-pointer bg-white border-gray-200 hover:border-secondary/30 hover:bg-blue-50/30"
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex-shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(n.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prossime Prenotazioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900">
            Prossimi Eventi
          </h2>
        </div>

        <div className="px-6 pt-2 pb-6">
          {nextEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Nessun evento</p>
              <p className="text-sm text-gray-600 mb-6">Non hai prossimi appuntamenti</p>
              <Link
                href="/dashboard/atleta/bookings/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-secondary rounded-md hover:opacity-90 transition-all"
              >
                <Plus className="h-4 w-4" />
                Prenota Ora
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {nextEvents.map((event) => (
                <Link
                  key={event.id}
                  href={event.eventType === 'booking' ? `/dashboard/atleta/bookings/${event.id}` : `/dashboard/atleta/tornei/${event.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:border-secondary/30 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    {event.eventType === 'booking' ? (
                      <Calendar className="h-5 w-5 text-secondary" />
                    ) : (
                      <Trophy className="h-5 w-5 text-secondary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  </div>

                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-secondary/10 text-secondary rounded-md whitespace-nowrap flex-shrink-0">
                    {event.eventType === 'booking' ? event.type : 'Torneo'}
                  </span>

                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(event.start_time)}</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium">{formatTime(event.start_time)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Annuncio */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAnnouncement(null);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Megaphone className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">{selectedAnnouncement.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {/* Date and Priority */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-secondary/70">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(selectedAnnouncement.created_at).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                </div>
                {selectedAnnouncement.priority === "urgent" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    URGENTE
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {/* Link */}
              {selectedAnnouncement.link_url && (
                <a
                  href={selectedAnnouncement.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg hover:opacity-90 transition-colors font-medium text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  {selectedAnnouncement.link_text || "Apri link"}
                </a>
              )}

              {/* Author */}
              {selectedAnnouncement.profiles?.full_name && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">Pubblicato da</p>
                  <p className="text-sm font-medium text-secondary">
                    {selectedAnnouncement.profiles.full_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifica */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNotification(null);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">{selectedNotification.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-secondary/70">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(selectedNotification.created_at).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>

              {/* Message */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Action Link */}
              {selectedNotification.action_url && (
                <a
                  href={selectedNotification.action_url}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg hover:opacity-90 transition-colors font-medium text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Vai alla pagina
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
interface Tournament {
  id: string;
  name: string;
  start_date: string;
  category?: string;
  type?: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  court?: string;
  type?: string;
  eventType: 'booking' | 'tournament';
}
