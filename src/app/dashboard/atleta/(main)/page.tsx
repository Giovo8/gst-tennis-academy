"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Trophy,
  CreditCard,
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
} from "lucide-react";

interface Stats {
  creditsAvailable: number;
  weeklyCredits: number;
  upcomingBookings: number;
  activeTournaments: number;
  completedLessons: number;
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
  profiles?: {
    full_name: string;
  };
}

export default function AtletaDashboard() {
  const [stats, setStats] = useState<Stats>({
    creditsAvailable: 0,
    weeklyCredits: 0,
    upcomingBookings: 0,
    activeTournaments: 0,
    completedLessons: 0,
  });
  const [nextBookings, setNextBookings] = useState<Booking[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Atleta");

    // Load credits
    const { data: credits } = await supabase
      .from("subscription_credits")
      .select("credits_available, weekly_credits")
      .eq("user_id", user.id)
      .single();

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

    setStats({
      creditsAvailable: credits?.credits_available || 0,
      weeklyCredits: credits?.weekly_credits || 0,
      upcomingBookings: bookingsCount || 0,
      activeTournaments: participations?.length || 0,
      completedLessons: 24,
    });

    setNextBookings(bookings || []);

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
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/atleta/bookings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Prenota Campo
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/atleta/(main)/subscription" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
              <CreditCard className="h-6 w-6 text-cyan-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.creditsAvailable}</h3>
          <p className="text-sm text-gray-600 mb-2">Crediti Disponibili</p>
          <div className="flex items-center gap-2 text-xs text-cyan-600">
            <TrendingUp className="h-3 w-3" />
            <span>{stats.weeklyCredits} crediti/settimana</span>
          </div>
        </Link>

        <Link href="/dashboard/atleta/bookings" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.upcomingBookings}</h3>
          <p className="text-sm text-gray-600 mb-2">Prenotazioni</p>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Clock className="h-3 w-3" />
            <span>Prossime sessioni</span>
          </div>
        </Link>

        <Link href="/dashboard/atleta/tornei" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Trophy className="h-6 w-6 text-purple-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.activeTournaments}</h3>
          <p className="text-sm text-gray-600 mb-2">Tornei Attivi</p>
          <div className="flex items-center gap-2 text-xs text-purple-600">
            <Trophy className="h-3 w-3" />
            <span>In competizione</span>
          </div>
        </Link>

        <Link href="/dashboard/atleta/videos" className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
              <Video className="h-6 w-6 text-green-600" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.completedLessons}</h3>
          <p className="text-sm text-gray-600 mb-2">Video Disponibili</p>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>Lezioni completate</span>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prossime Prenotazioni - Span 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-secondary" />
                Prossime Prenotazioni
              </h2>
              <Link
                href="/dashboard/atleta/bookings"
                className="text-sm font-semibold text-secondary hover:opacity-80 flex items-center gap-1 transition-colors"
              >
                Vedi tutte
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="p-6">
            {nextBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Nessuna prenotazione</p>
                <p className="text-sm text-gray-600 mb-6">Prenota un campo per iniziare ad allenarti</p>
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
                {nextBookings.map((booking, index) => (
                  <div
                    key={booking.id}
                    className="relative p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-secondary/30 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-2 bg-secondary rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{booking.court}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-secondary/10 text-secondary rounded-md whitespace-nowrap">
                            {booking.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(booking.start_time)}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="font-medium">{formatTime(booking.start_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Annunci + Azioni Rapide - 1 colonna */}
        <div className="space-y-6">
          {/* Annunci Recenti */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-600" />
                  Annunci
                </h2>
              </div>
            </div>

            <div className="p-6">
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
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/30 transition-all group relative"
                    >
                      {announcement.is_pinned && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-yellow-500 rounded-full" />
                      )}

                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 p-1.5 bg-yellow-50 rounded-md">
                          <Megaphone className="h-4 w-4 text-yellow-600" />
                        </div>
                        <h3 className="flex-1 font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-yellow-600 transition-colors">
                          {announcement.title}
                        </h3>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-3 ml-9">
                        {announcement.content}
                      </p>

                      <div className="flex items-center justify-between ml-9">
                        {announcement.profiles?.full_name && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-xs">
                              {announcement.profiles.full_name.charAt(0)}
                            </div>
                            <span className="font-medium">{announcement.profiles.full_name}</span>
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(announcement.created_at).toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "short"
                          })}
                        </span>
                      </div>

                      {announcement.priority === "urgent" && (
                        <div className="mt-2 ml-9">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700">
                            URGENTE
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Azioni Rapide */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-secondary" />
                Azioni Rapide
              </h2>
            </div>

            <div className="p-4 space-y-2">
              <Link
                href="/dashboard/atleta/arena"
                className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all group"
              >
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg group-hover:scale-105 transition-transform">
                  <Swords className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Arena Sfide</p>
                  <p className="text-xs text-gray-600">Sfida e scala la classifica</p>
                </div>
                <ArrowRight className="h-5 w-5 text-orange-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/atleta/bookings/new"
                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
              >
                <div className="p-2 bg-secondary rounded-lg group-hover:scale-105 transition-transform">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Prenota Campo</p>
                  <p className="text-xs text-gray-600">Nuovo allenamento</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/atleta/tornei"
                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all group"
              >
                <div className="p-2 bg-purple-600 rounded-lg group-hover:scale-105 transition-transform">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Iscriviti a Torneo</p>
                  <p className="text-xs text-gray-600">Competizioni disponibili</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/atleta/videos"
                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-all group"
              >
                <div className="p-2 bg-green-600 rounded-lg group-hover:scale-105 transition-transform">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Video Lezioni</p>
                  <p className="text-xs text-gray-600">Migliora la tecnica</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
