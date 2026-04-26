"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Video,
  Users,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import WeatherCard from "@/components/dashboard/WeatherCard";
import NotificationsList from "@/components/dashboard/NotificationsList";
import BookingsTimeline from "@/components/admin/BookingsTimeline";

type Stats = {
  upcomingLessons: number;
  uniqueAthletes: number;
  monthlyLessons: number;
  assignedVideos: number;
};

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

export default function MaestroDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    upcomingLessons: 0,
    uniqueAthletes: 0,
    monthlyLessons: 0,
    assignedVideos: 0,
  });
  const [timelineBookings, setTimelineBookings] = useState<TimelineBooking[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
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
    if (profile) setUserName(profile.full_name || "Maestro");
    setCurrentUserId(user.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    try {
      const [upcomingRes, monthRes, assignedVideosRes, allBookingsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, user_id", { count: "exact", head: true })
          .eq("coach_id", user.id)
          .gte("start_time", now.toISOString()),
        supabase
          .from("bookings")
          .select("id, user_id", { count: "exact" })
          .eq("coach_id", user.id)
          .gte("start_time", startOfMonth.toISOString())
          .lt("start_time", startOfNextMonth.toISOString()),
        supabase
          .from("video_lessons")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id),
        // Fetch ALL bookings within a wide date range for the timeline
        supabase
          .from("bookings")
          .select("*")
          .gte("start_time", new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString())
          .lte("start_time", new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString())
          .order("start_time", { ascending: false })
          .limit(2000),
      ]);

      const monthRows = (monthRes.data ?? []) as Array<{ user_id: string }>;
      const uniqueIds = new Set(monthRows.map((r) => r.user_id));

      setStats({
        upcomingLessons: upcomingRes.count || 0,
        uniqueAthletes: uniqueIds.size,
        monthlyLessons: monthRes.count || 0,
        assignedVideos: assignedVideosRes.count || 0,
      });

      const allBookingsData = allBookingsRes.data ?? [];
      if (allBookingsData.length > 0) {
        // Only enrich profiles for own bookings (where user is coach or athlete)
        const ownBookingIds = new Set(
          allBookingsData
            .filter((b) => b.coach_id === user.id || b.user_id === user.id)
            .map((b) => b.id)
        );

        const ownBookingsData = allBookingsData.filter((b) => ownBookingIds.has(b.id));

        const allUserIds = [
          ...new Set([
            ...ownBookingsData.map((b) => b.user_id),
            ...ownBookingsData.map((b) => b.coach_id).filter(Boolean),
          ]),
        ];

        const profilesPromise = allUserIds.length > 0
          ? supabase.from("profiles").select("id, full_name, email, phone").in("id", allUserIds)
          : Promise.resolve({ data: [] });

        const ownBookingIdsList = ownBookingsData.map((b) => b.id);
        const participantsPromise = ownBookingIdsList.length > 0
          ? supabase
              .from("booking_participants")
              .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
              .in("booking_id", ownBookingIdsList)
              .order("booking_id", { ascending: true })
              .order("order_index", { ascending: true })
          : Promise.resolve({ data: [], error: null });

        const [{ data: allProfiles }, participantsQuery] = await Promise.all([
          profilesPromise,
          participantsPromise,
        ]);

        const allProfilesMap = new Map(allProfiles?.map((p) => [p.id, p]) || []);

        let participantsData: TimelineBooking["participants"] | null = null;
        if ((participantsQuery as any).error?.message?.toLowerCase().includes("phone")) {
          const fallbackQuery = await supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
            .in("booking_id", ownBookingIdsList);
          if (!fallbackQuery.error) participantsData = fallbackQuery.data || [];
        } else if (!(participantsQuery as any).error) {
          participantsData = (participantsQuery as any).data || [];
        }

        setTimelineBookings(
          allBookingsData.map((booking) => {
            const isOwn = ownBookingIds.has(booking.id);
            return {
              ...booking,
              user_profile: isOwn ? (allProfilesMap.get(booking.user_id) || null) : null,
              coach_profile: isOwn && booking.coach_id
                ? (allProfilesMap.get(booking.coach_id) || null)
                : null,
              participants: isOwn
                ? (participantsData?.filter((p) => p.booking_id === booking.id) || [])
                : [],
            };
          })
        );
      }
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
          <p className="text-secondary/70 font-medium">Le tue lezioni e i tuoi atleti</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatTile
          href="/dashboard/maestro/bookings"
          icon={<Calendar className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Prossime lezioni"
          value={stats.upcomingLessons}
        />
        <StatTile
          href="/dashboard/maestro/bookings"
          icon={<CheckCircle className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Lezioni nel mese"
          value={stats.monthlyLessons}
        />
        <StatTile
          href="/dashboard/maestro/videos"
          icon={<Video className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Video assegnati"
          value={stats.assignedVideos}
        />
        <StatTile
          href="/dashboard/maestro/bookings"
          icon={<Users className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Atleti del mese"
          value={stats.uniqueAthletes}
        />
      </div>

      <WeatherCard />

      <div className="w-full">
        <BookingsTimeline bookings={timelineBookings} loading={loading} basePath="/dashboard/maestro" highlightUserId={currentUserId} />
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
