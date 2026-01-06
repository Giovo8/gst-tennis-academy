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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bentornato, {userName}
          </h1>
          <p className="text-sm text-gray-600">
            Ecco il riepilogo della tua attività
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/atleta/(main)/subscription"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <CreditCard className="h-4 w-4" />
            Gestisci Abbonamento
          </Link>
          <Link
            href="/dashboard/atleta/bookings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-frozen-500 rounded-xl hover:bg-frozen-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            Prenota Campo
          </Link>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-white rounded-xl p-6 border border-gray-200 overflow-hidden group hover:border-gray-300 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-frozen-50 rounded-full -mr-10 -mt-10 opacity-50" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-frozen-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 rounded-md">
                Disponibili
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.creditsAvailable}</p>
              <p className="text-sm font-medium text-gray-600">Crediti</p>
              <p className="text-xs text-gray-500">{stats.weeklyCredits} crediti/settimana</p>
            </div>
          </div>
        </div>

        <div className="relative bg-white rounded-xl p-6 border border-gray-200 overflow-hidden group hover:border-gray-300 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-frozen-50 rounded-full -mr-10 -mt-10 opacity-50" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-frozen-50 rounded-lg">
                <Calendar className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 rounded-md">
                In arrivo
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.upcomingBookings}</p>
              <p className="text-sm font-medium text-gray-600">Prenotazioni</p>
              <p className="text-xs text-gray-500">Prossime sessioni</p>
            </div>
          </div>
        </div>

        <div className="relative bg-white rounded-xl p-6 border border-gray-200 overflow-hidden group hover:border-gray-300 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-frozen-50 rounded-full -mr-10 -mt-10 opacity-50" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-frozen-50 rounded-lg">
                <Trophy className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 rounded-md">
                Attivi
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.activeTournaments}</p>
              <p className="text-sm font-medium text-gray-600">Tornei</p>
              <p className="text-xs text-gray-500">In competizione</p>
            </div>
          </div>
        </div>

        <div className="relative bg-white rounded-xl p-6 border border-gray-200 overflow-hidden group hover:border-gray-300 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-frozen-50 rounded-full -mr-10 -mt-10 opacity-50" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-frozen-50 rounded-lg">
                <Video className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 rounded-md">
                Questo mese
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.completedLessons}</p>
              <p className="text-sm font-medium text-gray-600">Video</p>
              <p className="text-xs text-gray-500">Lezioni completate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prossime Prenotazioni - Span 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-frozen-600" />
                Prossime Prenotazioni
              </h2>
              <Link
                href="/dashboard/atleta/bookings"
                className="text-sm font-semibold text-frozen-500 hover:text-frozen-600 flex items-center gap-1 transition-colors"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-frozen-500 rounded-xl hover:bg-frozen-600 transition-all"
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
                    className="relative p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-frozen-300 hover:bg-frozen-50/30 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-2 bg-frozen-500 rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{booking.court}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-frozen-50 text-frozen-700 rounded-md whitespace-nowrap">
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
                  <Bell className="h-5 w-5 text-frozen-600" />
                  Annunci
                </h2>
                <Link
                  href="/dashboard/atleta/annunci"
                  className="text-sm font-semibold text-frozen-500 hover:text-frozen-600 flex items-center gap-1 transition-colors"
                >
                  Tutti
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
                    <Link
                      key={announcement.id}
                      href="/dashboard/atleta/annunci"
                      className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-frozen-300 hover:bg-frozen-50/30 transition-all group relative"
                    >
                      {announcement.is_pinned && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-frozen-500 rounded-full" />
                      )}
                      
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 p-1.5 bg-frozen-50 rounded-md">
                          <Megaphone className="h-4 w-4 text-frozen-600" />
                        </div>
                        <h3 className="flex-1 font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-frozen-600 transition-colors">
                          {announcement.title}
                        </h3>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-3 ml-9">
                        {announcement.content}
                      </p>

                      <div className="flex items-center justify-between ml-9">
                        {announcement.profiles?.full_name && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-6 h-6 rounded-full bg-frozen-50 flex items-center justify-center text-frozen-700 font-semibold text-xs">
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
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Azioni Rapide */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-frozen-600" />
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
                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-frozen-50 hover:border-frozen-300 transition-all group"
              >
                <div className="p-2 bg-frozen-500 rounded-lg group-hover:scale-105 transition-transform">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Prenota Campo</p>
                  <p className="text-xs text-gray-600">Nuovo allenamento</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-frozen-500 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/atleta/tornei"
                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-frozen-50 hover:border-frozen-300 transition-all group"
              >
                <div className="p-2 bg-frozen-500 rounded-lg group-hover:scale-105 transition-transform">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Iscriviti a Torneo</p>
                  <p className="text-xs text-gray-600">Competizioni disponibili</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-frozen-500 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/atleta/videos"
                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-frozen-50 hover:border-frozen-300 transition-all group"
              >
                <div className="p-2 bg-frozen-500 rounded-lg group-hover:scale-105 transition-transform">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Video Lezioni</p>
                  <p className="text-xs text-gray-600">Migliora la tecnica</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-frozen-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
