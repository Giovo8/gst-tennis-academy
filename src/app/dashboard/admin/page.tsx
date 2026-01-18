"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Calendar,
  Trophy,
  UserPlus,
  Activity,
  Mail,
  MessageSquare,
  Bell,
  Newspaper,
  ArrowRight,
  Video,
  Plus,
  Swords,
  CalendarDays,
  ChevronRight,
  Zap,
  BarChart3,
  AlertTriangle,
  FileText,
} from "lucide-react";

// Interfaces
interface Stats {
  totalUsers: number;
  activeUsers: number;
  todayBookings: number;
  weekBookings: number;
  pendingBookings: number;
  activeTournaments: number;
  totalTournaments: number;
  unreadMessages: number;
  pendingEmails: number;
  newsCount: number;
  announcementsCount: number;
  videoLessonsCount: number;
  staffCount: number;
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
  coach_profile?: { full_name: string } | null;
}

interface ActiveTournament {
  id: string;
  title: string;
  start_date: string;
  status: string;
  current_participants: number;
  max_participants: number;
  tournament_type: string;
}

interface RecentActivity {
  id: string;
  type: "booking" | "user" | "tournament" | "news" | "announcement";
  description: string;
  time: string;
  icon: "calendar" | "user" | "trophy" | "newspaper" | "bell";
}

// Booking type labels
const bookingTypeLabels: Record<string, string> = {
  campo: "Campo",
  lezione_privata: "Lezione Privata",
  lezione_gruppo: "Lezione Gruppo",
  arena: "Match Arena",
};

