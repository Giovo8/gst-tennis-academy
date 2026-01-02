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
  newUsersThisMonth: number;
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
    newUsersThisMonth: 0,
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
        newUsersThisMonth: usersCount || 0,
      });

      setRecentActivity(recentBookings || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  }

  // Mock data per il grafico (sostituire con dati reali)
  const weeklyData = [
    { day: "L", value: 45 },
    { day: "M", value: 78 },
    { day: "M", value: 62 },
    { day: "G", value: 95 },
    { day: "V", value: 58 },
    { day: "S", value: 82 },
    { day: "D", value: 48 },
  ];

  const reminders = [
    {
      id: "1",
      title: "Riunione Staff Mensile",
      time: "Oggi • 14:00 - 16:00",
      type: "meeting" as const,
    },
  ];

  const projects = [
    {
      id: "1",
      title: "Gestione Tornei",
      subtitle: `${stats.activeTournaments} tornei attivi`,
      icon: Trophy,
      color: "blue",
    },
    {
      id: "2",
      title: "Nuovi Iscritti",
      subtitle: `${stats.newUsersThisMonth} questo mese`,
      icon: UserPlus,
      color: "purple",
    },
    {
      id: "3",
      title: "Prenotazioni",
      subtitle: `${stats.todayBookings} oggi`,
      icon: Calendar,
      color: "green",
    },
    {
      id: "4",
      title: "Notifiche",
      subtitle: "Sistema attivo",
      icon: Bell,
      color: "orange",
    },
  ];

  const teamMembers = [
    {
      id: "1",
      name: "Staff Tennis",
      role: "Gestione Campi",
      project: "Prenotazioni e Manutenzione",
      status: "active" as const,
    },
    {
      id: "2",
      name: "Coach Team",
      role: "Allenamenti",
      project: "Programmi di Training",
      status: "active" as const,
    },
    {
      id: "3",
      name: "Admin Support",
      role: "Assistenza",
      project: "Supporto Utenti",
      status: "active" as const,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard Generale
        </h1>
        <p className="text-gray-600">
          Panoramica completa di tutte le attività dell'accademia
        </p>
      </div>

      {/* Statistiche Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Utenti */}
        <Link href="/dashboard/admin/users" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalUsers}</h3>
          <p className="text-sm text-gray-600 mb-2">Utenti Totali</p>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Activity className="h-3 w-3" />
            <span>{stats.activeUsers} attivi ultimi 7 giorni</span>
          </div>
        </Link>

        {/* Prenotazioni Oggi */}
        <Link href="/dashboard/admin/courts" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
              <Calendar className="h-6 w-6 text-cyan-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.todayBookings}</h3>
          <p className="text-sm text-gray-600 mb-2">Prenotazioni Oggi</p>
          <div className="flex items-center gap-2 text-xs text-cyan-600">
            <TrendingUp className="h-3 w-3" />
            <span>{stats.weekBookings} questa settimana</span>
          </div>
        </Link>

        {/* Prenotazioni Pendenti */}
        <Link href="/dashboard/admin/courts" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            {stats.pendingBookings > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                {stats.pendingBookings}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingBookings}</h3>
          <p className="text-sm text-gray-600 mb-2">Da Confermare</p>
          <div className="flex items-center gap-2 text-xs text-orange-600">
            <AlertCircle className="h-3 w-3" />
            <span>Richiede approvazione</span>
          </div>
        </Link>

        {/* Tornei */}
        <Link href="/dashboard/admin/tornei" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Trophy className="h-6 w-6 text-purple-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.activeTournaments}</h3>
          <p className="text-sm text-gray-600 mb-2">Tornei Attivi</p>
          <div className="flex items-center gap-2 text-xs text-purple-600">
            <CheckCircle className="h-3 w-3" />
            <span>{stats.totalTournaments} totali</span>
          </div>
        </Link>
      </div>

      {/* Sezione Comunicazioni */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Chat */}
        <Link href="/dashboard/admin/chat" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            {stats.unreadMessages > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full">
                {stats.unreadMessages}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.unreadMessages}</h3>
          <p className="text-sm text-gray-600">Messaggi Non Letti</p>
        </Link>

        {/* Email */}
        <Link href="/dashboard/admin/email" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            {stats.pendingEmails > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                {stats.pendingEmails}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingEmails}</h3>
          <p className="text-sm text-gray-600">Email in Coda</p>
        </Link>

        {/* News */}
        <Link href="/dashboard/admin/news" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
              <Newspaper className="h-6 w-6 text-indigo-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.newsCount}</h3>
          <p className="text-sm text-gray-600">News Pubblicate</p>
        </Link>

        {/* Annunci */}
        <Link href="/dashboard/admin/announcements" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-pink-50 rounded-lg group-hover:bg-pink-100 transition-colors">
              <Bell className="h-6 w-6 text-pink-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.announcementsCount}</h3>
          <p className="text-sm text-gray-600">Annunci Attivi</p>
        </Link>
      </div>

      {/* Campi e Attività Recenti */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Campi */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-cyan-50 rounded-lg">
              <LayoutGrid className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Campi Tennis</h3>
              <p className="text-sm text-gray-600">Strutture disponibili</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Campi Totali</span>
              <span className="text-lg font-bold text-gray-900">{stats.totalCourts}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700">Prenotazioni Settimana</span>
              <span className="text-lg font-bold text-green-900">{stats.weekBookings}</span>
            </div>
            <Link
              href="/dashboard/admin/courts"
              className="block w-full text-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all text-sm font-medium"
            >
              Gestisci Campi
            </Link>
          </div>
        </div>

        {/* Attività Recenti */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Attività Recenti
          </h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity: any, index) => (
                <div key={activity.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.profiles?.full_name || "Utente"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {activity.court} - {new Date(activity.start_time).toLocaleString("it-IT", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessuna attività recente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-xl font-bold mb-4">Azioni Rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all text-center"
          >
            <UserPlus className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Nuovo Utente</p>
          </Link>
          <Link
            href="/dashboard/admin/bookings"
            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all text-center"
          >
            <Calendar className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Nuova Prenotazione</p>
          </Link>
          <Link
            href="/dashboard/admin/tornei"
            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all text-center"
          >
            <Trophy className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Nuovo Torneo</p>
          </Link>
          <Link
            href="/dashboard/admin/news"
            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all text-center"
          >
            <Newspaper className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm font-medium">Nuova News</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
