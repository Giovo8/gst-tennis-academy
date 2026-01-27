"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Calendar,
  Trophy,
  Video,
  Clock,
  Plus,
  Bell,
  Megaphone,
  Swords,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  ExternalLink,
  FileText,
  Info,
  Newspaper,
} from "lucide-react";
import BookingsTimeline from "@/components/admin/BookingsTimeline";

interface Stats {
  totalUsers: number;
  todayBookings: number;
  activeTournaments: number;
  videoLessonsCount: number;
  pendingBookings: number;
  unreadMessages: number;
  pendingArena: number;
  pendingJobApplications: number;
}

interface TodayBooking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  manager_confirmed: boolean;
  user_profile?: { full_name: string } | null;
}

interface TimelineBooking {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  notes: string | null;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  created_at: string;
  is_pinned: boolean;
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

const bookingTypeLabels: Record<string, string> = {
  campo: "Campo",
  lezione_privata: "Lezione Privata",
  lezione_gruppo: "Lezione Gruppo",
  arena: "Match Arena",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    todayBookings: 0,
    activeTournaments: 0,
    videoLessonsCount: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    pendingArena: 0,
    pendingJobApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [timelineBookings, setTimelineBookings] = useState<TimelineBooking[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Admin");

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Parallel queries for counts
      const [
        usersResult,
        todayBookingsCount,
        pendingBookingsCount,
        activeTournamentsCount,
        unreadMessagesCount,
        videoLessonsResult,
        pendingArenaResult,
        jobApplicationsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("start_time", `${todayStr}T00:00:00`).lte("start_time", `${todayStr}T23:59:59`),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("manager_confirmed", false).neq("status", "cancelled"),
        supabase.from("tournaments").select("*", { count: "exact", head: true }).in("status", ["active", "Aperto", "In Corso"]),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("read", false),
        supabase.from("video_lessons").select("*", { count: "exact", head: true }),
        supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("recruitment_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      // Get today's bookings with details
      const { data: todayBookingsData } = await supabase
        .from("bookings")
        .select("id, court, start_time, end_time, type, status, manager_confirmed, user_id")
        .gte("start_time", `${todayStr}T00:00:00`)
        .lte("start_time", `${todayStr}T23:59:59`)
        .order("start_time", { ascending: true })
        .limit(5);

      if (todayBookingsData && todayBookingsData.length > 0) {
        const userIds = [...new Set(todayBookingsData.map((b) => b.user_id).filter(Boolean))];
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const enrichedBookings = todayBookingsData.map((booking) => ({
          ...booking,
          user_profile: profileMap.get(booking.user_id) || null,
        }));

        setTodayBookings(enrichedBookings);
      }

      // Get all bookings for timeline (from today onwards)
      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("*")
        .gte("start_time", `${todayStr}T00:00:00`)
        .order("start_time", { ascending: false })
        .limit(200);

      if (allBookingsData && allBookingsData.length > 0) {
        const allUserIds = [...new Set([
          ...allBookingsData.map((b) => b.user_id),
          ...allBookingsData.map((b) => b.coach_id).filter(Boolean)
        ])];

        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", allUserIds);

        const allProfilesMap = new Map(allProfiles?.map((p) => [p.id, p]) || []);

        const enrichedTimelineBookings = allBookingsData.map((booking) => ({
          ...booking,
          user_profile: allProfilesMap.get(booking.user_id) || null,
          coach_profile: booking.coach_id ? allProfilesMap.get(booking.coach_id) || null : null,
        }));

        setTimelineBookings(enrichedTimelineBookings);
      }

      setStats({
        totalUsers: usersResult.count || 0,
        todayBookings: todayBookingsCount.count || 0,
        activeTournaments: activeTournamentsCount.count || 0,
        videoLessonsCount: videoLessonsResult.count || 0,
        pendingBookings: pendingBookingsCount.count || 0,
        unreadMessages: unreadMessagesCount.count || 0,
        pendingArena: pendingArenaResult.count || 0,
        pendingJobApplications: jobApplicationsResult.count || 0,
      });

      // Load recent announcements
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("id, title, content, announcement_type, priority, created_at, is_pinned, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(3);

      if (announcementsData) {
        setRecentAnnouncements(announcementsData as any);
      }

      // Load notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (notifs) {
        setNotifications(notifs);
        setUnreadNotifications(notifs.filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  function handleAnnouncementClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
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
          setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
          setUnreadNotifications((prev) => Math.max(0, prev - 1));
        }
      } catch (e) {
        console.error("Error marking notification read", e);
      }
    }
  }

  async function markAllNotificationsRead() {
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
      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadNotifications(0);
      }
    } catch (e) {
      console.error("Error marking all notifications read", e);
    }
  }

  // Count alerts
  const alertsCount = stats.pendingBookings + stats.unreadMessages + stats.pendingArena + stats.pendingJobApplications;

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
          <h1 className="text-3xl font-bold text-secondary mb-2">Bentornato, {userName}</h1>
          <p className="text-secondary/70 font-medium">Pannello di controllo amministratore</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/admin/users" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Utenti Totali</p>
            <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
          </div>
        </Link>

        <Link href="/dashboard/admin/bookings" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Prenotazioni Oggi</p>
            <h3 className="text-2xl font-bold text-white">{stats.todayBookings}</h3>
          </div>
        </Link>

        <Link href="/dashboard/admin/tornei" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Tornei Attivi</p>
            <h3 className="text-2xl font-bold text-white">{stats.activeTournaments}</h3>
          </div>
        </Link>

