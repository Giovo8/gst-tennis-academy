"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Trophy,
  CreditCard,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Video,
} from "lucide-react";

interface Stats {
  creditsAvailable: number;
  weeklyCredits: number;
  upcomingBookings: number;
  activeTournaments: number;
  videosCount: number;
}

interface Booking {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Tournament {
  id: string;
  title: string;
  starts_at: string;
  status: string;
}

export default function AthleteHomePage() {
  const [stats, setStats] = useState<Stats>({
    creditsAvailable: 0,
    weeklyCredits: 0,
    upcomingBookings: 0,
    activeTournaments: 0,
    videosCount: 0,
  });
  const [nextBookings, setNextBookings] = useState<Booking[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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

    if (profile) setUserName(profile.full_name || "");

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

    let tournamentsData: Tournament[] = [];
    if (participations && participations.length > 0) {
      const tournamentIds = participations.map(p => p.tournament_id);
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, title, starts_at, status")
        .in("id", tournamentIds)
        .in("status", ["Aperto", "In Corso"])
        .order("starts_at", { ascending: true })
        .limit(3);
      
      if (t) tournamentsData = t;
    }

    // Load videos count
    const { count: videosCount } = await supabase
      .from("video_lessons")
      .select("*", { count: "exact", head: true })
      .eq("athlete_id", user.id);

    setStats({
      creditsAvailable: credits?.credits_available || 0,
      weeklyCredits: credits?.weekly_credits || 0,
      upcomingBookings: bookingsCount || 0,
      activeTournaments: tournamentsData.length,
      videosCount: videosCount || 0,
    });

    setNextBookings(bookings || []);
    setTournaments(tournamentsData);
    setLoading(false);
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 skeleton rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          {getGreeting()}, {userName || "Atleta"}! 👋
        </h1>
        <p className="text-white/80">
          Ecco un riepilogo della tua attività in GST Tennis Academy
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-xs text-[var(--foreground-subtle)]">Crediti</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">
            {stats.creditsAvailable}
            <span className="text-base font-normal text-[var(--foreground-muted)]">
              /{stats.weeklyCredits}
            </span>
          </p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">
            disponibili questa settimana
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-5 w-5 text-green-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Prenotazioni</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.upcomingBookings}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">in programma</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Tornei</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.activeTournaments}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">attivi</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Video className="h-5 w-5 text-purple-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Video</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.videosCount}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">assegnati</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/atleta/bookings/new"
          className="flex items-center justify-between p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Nuova Prenotazione</h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Prenota un campo o una lezione
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--foreground-subtle)] group-hover:text-[var(--primary)] transition-colors" />
        </Link>

        <Link
          href="/dashboard/atleta/tornei"
          className="flex items-center justify-between p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Esplora Tornei</h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Iscriviti ai tornei disponibili
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--foreground-subtle)] group-hover:text-yellow-500 transition-colors" />
        </Link>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">Prossime Prenotazioni</h2>
          <Link
            href="/dashboard/atleta/bookings"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Vedi tutte
          </Link>
        </div>
        
        {nextBookings.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-[var(--foreground-subtle)] mx-auto mb-3" />
            <p className="text-[var(--foreground-muted)]">Nessuna prenotazione in programma</p>
            <Link
              href="/dashboard/atleta/bookings/new"
              className="inline-flex items-center gap-2 mt-4 text-[var(--primary)] hover:underline"
            >
              <Calendar className="h-4 w-4" />
              Prenota ora
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {nextBookings.map((booking) => (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--background-subtle)] flex flex-col items-center justify-center">
                    <span className="text-xs text-[var(--foreground-subtle)]">
                      {formatDate(booking.start_time).split(" ")[0]}
                    </span>
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      {new Date(booking.start_time).getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{booking.court}</p>
                    <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                      <Clock className="h-3 w-3" />
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {booking.status === "confirmed" ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      Confermata
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="h-4 w-4" />
                      In attesa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Tournaments */}
      {tournaments.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">I Tuoi Tornei</h2>
            <Link
              href="/dashboard/atleta/tornei"
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Vedi tutti
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tornei/${tournament.id}`}
                className="p-4 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{tournament.title}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      {formatDate(tournament.starts_at)}
                    </p>
                  </div>
                </div>
                <span className={`
                  px-2 py-1 text-xs font-medium rounded-full
                  ${tournament.status === "In Corso" 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}
                `}>
                  {tournament.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
