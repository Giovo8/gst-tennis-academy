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

export default function AtletaDashboard() {
  const [stats, setStats] = useState<Stats>({
    creditsAvailable: 0,
    weeklyCredits: 0,
    upcomingBookings: 0,
    activeTournaments: 0,
    completedLessons: 0,
  });
  const [nextBookings, setNextBookings] = useState<Booking[]>([]);
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
            className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Prenotazione
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.creditsAvailable}</p>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>Crediti Disponibili</p>
          <p className="text-xs text-gray-600">{stats.weeklyCredits} crediti settimanali</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.upcomingBookings}</p>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>Prenotazioni</p>
          <p className="text-xs text-gray-600">Prossime sessioni</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.activeTournaments}</p>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>Tornei Attivi</p>
          <p className="text-xs text-gray-600">In competizione</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Video className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.completedLessons}</p>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>Video Completati</p>
          <p className="text-xs text-gray-600">Questo mese</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prossime Prenotazioni - 2 colonne */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Prossime Prenotazioni
              </h2>
              <Link
                href="/dashboard/atleta/bookings"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Vedi tutte
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="p-6">
            {nextBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700 mb-2">Nessuna prenotazione</p>
                <p className="text-xs text-gray-600 mb-4">Prenota un campo per iniziare ad allenarti</p>
                <Link
                  href="/dashboard/atleta/bookings/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Prenota Ora
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {nextBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{booking.court}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(booking.start_time)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
                      {booking.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Azioni Rapide - 1 colonna */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              Azioni Rapide
            </h2>
          </div>

          <div className="p-4 space-y-2">
            <Link
              href="/dashboard/atleta/bookings/new"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Prenota Campo</p>
                <p className="text-xs text-gray-600">Nuovo allenamento</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link
              href="/dashboard/atleta/tornei"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group"
            >
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Iscriviti a Torneo</p>
                <p className="text-xs text-gray-600">Competizioni disponibili</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
            </Link>

            <Link
              href="/dashboard/atleta/videos"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Video className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Video Lezioni</p>
                <p className="text-xs text-gray-600">Migliora la tecnica</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </Link>

            <Link
              href="/dashboard/atleta/profile"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group"
            >
              <div className="p-2 bg-emerald-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Il Mio Profilo</p>
                <p className="text-xs text-gray-600">Dati e statistiche</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Progressi e Obiettivi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progressi Mensili */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Progressi Mensili
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Lezioni Completate</span>
                <span className="text-sm font-bold text-blue-600">{stats.completedLessons}/30</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                  style={{ width: `${(stats.completedLessons / 30) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.completedLessons}</p>
                <p className="text-xs text-gray-600">Completate</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Clock className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingBookings}</p>
                <p className="text-xs text-gray-600">In Programma</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Trophy className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.activeTournaments}</p>
                <p className="text-xs text-gray-600">Tornei</p>
              </div>
            </div>
          </div>
        </div>

        {/* Obiettivi */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-600" />
              I Tuoi Obiettivi
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Allenamenti Settimanali</span>
                <span className="text-sm font-bold text-gray-900">3/4</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Partite Giocate</span>
                <span className="text-sm font-bold text-gray-900">8/10</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
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
