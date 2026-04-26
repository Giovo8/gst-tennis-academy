"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Trophy,
  Video,
  Plus,
  Swords,
} from "lucide-react";
import {
  formatShortItalianDate,
  formatItalianTime,
} from "@/lib/utils/formatItalianDate";
import WeatherCard from "@/components/dashboard/WeatherCard";
import NotificationsList from "@/components/dashboard/NotificationsList";

interface Stats {
  upcomingBookings: number;
  activeTournaments: number;
  completedLessons: number;
  arenaActivities: number;
}

interface DashboardEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  court?: string;
  type?: string;
  eventType: "booking" | "tournament";
  coachName?: string;
  participantsCount?: number;
}

export default function AtletaDashboard() {
  const [stats, setStats] = useState<Stats>({
    upcomingBookings: 0,
    activeTournaments: 0,
    completedLessons: 0,
    arenaActivities: 0,
  });
  const [nextEvents, setNextEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    void loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Atleta");

    const now = new Date().toISOString();

    const [bookingsRes, participationsRes, tournamentsRes, videoRes, arenaRes] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("id, court, type, start_time, end_time, status, coach_id", { count: "exact" })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("start_time", now)
          .order("start_time", { ascending: true })
          .limit(3),
        supabase.from("tournament_participants").select("tournament_id").eq("user_id", user.id),
        supabase
          .from("tournaments")
          .select("id, title, start_date, category, tournament_type")
          .in("status", ["Aperto", "Aperte le Iscrizioni", "In Corso"])
          .gte("start_date", now)
          .order("start_date", { ascending: true })
          .limit(10),
        supabase.from("video_assignments").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase
          .from("arena_challenges")
          .select("id", { count: "exact" })
          .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
          .in("status", ["pending", "accepted"]),
      ]);

    const bookings = bookingsRes.data || [];
    const bookingIds = bookings.map((b) => b.id);
    const coachIds = Array.from(
      new Set(bookings.map((b) => b.coach_id).filter(Boolean))
    ) as string[];

    const participantsCountByBooking = new Map<string, number>();
    if (bookingIds.length > 0) {
      const { data: participants } = await supabase
        .from("booking_participants")
        .select("booking_id")
        .in("booking_id", bookingIds);

      for (const p of participants || []) {
        const id = p.booking_id as string;
        participantsCountByBooking.set(id, (participantsCountByBooking.get(id) || 0) + 1);
      }
    }

    const coachNameById = new Map<string, string>();
    if (coachIds.length > 0) {
      const { data: coaches } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", coachIds);
      for (const c of coaches || []) coachNameById.set(c.id, c.full_name || "-");
    }

    setStats({
      upcomingBookings: bookingsRes.count || 0,
      activeTournaments: participationsRes.data?.length || 0,
      completedLessons: videoRes.count || 0,
      arenaActivities: arenaRes.count || 0,
    });

    const events: DashboardEvent[] = [];

    bookings.forEach((booking) => {
      events.push({
        id: booking.id,
        title: booking.court,
        start_time: booking.start_time,
        end_time: booking.end_time,
        court: booking.court,
        type: booking.type,
        eventType: "booking",
        coachName: booking.coach_id ? coachNameById.get(booking.coach_id) || "-" : "-",
        participantsCount: participantsCountByBooking.get(booking.id) || 0,
      });
    });

    (tournamentsRes.data || []).forEach((tournament) => {
      events.push({
        id: tournament.id,
        title: tournament.title,
        start_time: tournament.start_date,
        eventType: "tournament",
        type: tournament.category || tournament.tournament_type,
      });
    });

    events.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    setNextEvents(events.slice(0, 5));

    setLoading(false);
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
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-1">
            Bentornato, {userName}
          </h1>
          <p className="text-secondary/70 font-medium text-sm sm:text-base">
            Ecco il riepilogo della tua attività
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatTile
          href="/dashboard/atleta/bookings"
          icon={<Calendar className="h-8 w-8 text-white" />}
          label="Prenotazioni"
          value={stats.upcomingBookings}
        />
        <StatTile
          href="/dashboard/atleta/tornei"
          icon={<Trophy className="h-8 w-8 text-white" />}
          label="Tornei Attivi"
          value={stats.activeTournaments}
        />
        <StatTile
          href="/dashboard/atleta/videos"
          icon={<Video className="h-8 w-8 text-white" />}
          label="Video Completati"
          value={stats.completedLessons}
        />
        <StatTile
          href="/dashboard/atleta/arena"
          icon={<Swords className="h-8 w-8 text-white" />}
          label="Arena"
          value={stats.arenaActivities}
        />
      </div>

      <WeatherCard />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 pt-5 pb-4">
          <NotificationsList limit={6} />
        </div>

        <hr className="border-gray-200" />

        <div className="px-4 sm:px-6 pt-5 pb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Prossimi Eventi</h2>
          {nextEvents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">Non hai prossimi appuntamenti</p>
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
                  key={`${event.eventType}-${event.id}`}
                  href={
                    event.eventType === "booking"
                      ? `/dashboard/atleta/bookings/${event.id}`
                      : `/dashboard/atleta/tornei/${event.id}`
                  }
                  className="block bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: "var(--secondary)" }}
                >
                  <div className="flex items-center gap-3">
                    {event.eventType === "booking" ? (
                      <Calendar className="h-5 w-5 text-secondary/60 flex-shrink-0" strokeWidth={2} />
                    ) : (
                      <Trophy className="h-5 w-5 text-secondary/60 flex-shrink-0" strokeWidth={2} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                        <p className="font-bold text-secondary text-sm truncate">{event.title}</p>
                        <p className="text-xs text-secondary/70">
                          {formatShortItalianDate(event.start_time)}
                          {event.eventType === "booking" && ` • ${formatItalianTime(event.start_time)}`}
                        </p>
                      </div>
                      <p className="text-xs text-secondary/60 mt-0.5">
                        {event.eventType === "booking"
                          ? `${formatBookingType(event.type)}${event.coachName && event.coachName !== "-" ? ` • ${event.coachName}` : ""}`
                          : event.type || "Torneo"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBookingType(type?: string) {
  if (type === "lezione_privata") return "Lezione Privata";
  if (type === "lezione_gruppo") return "Lezione Gruppo";
  return "Campo";
}

function StatTile({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4"
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-white/70">{label}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
    </Link>
  );
}