        <Link href="/dashboard/admin/video-lessons" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Video className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Video Lezioni</p>
            <h3 className="text-2xl font-bold text-white">{stats.videoLessonsCount}</h3>
          </div>
        </Link>
      </div>

      {/* Timeline Prenotazioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Timeline Campi</h2>
          <Link href="/dashboard/admin/bookings" className="text-sm font-medium text-secondary hover:opacity-80">
            Gestisci
          </Link>
        </div>
        <div className="px-4 pb-4">
          <BookingsTimeline bookings={timelineBookings} loading={loading} />
        </div>
      </div>

      {/* Richiede Attenzione */}
      {alertsCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">Richiede Attenzione</h2>
          </div>

          <div className="px-6 pt-2 pb-6">
            <div className="space-y-3">
              {stats.pendingBookings > 0 && (
                <Link
                  href="/dashboard/admin/bookings?filter=pending"
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-amber-500 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Prenotazioni da approvare</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-md">
                    {stats.pendingBookings}
                  </span>
                </Link>
              )}

              {stats.unreadMessages > 0 && (
                <Link
                  href="/dashboard/admin/chat"
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-blue-500 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Messaggi non letti</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
                    {stats.unreadMessages}
                  </span>
                </Link>
              )}

              {stats.pendingArena > 0 && (
                <Link
                  href="/dashboard/admin/arena"
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-purple-500 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <Swords className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Sfide arena in attesa</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                    {stats.pendingArena}
                  </span>
                </Link>
              )}

              {stats.pendingJobApplications > 0 && (
                <Link
                  href="/dashboard/admin/job-applications"
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Candidature da valutare</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md">
                    {stats.pendingJobApplications}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Annunci */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Annunci</h2>
          <Link href="/dashboard/admin/announcements" className="text-sm font-medium text-secondary hover:opacity-80">
            Gestisci
          </Link>
        </div>

        <div className="px-6 pt-2 pb-6">
          {recentAnnouncements.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex p-3 bg-gray-50 rounded-full mb-3">
                <Megaphone className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Nessun annuncio</p>
              <p className="text-xs text-gray-600">Non ci sono annunci al momento</p>
              <Link
                href="/dashboard/admin/announcements/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-secondary rounded-lg hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Crea Annuncio
              </Link>
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
                            month: "short",
                          })}
                        </span>
                      </div>
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
          <h2 className="text-lg font-bold text-gray-900">Centro Notifiche</h2>
          {unreadNotifications > 0 && (
            <button onClick={markAllNotificationsRead} className="text-xs font-semibold text-secondary hover:opacity-80 flex items-center gap-1">
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
                    case "booking":
                      return <Calendar className="h-5 w-5 text-blue-600" />;
                    case "tournament":
                      return <Trophy className="h-5 w-5 text-purple-600" />;
                    case "message":
                      return <MessageSquare className="h-5 w-5 text-secondary" />;
                    case "success":
                      return <CheckCircle className="h-5 w-5 text-green-600" />;
                    case "warning":
                      return <AlertCircle className="h-5 w-5 text-amber-600" />;
                    case "error":
                      return <XCircle className="h-5 w-5 text-red-600" />;
                    default:
                      return <Info className="h-5 w-5 text-secondary" />;
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

      {/* Prenotazioni Oggi */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Prenotazioni di Oggi</h2>
          <Link href="/dashboard/admin/bookings" className="text-sm font-medium text-secondary hover:opacity-80">
            Vedi tutte
          </Link>
        </div>

        <div className="px-6 pt-2 pb-6">
          {todayBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Nessuna prenotazione</p>
              <p className="text-sm text-gray-600 mb-6">Non ci sono prenotazioni per oggi</p>
              <Link
                href="/dashboard/admin/bookings/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-secondary rounded-md hover:opacity-90 transition-all"
              >
                <Plus className="h-4 w-4" />
                Nuova Prenotazione
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/admin/bookings/${booking.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:border-secondary/30 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <Calendar className="h-5 w-5 text-secondary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking.user_profile?.full_name || "Utente"} - {booking.court}
                    </p>
                  </div>

                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-secondary/10 text-secondary rounded-md whitespace-nowrap flex-shrink-0">
                    {bookingTypeLabels[booking.type] || booking.type}
                  </span>

                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(booking.start_time)}</span>
                    <span className="text-gray-300">-</span>
                    <span>{formatTime(booking.end_time)}</span>
                  </div>

                  {!booking.manager_confirmed && booking.status !== "cancelled" && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Azioni Rapide */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900">Azioni Rapide</h2>
        </div>

        <div className="px-6 pt-2 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/dashboard/admin/bookings/new"
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:border-secondary/30 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-sm font-medium text-gray-900">Prenotazione</p>
            </Link>

            <Link
              href="/dashboard/admin/tornei/new"
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-purple-500 hover:border-purple-300 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex-shrink-0">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">Torneo</p>
            </Link>

            <Link
              href="/dashboard/admin/announcements/new"
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-pink-500 hover:border-pink-300 hover:bg-pink-50/30 transition-all"
            >
              <div className="flex-shrink-0">
                <Megaphone className="h-5 w-5 text-pink-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">Annuncio</p>
            </Link>

            <Link
              href="/dashboard/admin/news/create"
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
            >
              <div className="flex-shrink-0">
                <Newspaper className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">News</p>
            </Link>
          </div>
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
                      year: "numeric",
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
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">{selectedAnnouncement.content}</p>
              </div>

              {/* Author */}
              {selectedAnnouncement.profiles?.full_name && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">Pubblicato da</p>
                  <p className="text-sm font-medium text-secondary">{selectedAnnouncement.profiles.full_name}</p>
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
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Message */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">{selectedNotification.message}</p>
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
