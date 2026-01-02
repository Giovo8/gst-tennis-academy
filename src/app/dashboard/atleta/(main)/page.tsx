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
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2">
            Dashboard Atleta
          </h1>
          <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>
            Bentornato, {userName}! Gestisci i tuoi allenamenti e progressi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/atleta/(main)/subscription"
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Abbonamento
          </Link>
          <Link
            href="/dashboard/atleta/bookings/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Prenotazione
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-frozen-50 rounded-xl">
              <CreditCard className="h-6 w-6 text-frozen-500" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{stats.creditsAvailable}</p>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Crediti Disponibili</p>
          <p className="text-xs text-frozen-600 font-medium">{stats.weeklyCredits} crediti settimanali</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-frozen-50 rounded-xl">
              <Calendar className="h-6 w-6 text-frozen-500" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{stats.upcomingBookings}</p>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Prenotazioni</p>
          <p className="text-xs text-frozen-600 font-medium">Prossime sessioni</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-frozen-50 rounded-xl">
              <Trophy className="h-6 w-6 text-frozen-500" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{stats.activeTournaments}</p>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Tornei Attivi</p>
          <p className="text-xs text-frozen-600 font-medium">In competizione</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-frozen-50 rounded-xl">
              <Video className="h-6 w-6 text-frozen-500" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{stats.completedLessons}</p>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Video Completati</p>
          <p className="text-xs text-frozen-600 font-medium">Questo mese</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prossime Prenotazioni - 1 colonna */}
        <div className="bg-white rounded-xl border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-frozen-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-frozen-500" />
                Prossime Prenotazioni
              </h2>
              <Link
                href="/dashboard/atleta/bookings"
                className="text-sm font-medium text-frozen-600 hover:text-frozen-700 flex items-center gap-1 transition-colors"
              >
                Vedi tutte
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="p-6">
            {nextBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-frozen-50 rounded-full w-fit mx-auto mb-4">
                  <Calendar className="h-10 w-10 text-frozen-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Nessuna prenotazione</p>
                <p className="text-xs text-gray-600 mb-4">Prenota un campo per iniziare</p>
                <Link
                  href="/dashboard/atleta/bookings/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-all shadow-sm"
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
                    className="group relative flex items-start gap-4 p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:border-frozen-300 hover:shadow-sm transition-all"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className="p-2.5 bg-frozen-500 rounded-xl shadow-sm">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      {index < nextBookings.length - 1 && (
                        <div className="w-0.5 h-8 bg-frozen-200 mt-2" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-sm">{booking.court}</h3>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-frozen-100 text-frozen-700 border border-frozen-300 rounded-full whitespace-nowrap">
                          {booking.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-frozen-500" />
                          <span className="font-medium">{formatDate(booking.start_time)}</span>
                        </div>
                        <span className="text-frozen-400">•</span>
                        <span className="font-medium">{formatTime(booking.start_time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Annunci Recenti - 1 colonna */}
        <div className="bg-white rounded-xl border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-frozen-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-frozen-500" />
                Ultimi Annunci
              </h2>
              <Link
                href="/dashboard/atleta/annunci"
                className="text-sm font-medium text-frozen-600 hover:text-frozen-700 flex items-center gap-1 transition-colors"
              >
                Tutti
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="p-6">
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-frozen-50 rounded-full w-fit mx-auto mb-4">
                  <Megaphone className="h-10 w-10 text-frozen-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Nessun annuncio</p>
                <p className="text-xs text-gray-600">Al momento non ci sono annunci</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <Link
                    key={announcement.id}
                    href="/dashboard/atleta/annunci"
                    className="group relative block bg-frozen-50 rounded-xl border border-frozen-200 p-4 hover:shadow-md hover:border-frozen-300 transition-all"
                  >
                    {announcement.is_pinned && (
                      <div className="absolute top-3 right-3 w-2 h-2 bg-frozen-500 rounded-full ring-2 ring-frozen-200" />
                    )}
                    
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 bg-frozen-100 rounded-lg">
                        <Megaphone className="h-4 w-4 text-frozen-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-frozen-700 transition-colors">
                          {announcement.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {announcement.content}
                    </p>

                    <div className="flex items-center justify-between">
                      {announcement.profiles?.full_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <div className="w-6 h-6 rounded-full bg-frozen-200 flex items-center justify-center text-frozen-700 font-bold text-xs">
                            {announcement.profiles.full_name.charAt(0)}
                          </div>
                          <span className="truncate font-medium">{announcement.profiles.full_name}</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(announcement.created_at).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short"
                        })}
                      </span>
                    </div>

                    {announcement.priority === "urgent" && (
                      <div className="absolute bottom-3 right-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
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

        {/* Azioni Rapide - 1 colonna */}
        <div className="bg-white rounded-xl border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-frozen-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-frozen-500" />
              Azioni Rapide
            </h2>
          </div>

          <div className="p-4 space-y-2">
            <Link
              href="/dashboard/atleta/bookings/new"
              className="flex items-center gap-4 p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:bg-frozen-100 hover:border-frozen-300 hover:shadow-sm transition-all group"
            >
              <div className="p-3 bg-frozen-500 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-0.5">Prenota Campo</p>
                <p className="text-xs text-gray-600">Nuovo allenamento</p>
              </div>
              <ArrowRight className="h-5 w-5 text-frozen-400 group-hover:text-frozen-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/atleta/tornei"
              className="flex items-center gap-4 p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:bg-frozen-100 hover:border-frozen-300 hover:shadow-sm transition-all group"
            >
              <div className="p-3 bg-frozen-500 rounded-xl group-hover:scale-110 transition-transform">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-0.5">Iscriviti a Torneo</p>
                <p className="text-xs text-gray-600">Competizioni disponibili</p>
              </div>
              <ArrowRight className="h-5 w-5 text-frozen-400 group-hover:text-frozen-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/atleta/videos"
              className="flex items-center gap-4 p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:bg-frozen-100 hover:border-frozen-300 hover:shadow-sm transition-all group"
            >
              <div className="p-3 bg-frozen-500 rounded-xl group-hover:scale-110 transition-transform">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-0.5">Video Lezioni</p>
                <p className="text-xs text-gray-600">Migliora la tecnica</p>
              </div>
              <ArrowRight className="h-5 w-5 text-frozen-400 group-hover:text-frozen-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/atleta/profile"
              className="flex items-center gap-4 p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:bg-frozen-100 hover:border-frozen-300 hover:shadow-sm transition-all group"
            >
              <div className="p-3 bg-frozen-500 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-0.5">Il Mio Profilo</p>
                <p className="text-xs text-gray-600">Dati e statistiche</p>
              </div>
              <ArrowRight className="h-5 w-5 text-frozen-400 group-hover:text-frozen-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/atleta/annunci"
              className="flex items-center gap-4 p-4 bg-frozen-100 rounded-xl border border-frozen-300 hover:bg-frozen-200 hover:shadow-sm transition-all group"
            >
              <div className="p-3 bg-frozen-600 rounded-xl group-hover:scale-110 transition-transform">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-0.5">Annunci</p>
                <p className="text-xs text-gray-600">Novità e aggiornamenti</p>
              </div>
              <ArrowRight className="h-5 w-5 text-frozen-400 group-hover:text-frozen-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* Progressi e Obiettivi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progressi Mensili */}
        <div className="bg-white rounded-xl border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-frozen-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-frozen-500" />
              Progressi Mensili
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">Lezioni Completate</span>
                <span className="text-sm font-extrabold text-frozen-700">{stats.completedLessons}/30</span>
              </div>
              <div className="w-full h-4 bg-frozen-100 rounded-full overflow-hidden border border-frozen-200">
                <div 
                  className="h-full bg-frozen-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(stats.completedLessons / 30) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:shadow-sm transition-shadow">
                <CheckCircle2 className="h-7 w-7 text-frozen-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-900 mb-1">{stats.completedLessons}</p>
                <p className="text-xs font-medium text-gray-600">Completate</p>
              </div>
              <div className="text-center p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:shadow-sm transition-shadow">
                <Clock className="h-7 w-7 text-frozen-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-900 mb-1">{stats.upcomingBookings}</p>
                <p className="text-xs font-medium text-gray-600">In Programma</p>
              </div>
              <div className="text-center p-4 bg-frozen-50 rounded-xl border border-frozen-200 hover:shadow-sm transition-shadow">
                <Trophy className="h-7 w-7 text-frozen-500 mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-gray-900 mb-1">{stats.activeTournaments}</p>
                <p className="text-xs font-medium text-gray-600">Tornei</p>
              </div>
            </div>
          </div>
        </div>

        {/* Obiettivi */}
        <div className="bg-white rounded-xl border border-frozen-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-frozen-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-frozen-500" />
              I Tuoi Obiettivi
            </h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-frozen-50 rounded-xl p-5 border border-frozen-200 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">Allenamenti Settimanali</span>
                <span className="text-sm font-extrabold text-frozen-700">3/4</span>
              </div>
              <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-frozen-200">
                <div className="h-full bg-frozen-500 rounded-full transition-all duration-500" style={{ width: '75%' }} />
              </div>
            </div>

            <div className="bg-frozen-50 rounded-xl p-5 border border-frozen-200 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">Partite Giocate</span>
                <span className="text-sm font-extrabold text-frozen-700">8/10</span>
              </div>
              <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-frozen-200">
                <div className="h-full bg-frozen-500 rounded-full transition-all duration-500" style={{ width: '80%' }} />
              </div>
            </div>

            <div className="bg-frozen-100 rounded-xl p-5 border border-frozen-300 mt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-frozen-500 rounded-lg">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Ottimo lavoro! Continua così per raggiungere i tuoi obiettivi mensili.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
