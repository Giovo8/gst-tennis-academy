"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  CalendarClock,
  Trophy,
  Video,
  Swords,
} from "lucide-react";
import WeatherCard from "@/components/dashboard/WeatherCard";
import NotificationsList from "@/components/dashboard/NotificationsList";

interface Stats {
  upcomingBookings: number;
  activeTournaments: number;
  completedLessons: number;
  arenaActivities: number;
}

interface UpcomingBooking {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  coach_id: string | null;
  coach_name?: string;
}

export default function AtletaDashboard() {
  const [stats, setStats] = useState<Stats>({
    upcomingBookings: 0,
    activeTournaments: 0,
    completedLessons: 0,
    arenaActivities: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);

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

    const [bookingsRes, participationsRes, videoRes, arenaRes] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("id, court, type, start_time, end_time, coach_id", { count: "exact" })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("start_time", now)
          .order("start_time", { ascending: true })
          .limit(20),
        supabase.from("tournament_participants").select("tournament_id").eq("user_id", user.id),
        supabase.from("video_assignments").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase
          .from("arena_challenges")
          .select("id", { count: "exact" })
          .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
          .in("status", ["pending", "accepted"]),
      ]);

    setStats({
      upcomingBookings: bookingsRes.count || 0,
      activeTournaments: participationsRes.data?.length || 0,
      completedLessons: videoRes.count || 0,
      arenaActivities: arenaRes.count || 0,
    });

    const bookings = (bookingsRes.data || []) as UpcomingBooking[];
    const coachIds = Array.from(new Set(bookings.map((b) => b.coach_id).filter(Boolean))) as string[];

    const coachNameById = new Map<string, string>();
    if (coachIds.length > 0) {
      const { data: coaches } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", coachIds);

      for (const coach of coaches || []) {
        coachNameById.set(coach.id, coach.full_name || "Maestro");
      }
    }

    setUpcomingBookings(
      bookings.slice(0, 4).map((booking) => ({
        ...booking,
        coach_name: booking.coach_id
          ? coachNameById.get(booking.coach_id) || "Maestro"
          : undefined,
      }))
    );

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
      <h1 className="text-4xl font-bold text-secondary">Bentornato, {userName}</h1>

      <WeatherCard />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Prossime prenotazioni</h2>
        </div>
        <div className="px-4 py-4">
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-secondary/40">
              <CalendarClock className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">Nessun impegno in arrivo</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingBookings.map((booking) => {
                const start = new Date(booking.start_time);
                const typeColors: Record<string, string> = {
                  lezione_privata: "#023047",
                  lezione_gruppo: "#023047",
                  campo: "var(--secondary)",
                  lezione: "#023047",
                  arena: "var(--color-frozen-lake-600)",
                };
                const typeBg = typeColors[booking.type] || "var(--secondary)";
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const dayAfter = new Date(today);
                dayAfter.setDate(today.getDate() + 2);

                let dayPill: { text: string; cls: string } | null = null;
                if (start >= today && start < tomorrow) {
                  dayPill = { text: "Oggi", cls: "bg-primary text-white" };
                } else if (start >= tomorrow && start < dayAfter) {
                  dayPill = { text: "Domani", cls: "bg-secondary/10 text-secondary" };
                }

                return (
                  <li key={booking.id}>
                    <Link
                      href={`/dashboard/atleta/bookings/${booking.id}`}
                      className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                      style={{ background: typeBg }}
                    >
                      <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                          {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                          {start.getDate()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {booking.coach_name
                            ? `${formatBookingType(booking.type)} - ${booking.coach_name}`
                            : formatBookingType(booking.type)}
                        </p>
                        <p className="text-xs text-white/70 mt-0.5">
                          {formatBookingTimeRange(booking.start_time, booking.end_time)} · {booking.court}
                        </p>
                      </div>

                      {dayPill && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${dayPill.cls}`}
                        >
                          {dayPill.text}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            href="/dashboard/atleta/bookings"
            icon={<Calendar className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
            label="Prenotazioni"
            value={stats.upcomingBookings}
          />
          <StatTile
            href="/dashboard/atleta/tornei"
            icon={<Trophy className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
            label="Competizioni in corso"
            value={stats.activeTournaments}
          />
          <StatTile
            href="/dashboard/atleta/videos"
            icon={<Video className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
            label="Video Assegnati"
            value={stats.completedLessons}
          />
          <StatTile
            href="/dashboard/atleta/arena"
            icon={<Swords className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
            label="Sfide Arena"
            value={stats.arenaActivities}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Centro Notifiche</h2>
        </div>
        <div className="px-6 py-4">
          <NotificationsList limit={0} showSearch={true} showTableHeader={true} showHeader={false} maxVisibleRows={5} />
        </div>
      </div>

    </div>
  );
}

function formatBookingType(type?: string) {
  if (type === "lezione_privata") return "Lezione privata";
  if (type === "lezione_gruppo") return "Lezione gruppo";
  if (type === "arena") return "Match Arena";
  if (type === "campo") return "Campo";
  return "Prenotazione";
}

function formatBookingTimeRange(startTime: string, endTime: string) {
  const toTime = (value: string) =>
    new Date(value).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return `${toTime(startTime)}-${toTime(endTime)}`;
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
      className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all group flex flex-row items-center gap-4"
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 hidden sm:block">
        <p className="text-sm text-white/70">{label}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className="flex sm:hidden items-center gap-3 flex-1">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        <p className="text-base text-white/70">{label}</p>
      </div>
    </Link>
  );
}