// Status colors
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    todayBookings: 0,
    weekBookings: 0,
    pendingBookings: 0,
    activeTournaments: 0,
    totalTournaments: 0,
    unreadMessages: 0,
    pendingEmails: 0,
    newsCount: 0,
    announcementsCount: 0,
    videoLessonsCount: 0,
    staffCount: 0,
    pendingArena: 0,
    pendingJobApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [activeTournaments, setActiveTournaments] = useState<ActiveTournament[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Current date info
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const formattedDate = today.toLocaleDateString("it-IT", dateOptions);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get today's date range
      const todayStr = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Parallel queries for counts
      const [
        usersResult,
        activeUsersResult,
        todayBookingsCount,
        weekBookingsCount,
        pendingBookingsCount,
        activeTournamentsCount,
        totalTournamentsCount,
        unreadMessagesCount,
        pendingEmailsCount,
        newsResult,
        announcementsResult,
        videoLessonsResult,
        staffResult,
        pendingArenaResult,
        jobApplicationsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("updated_at", sevenDaysAgo.toISOString()),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("start_time", `${todayStr}T00:00:00`).lte("start_time", `${todayStr}T23:59:59`),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("start_time", sevenDaysAgo.toISOString()),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("manager_confirmed", false).neq("status", "cancelled"),
        supabase.from("tournaments").select("*", { count: "exact", head: true }).in("status", ["active", "Aperto", "In Corso"]),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("read", false),
        supabase.from("email_logs").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("news").select("*", { count: "exact", head: true }),
        supabase.from("announcements").select("*", { count: "exact", head: true }),
        supabase.from("video_lessons").select("*", { count: "exact", head: true }),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("recruitment_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      // Get today's bookings with details
      const { data: todayBookingsData } = await supabase
        .from("bookings")
        .select("id, court, start_time, end_time, type, status, manager_confirmed, user_id, coach_id")
        .gte("start_time", `${todayStr}T00:00:00`)
        .lte("start_time", `${todayStr}T23:59:59`)
        .order("start_time", { ascending: true })
        .limit(10);

      // Get user profiles for bookings
      if (todayBookingsData && todayBookingsData.length > 0) {
        const userIds = [...new Set(todayBookingsData.map((b) => b.user_id).filter(Boolean))];
        const coachIds = [...new Set(todayBookingsData.map((b) => b.coach_id).filter(Boolean))];
        const allIds = [...new Set([...userIds, ...coachIds])];

        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", allIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const enrichedBookings = todayBookingsData.map((booking) => ({
          ...booking,
          user_profile: profileMap.get(booking.user_id) || null,
          coach_profile: booking.coach_id ? profileMap.get(booking.coach_id) || null : null,
        }));

        setTodayBookings(enrichedBookings);
      }

      // Get active tournaments
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("id, title, start_date, status, current_participants, max_participants, tournament_type")
        .in("status", ["active", "Aperto", "In Corso"])
        .order("start_date", { ascending: true })
        .limit(4);

      if (tournamentsData) {
        setActiveTournaments(tournamentsData);
      }

      // Get weekly booking data for chart
      const weeklyBookings: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .gte("start_time", `${dateStr}T00:00:00`)
          .lte("start_time", `${dateStr}T23:59:59`);
        weeklyBookings.push(count || 0);
      }
      setWeeklyData(weeklyBookings);

      // Get recent activity
      const { data: recentBookings } = await supabase
        .from("bookings")
        .select("id, created_at, court, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, created_at, full_name")
        .order("created_at", { ascending: false })
        .limit(2);

      const activities: RecentActivity[] = [];

      recentBookings?.forEach((b: any) => {
        activities.push({
          id: `booking-${b.id}`,
          type: "booking",
          description: `Nuova prenotazione: ${b.court} - ${b.profiles?.full_name || "Utente"}`,
          time: b.created_at,
          icon: "calendar",
        });
      });

      recentUsers?.forEach((u) => {
        activities.push({
          id: `user-${u.id}`,
          type: "user",
          description: `Nuovo utente registrato: ${u.full_name || "Utente"}`,
          time: u.created_at,
          icon: "user",
        });
      });

      // Sort by time
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 5));

      setStats({
        totalUsers: usersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        todayBookings: todayBookingsCount.count || 0,
        weekBookings: weekBookingsCount.count || 0,
        pendingBookings: pendingBookingsCount.count || 0,
        activeTournaments: activeTournamentsCount.count || 0,
        totalTournaments: totalTournamentsCount.count || 0,
        unreadMessages: unreadMessagesCount.count || 0,
        pendingEmails: pendingEmailsCount.count || 0,
        newsCount: newsResult.count || 0,
        announcementsCount: announcementsResult.count || 0,
        videoLessonsCount: videoLessonsResult.count || 0,
        staffCount: staffResult.count || 0,
        pendingArena: pendingArenaResult.count || 0,
        pendingJobApplications: jobApplicationsResult.count || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  }

  // Calculate alerts count
  const alertsCount = stats.pendingBookings + stats.unreadMessages + stats.pendingArena + stats.pendingJobApplications;

  // Get day labels for chart
  const dayLabels = useMemo(() => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString("it-IT", { weekday: "short" }));
    }
    return labels;
  }, []);

  // Max value for chart scaling
  const maxWeeklyValue = Math.max(...weeklyData, 1);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-secondary/10 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-secondary/10 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-secondary/10 rounded-xl" />
          <div className="h-80 bg-secondary/10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con data */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Dashboard</h1>
          <p className="text-secondary/60 mt-1 capitalize">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/bookings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuova Prenotazione</span>
            <span className="sm:hidden">Prenota</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards - 4 metriche principali */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Utenti */}
        <Link href="/dashboard/admin/users" className="group">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 hover:border-secondary/30 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                +{stats.activeUsers} attivi
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-secondary">{stats.totalUsers}</p>
            <p className="text-sm text-secondary/60 mt-1">Utenti totali</p>
          </div>
        </Link>

        {/* Prenotazioni oggi */}
        <Link href="/dashboard/admin/bookings" className="group">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              {stats.pendingBookings > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  {stats.pendingBookings} in attesa
                </span>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-secondary">{stats.todayBookings}</p>
            <p className="text-sm text-secondary/60 mt-1">Prenotazioni oggi</p>
          </div>
        </Link>

        {/* Competizioni */}
        <Link href="/dashboard/admin/tornei" className="group">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 hover:border-purple-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                {stats.totalTournaments} totali
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-secondary">{stats.activeTournaments}</p>
            <p className="text-sm text-secondary/60 mt-1">Competizioni attive</p>
          </div>
        </Link>

        {/* Video Lezioni */}
        <Link href="/dashboard/admin/video-lessons" className="group">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 hover:border-red-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                <Video className="h-5 w-5 text-red-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-secondary">{stats.videoLessonsCount}</p>
            <p className="text-sm text-secondary/60 mt-1">Video lezioni</p>
          </div>
        </Link>
      </div>

      {/* Pannello Richiede Attenzione */}
      {alertsCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Richiede attenzione</h3>
              <p className="text-xs text-secondary/60">{alertsCount} elementi in sospeso</p>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.pendingBookings > 0 && (
                <Link
                  href="/dashboard/admin/bookings?filter=pending"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-secondary">{stats.pendingBookings}</p>
                    <p className="text-xs text-secondary/60">Da approvare</p>
                  </div>
                </Link>
              )}
              {stats.unreadMessages > 0 && (
                <Link
                  href="/dashboard/admin/chat"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-secondary">{stats.unreadMessages}</p>
                    <p className="text-xs text-secondary/60">Messaggi</p>
                  </div>
                </Link>
              )}
              {stats.pendingArena > 0 && (
                <Link
                  href="/dashboard/admin/arena"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Swords className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-secondary">{stats.pendingArena}</p>
                    <p className="text-xs text-secondary/60">Sfide arena</p>
                  </div>
                </Link>
              )}
              {stats.pendingJobApplications > 0 && (
                <Link
                  href="/dashboard/admin/job-applications"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-secondary">{stats.pendingJobApplications}</p>
                    <p className="text-xs text-secondary/60">Candidature</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prenotazioni di oggi - 2 colonne */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary">Prenotazioni di oggi</h3>
                <p className="text-xs text-secondary/60">{stats.todayBookings} prenotazioni programmate</p>
              </div>
            </div>
            <Link
              href="/dashboard/admin/bookings"
              className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
            >
              Vedi tutte
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="p-4">
            {todayBookings.length > 0 ? (
              <div className="space-y-3">
                {todayBookings.map((booking) => {
                  const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const endTime = new Date(booking.end_time).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const statusKey = booking.manager_confirmed ? "confirmed" : booking.status === "cancelled" ? "cancelled" : "pending";
                  const colors = statusColors[statusKey] || statusColors.pending;

                  return (
                    <Link
                      key={booking.id}
                      href={`/dashboard/admin/bookings/${booking.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {/* Time */}
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-semibold text-secondary">{startTime}</p>
                        <p className="text-xs text-secondary/50">{endTime}</p>
                      </div>

                      {/* Divider */}
                      <div className="h-10 w-px bg-gray-200" />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-secondary truncate">
                            {booking.user_profile?.full_name || "Utente"}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {booking.manager_confirmed ? "Confermata" : booking.status === "cancelled" ? "Annullata" : "In attesa"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-secondary/60">{booking.court}</span>
                          <span className="text-xs text-secondary/40">|</span>
                          <span className="text-xs text-secondary/60">{bookingTypeLabels[booking.type] || booking.type}</span>
                          {booking.coach_profile && (
                            <>
                              <span className="text-xs text-secondary/40">|</span>
                              <span className="text-xs text-secondary/60">Coach: {booking.coach_profile.full_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-secondary/60 font-medium">Nessuna prenotazione per oggi</p>
                <Link
                  href="/dashboard/admin/bookings/new"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:text-primary-dark font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Crea prenotazione
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 1 colonna */}
        <div className="space-y-6">
          {/* Tornei attivi */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-secondary">Tornei attivi</h3>
              </div>
              <Link
                href="/dashboard/admin/tornei"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Tutti
              </Link>
            </div>

            <div className="p-4">
              {activeTournaments.length > 0 ? (
                <div className="space-y-3">
                  {activeTournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={`/dashboard/admin/tornei/${tournament.id}`}
                      className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-secondary truncate group-hover:text-purple-600 transition-colors">
                            {tournament.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-secondary/60">
                              {new Date(tournament.start_date).toLocaleDateString("it-IT", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            <span className="text-xs text-secondary/40">|</span>
                            <span className="text-xs text-secondary/60">
                              {tournament.current_participants || 0}/{tournament.max_participants || "∞"}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            tournament.status === "In Corso"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {tournament.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-secondary/60">Nessun torneo attivo</p>
                </div>
              )}
            </div>
          </div>

          {/* Grafico settimanale */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary">Trend settimanale</h3>
                <p className="text-xs text-secondary/60">{stats.weekBookings} prenotazioni</p>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((value, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-t-md relative" style={{ height: "100px" }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary-light rounded-t-md transition-all duration-500"
                        style={{ height: `${(value / maxWeeklyValue) * 100}%`, minHeight: value > 0 ? "8px" : "0" }}
                      />
                    </div>
                    <span className="text-xs text-secondary/60 capitalize">{dayLabels[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seconda riga - Stats secondarie e Azioni rapide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats secondarie */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/dashboard/admin/news" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <Newspaper className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-secondary">{stats.newsCount}</p>
              <p className="text-xs text-secondary/60">News</p>
            </Link>

            <Link href="/dashboard/admin/announcements" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-pink-200 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-pink-50 rounded-lg group-hover:bg-pink-100 transition-colors">
                  <Bell className="h-4 w-4 text-pink-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-secondary">{stats.announcementsCount}</p>
              <p className="text-xs text-secondary/60">Annunci</p>
            </Link>

            <Link href="/dashboard/admin/staff" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
                  <Users className="h-4 w-4 text-cyan-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-secondary">{stats.staffCount}</p>
              <p className="text-xs text-secondary/60">Staff</p>
            </Link>

            <Link href="/dashboard/admin/mail-marketing" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                  <Mail className="h-4 w-4 text-teal-600" />
                </div>
                {stats.pendingEmails > 0 && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    {stats.pendingEmails}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-secondary">{stats.pendingEmails}</p>
              <p className="text-xs text-secondary/60">Email in coda</p>
            </Link>
          </div>
        </div>

        {/* Azioni Rapide */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-secondary mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Azioni rapide
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/admin/bookings/new"
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-all group"
            >
              <div className="p-2 rounded-lg bg-secondary text-white group-hover:scale-110 transition-transform">
                <Plus className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-secondary text-center">Prenotazione</p>
            </Link>
            <Link
              href="/dashboard/admin/tornei/new"
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all group"
            >
              <div className="p-2 rounded-lg bg-purple-600 text-white group-hover:scale-110 transition-transform">
                <Trophy className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-purple-900 text-center">Torneo</p>
            </Link>
            <Link
              href="/dashboard/admin/users/new"
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-600 text-white group-hover:scale-110 transition-transform">
                <UserPlus className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-emerald-900 text-center">Utente</p>
            </Link>
            <Link
              href="/dashboard/admin/announcements"
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-pink-50 hover:bg-pink-100 transition-all group"
            >
              <div className="p-2 rounded-lg bg-pink-600 text-white group-hover:scale-110 transition-transform">
                <Bell className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-pink-900 text-center">Annuncio</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Attività recente */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Activity className="h-5 w-5 text-secondary" />
            </div>
            <h3 className="font-semibold text-secondary">Attività recente</h3>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const IconComponent = activity.icon === "calendar" ? Calendar : activity.icon === "user" ? Users : activity.icon === "trophy" ? Trophy : activity.icon === "newspaper" ? Newspaper : Bell;
                const timeAgo = getTimeAgo(activity.time);

                return (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IconComponent className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-secondary truncate">{activity.description}</p>
                      <p className="text-xs text-secondary/50 mt-0.5">{timeAgo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Adesso";
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
