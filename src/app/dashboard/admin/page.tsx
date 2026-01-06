"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  CheckCircle,
  Clock,
  UserPlus,
  Activity,
  LayoutGrid,
  Mail,
  MessageSquare,
  Bell,
  Newspaper,
  ArrowRight,
  AlertCircle,
  Video,
  UsersIcon,
  Plus,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  todayBookings: number;
  weekBookings: number;
  pendingBookings: number;
  activeTournaments: number;
  totalTournaments: number;
  unreadMessages: number;
  totalCourts: number;
  activeUsers: number;
  pendingEmails: number;
  newsCount: number;
  announcementsCount: number;
  videoLessonsCount: number;
  staffCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    todayBookings: 0,
    weekBookings: 0,
    pendingBookings: 0,
    activeTournaments: 0,
    totalTournaments: 0,
    unreadMessages: 0,
    totalCourts: 8,
    activeUsers: 0,
    pendingEmails: 0,
    newsCount: 0,
    announcementsCount: 0,
    videoLessonsCount: 0,
    staffCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Total Users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active Users (logged in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", sevenDaysAgo.toISOString());

      // Today's Bookings
      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", `${today}T00:00:00`)
        .lte("start_time", `${today}T23:59:59`);

      // Week Bookings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weekCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", weekAgo.toISOString());

      // Pending Bookings
      const { count: pendingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("manager_confirmed", false)
        .neq("status", "cancelled");

      // Active Tournaments
      const { count: activeTournamentsCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Total Tournaments
      const { count: totalTournamentsCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact", head: true });

      // Unread Messages
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read", false);

      // Pending Emails
      const { count: emailsCount } = await supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // News Count
      const { count: newsCount } = await supabase
        .from("news")
        .select("*", { count: "exact", head: true });

      // Announcements Count
      const { count: announcementsCount } = await supabase
        .from("announcements")
        .select("*", { count: "exact", head: true });

      // Video Lessons Count
      const { count: videoLessonsCount } = await supabase
        .from("video_lessons")
        .select("*", { count: "exact", head: true });

      // Staff Count
      const { count: staffCount } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      // Recent Activity - ultimi 5 booking
      const { data: recentBookings } = await supabase
        .from("bookings")
        .select("id, start_time, court, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalUsers: usersCount || 0,
        todayBookings: todayCount || 0,
        weekBookings: weekCount || 0,
        pendingBookings: pendingCount || 0,
        activeTournaments: activeTournamentsCount || 0,
        totalTournaments: totalTournamentsCount || 0,
        unreadMessages: messagesCount || 0,
        totalCourts: 8,
        activeUsers: activeCount || 0,
        pendingEmails: emailsCount || 0,
        newsCount: newsCount || 0,
        announcementsCount: announcementsCount || 0,
        videoLessonsCount: videoLessonsCount || 0,
        staffCount: staffCount || 0,
      });

      setRecentActivity(recentBookings || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-secondary/10 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-secondary/10 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">
          Dashboard
        </h1>
        <p className="text-secondary/70">
          Panoramica completa dell'Area GST
        </p>
      </div>

      {/* Sezione Gestione Principale - 3 Cards */}
      <div>
        <h2 className="text-sm font-semibold text-secondary/60 uppercase tracking-wider mb-3">Gestione Principale</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Utenti */}
          <Link href="/dashboard/admin/users" className="bg-white rounded-lg p-5 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <ArrowRight className="h-4 w-4 text-secondary/40 group-hover:text-secondary transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-secondary mb-1">{stats.totalUsers}</h3>
            <p className="text-sm text-secondary/60 font-medium mb-2">Utenti</p>
            <div className="flex items-center gap-1.5 text-xs text-secondary/60">
              <Activity className="h-3 w-3" />
              <span>{stats.activeUsers} attivi</span>
            </div>
          </Link>

          {/* Prenotazioni */}
          <Link href="/dashboard/admin/bookings" className="bg-white rounded-lg p-5 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              {stats.pendingBookings > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                  {stats.pendingBookings}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-secondary mb-1">{stats.todayBookings}</h3>
            <p className="text-sm text-secondary/60 font-medium mb-2">Prenotazioni</p>
            <div className="flex items-center gap-1.5 text-xs text-secondary/60">
              <TrendingUp className="h-3 w-3" />
              <span>{stats.weekBookings} questa settimana</span>
            </div>
          </Link>

          {/* Competizioni */}
          <Link href="/dashboard/admin/tornei" className="bg-white rounded-lg p-5 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-secondary mb-1">{stats.activeTournaments}</h3>
            <p className="text-sm text-secondary/60 font-medium mb-2">Competizioni</p>
            <div className="flex items-center gap-1.5 text-xs text-purple-600">
              <CheckCircle className="h-3 w-3" />
              <span>{stats.totalTournaments} totali</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Sezione Contenuti e Comunicazioni - 5 Cards */}
      <div>
        <h2 className="text-sm font-semibold text-secondary/60 uppercase tracking-wider mb-3">Contenuti & Comunicazioni</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Video Lezioni */}
          <Link href="/dashboard/admin/video-lessons" className="bg-white rounded-lg p-4 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="p-2.5 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors mb-3">
                <Video className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-1">{stats.videoLessonsCount}</h3>
              <p className="text-xs text-secondary/60 font-medium">Video Lezioni</p>
            </div>
          </Link>

          {/* Mail */}
          <Link href="/dashboard/admin/email" className="bg-white rounded-lg p-4 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="p-2.5 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors mb-3">
                <Mail className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-1">{stats.pendingEmails}</h3>
              <p className="text-xs text-secondary/60 font-medium">Mail</p>
            </div>
          </Link>

          {/* News */}
          <Link href="/dashboard/admin/news" className="bg-white rounded-lg p-4 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="p-2.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors mb-3">
                <Newspaper className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-1">{stats.newsCount}</h3>
              <p className="text-xs text-secondary/60 font-medium">News</p>
            </div>
          </Link>

          {/* Annunci */}
          <Link href="/dashboard/admin/announcements" className="bg-white rounded-lg p-4 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="p-2.5 bg-pink-50 rounded-lg group-hover:bg-pink-100 transition-colors mb-3">
                <Bell className="h-5 w-5 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-1">{stats.announcementsCount}</h3>
              <p className="text-xs text-secondary/60 font-medium">Annunci</p>
            </div>
          </Link>

          {/* Staff */}
          <Link href="/dashboard/admin/staff" className="bg-white rounded-lg p-4 hover:shadow-md transition-all group border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="p-2.5 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors mb-3">
                <UsersIcon className="h-5 w-5 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-1">{stats.staffCount}</h3>
              <p className="text-xs text-secondary/60 font-medium">Staff</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Attività Recenti e Azioni Rapide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attività Recenti */}
        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-secondary" />
            Attività Recenti
          </h3>
          <div className="space-y-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity: any, index) => (
                <div key={activity.id || index} className="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors">
                  <div className="p-2 bg-white rounded-md shadow-sm">
                    <Calendar className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">
                      {activity.profiles?.full_name || "Utente"}
                    </p>
                    <p className="text-xs text-secondary/60 truncate">
                      {activity.court} - {new Date(activity.start_time).toLocaleString("it-IT", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-secondary/50">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessuna attività recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Azioni Rapide */}
        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-secondary" />
            Azioni Rapide
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/admin/bookings/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-all group"
            >
              <div className="p-2 rounded-lg bg-secondary text-white group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-secondary text-center">Nuova Prenotazione</p>
            </Link>
            <Link
              href="/dashboard/admin/tornei/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all group"
            >
              <div className="p-2 rounded-lg bg-purple-600 text-white group-hover:scale-110 transition-transform">
                <Trophy className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-purple-900 text-center">Nuova Competizione</p>
            </Link>
            <Link
              href="/dashboard/admin/news/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-all group"
            >
              <div className="p-2 rounded-lg bg-indigo-600 text-white group-hover:scale-110 transition-transform">
                <Newspaper className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-indigo-900 text-center">Nuova News</p>
            </Link>
            <Link
              href="/dashboard/admin/staff/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-all group"
            >
              <div className="p-2 rounded-lg bg-cyan-600 text-white group-hover:scale-110 transition-transform">
                <UserPlus className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-cyan-900 text-center">Nuovo Staff</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
