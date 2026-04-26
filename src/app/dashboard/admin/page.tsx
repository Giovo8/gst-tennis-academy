"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Calendar,
  Trophy,
  Video,
} from "lucide-react";
import BookingsTimeline from "@/components/admin/BookingsTimeline";
import WeatherCard from "@/components/dashboard/WeatherCard";
import NotificationsList from "@/components/dashboard/NotificationsList";

interface Stats {
  totalUsers: number;
  todayBookings: number;
  activeTournaments: number;
  videoLessonsCount: number;
}

interface TimelineBooking {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  notes: string | null;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    todayBookings: 0,
    activeTournaments: 0,
    videoLessonsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timelineBookings, setTimelineBookings] = useState<TimelineBooking[]>([]);
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

    if (profile) setUserName(profile.full_name || "Admin");

    try {
      const todayStr = new Date().toISOString().split("T")[0];

      const [
        usersResult,
        todayBookingsCount,
        activeTournamentsCount,
        videoLessonsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .gte("start_time", `${todayStr}T00:00:00`)
          .lte("start_time", `${todayStr}T23:59:59`),
        supabase
          .from("tournaments")
          .select("*", { count: "exact", head: true })
          .in("status", ["active", "Aperto", "In Corso"]),
        supabase.from("video_lessons").select("*", { count: "exact", head: true }),
      ]);

      // Bookings per timeline (include anche giorni precedenti)
      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(500);

      if (allBookingsData && allBookingsData.length > 0) {
        const allUserIds = [
          ...new Set([
            ...allBookingsData.map((b) => b.user_id),
            ...allBookingsData.map((b) => b.coach_id).filter(Boolean),
          ]),
        ];

        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", allUserIds);

        const allProfilesMap = new Map(allProfiles?.map((p) => [p.id, p]) || []);

        const allBookingIds = allBookingsData.map((b) => b.id);
        let timelineParticipantsData: TimelineBooking["participants"] | null = null;

        const participantsQuery = await supabase
          .from("booking_participants")
          .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
          .in("booking_id", allBookingIds)
          .order("booking_id", { ascending: true })
          .order("order_index", { ascending: true });

        if (participantsQuery.error?.message?.toLowerCase().includes("phone")) {
          const fallbackQuery = await supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
            .in("booking_id", allBookingIds)
            .order("booking_id", { ascending: true })
            .order("order_index", { ascending: true });
          if (!fallbackQuery.error) timelineParticipantsData = fallbackQuery.data || [];
        } else if (!participantsQuery.error) {
          timelineParticipantsData = participantsQuery.data || [];
        }

        const enrichedTimelineBookings = allBookingsData.map((booking) => ({
          ...booking,
          user_profile: allProfilesMap.get(booking.user_id) || null,
          coach_profile: booking.coach_id
            ? allProfilesMap.get(booking.coach_id) || null
            : null,
          participants:
            timelineParticipantsData?.filter((p) => p.booking_id === booking.id) || [],
        }));

        setTimelineBookings(enrichedTimelineBookings);
      }

      setStats({
        totalUsers: usersResult.count || 0,
        todayBookings: todayBookingsCount.count || 0,
        activeTournaments: activeTournamentsCount.count || 0,
        videoLessonsCount: videoLessonsResult.count || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

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
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Bentornato, {userName}</h1>
          <p className="text-secondary/70 font-medium">Pannello di controllo amministratore</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatTile
          href="/dashboard/admin/users"
          icon={<Users className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Utenti Totali"
          value={stats.totalUsers}
        />
        <StatTile
          href="/dashboard/admin/bookings"
          icon={<Calendar className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Prenotazioni Oggi"
          value={stats.todayBookings}
        />
        <StatTile
          href="/dashboard/admin/tornei"
          icon={<Trophy className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Tornei Attivi"
          value={stats.activeTournaments}
        />
        <StatTile
          href="/dashboard/admin/video-lessons"
          icon={<Video className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Video Lezioni"
          value={stats.videoLessonsCount}
        />
      </div>

      <WeatherCard />

      <div className="w-full">
        <BookingsTimeline bookings={timelineBookings} loading={loading} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-6">
          <NotificationsList limit={0} showSearch={true} showTableHeader={true} maxVisibleRows={12} />
        </div>
      </div>
    </div>
  );
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

