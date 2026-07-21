"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  CalendarClock,
  Bell,
  UserPlus,
  GraduationCap,
  Shield,
} from "lucide-react";
import BookingsTimeline from "@/components/admin/BookingsTimeline";
import { useTimelineData } from "@/components/admin/hooks/useTimelineData";
import WeatherCard from "@/components/dashboard/WeatherCard";

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
  const [loading, setLoading] = useState(true);
  const [timelineBookings, setTimelineBookings] = useState<TimelineBooking[]>([]);
  const [userName, setUserName] = useState("");
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const { courseEntries: todayCourseEntries } = useTimelineData({
    selectedDate: today,
    showCourses: true,
    showCourtBlocks: false,
    fetchOccupied: false,
  });


  useEffect(() => {
    void loadDashboardData();

    const channel = supabase
      .channel("admin-dashboard-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => { void loadDashboardData(); }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
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

        const allBookingIds = allBookingsData.map((b) => b.id);
        let timelineParticipantsData: TimelineBooking["participants"] | null = null;

        // Round 2: profili utenti e partecipanti in parallelo
        const [{ data: allProfiles }, participantsQuery] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", allUserIds),
          supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
            .in("booking_id", allBookingIds)
            .order("booking_id", { ascending: true })
            .order("order_index", { ascending: true }),
        ]);

        const allProfilesMap = new Map(allProfiles?.map((p) => [p.id, p]) || []);

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
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  }

  const now = new Date();
  const todayBookingsCount = timelineBookings.filter((b) => {
    if (b.status === "cancelled" || b.status === "cancellation_requested") return false;
    const start = new Date(b.start_time);
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  }).length + todayCourseEntries.length;

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
    <div className="space-y-6 pt-3">
      <h1 className="text-4xl font-bold text-secondary">Dashboard</h1>

      <WeatherCard />

      <Link href="/dashboard/admin/bookings?filter=today" className="block bg-secondary rounded-lg text-white overflow-hidden hover:opacity-90 transition-opacity">
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
              <CalendarClock className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg">Prenotazioni di Oggi</span>
          </div>
          <span className="text-2xl font-bold leading-none">{todayBookingsCount}</span>
        </div>
      </Link>

      <div className="w-full">
        <BookingsTimeline bookings={timelineBookings} loading={loading} showEntryModal={false} scrollToCurrentTime={true} enableDragEdit={true} onBookingsChanged={loadDashboardData} />
      </div>

      {/* AZIONI RAPIDE */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/admin/notifications" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Bell className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Centro Notifiche</span>
        </Link>
        <Link href="/dashboard/admin/users/new" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Crea Utente</span>
        </Link>
        <Link href="/dashboard/admin/corsi/new" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Crea Corso</span>
        </Link>
        <Link href="/dashboard/admin/courts/new" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Crea Blocco Campo</span>
        </Link>
      </div>
    </div>
  );
}

