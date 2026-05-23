"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  CalendarClock,
  CalendarPlus,
  UserPlus,
  Video,
  Newspaper,
} from "lucide-react";
import BookingsTimeline from "@/components/admin/BookingsTimeline";
import WeatherCard from "@/components/dashboard/WeatherCard";
import NotificationsList from "@/components/dashboard/NotificationsList";
import { UpcomingCommitmentsCard, UpcomingBooking } from "@/components/dashboard/UpcomingCommitmentsCard";

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

interface UpcomingCourse {
  id: string;
  name: string;
  court_name: string;
  start_time: string;
  end_time: string;
  isCourse: true;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [timelineBookings, setTimelineBookings] = useState<TimelineBooking[]>([]);
  const [upcomingCourses, setUpcomingCourses] = useState<UpcomingCourse[]>([]);
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

      // Carica prossime occorrenze dei corsi attivi
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, name, schedule_days, schedule_time, schedule_periods, court_name, start_date, end_date")
        .eq("is_active", true);

      if (coursesData && coursesData.length > 0) {
        const DAY_NAMES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
        const occurrences: UpcomingCourse[] = [];
        const now2 = new Date();

        for (const course of coursesData) {
          if (!course.schedule_days?.length) continue;
          const startDate = course.start_date ? new Date(course.start_date + "T00:00:00") : null;
          const endDate = course.end_date ? new Date(course.end_date + "T23:59:59") : null;

          const searchDate = new Date(now2);
          searchDate.setHours(0, 0, 0, 0);

          for (let i = 0; i < 90; i++) {
            const dayName = DAY_NAMES[searchDate.getDay()];
            if (course.schedule_days.includes(dayName)) {
              // Pick the right time for this day (multi-period support)
              let timeStr: string | null = course.schedule_time ?? null;
              if (course.schedule_periods && course.schedule_periods.length > 0) {
                const mp = course.schedule_periods.find((p: { days: string[]; time: string | null }) => p.days.includes(dayName));
                timeStr = mp?.time ?? timeStr;
              }
              if (!timeStr) { searchDate.setDate(searchDate.getDate() + 1); continue; }
              const m = timeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
              if (!m) { searchDate.setDate(searchDate.getDate() + 1); continue; }
              const startH = parseInt(m[1]), startM = parseInt(m[2]);
              const endH = parseInt(m[3]), endM = parseInt(m[4]);
              const start = new Date(searchDate);
              start.setHours(startH, startM, 0, 0);
              if (start >= now2 && (!startDate || start >= startDate) && (!endDate || start <= endDate)) {
                const end = new Date(searchDate);
                end.setHours(endH, endM, 0, 0);
                occurrences.push({
                  id: course.id,
                  name: course.name || "Corso",
                  court_name: course.court_name || "",
                  start_time: start.toISOString(),
                  end_time: end.toISOString(),
                  isCourse: true,
                });
                break;
              }
            }
            searchDate.setDate(searchDate.getDate() + 1);
          }
        }
        setUpcomingCourses(occurrences);
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
      <h1 className="text-4xl font-bold text-secondary">Bentornato, {userName}</h1>

      <WeatherCard />

      <div className="w-full">
        <BookingsTimeline bookings={timelineBookings} loading={loading} showEntryModal={false} scrollToCurrentTime={true} />
      </div>

      {/* PROSSIMI IMPEGNI + CENTRO NOTIFICHE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(() => {
          const now = new Date();
          const upcomingItems: UpcomingBooking[] = [
            ...timelineBookings
              .filter((b) => new Date(b.start_time) >= now && b.status !== "cancelled")
              .map((b) => ({ ...b } as UpcomingBooking)),
            ...upcomingCourses.map((c) => ({
              id: c.id,
              court: c.court_name,
              user_id: "",
              coach_id: null,
              start_time: c.start_time,
              end_time: c.end_time,
              status: "confirmed",
              type: "corso",
              notes: c.name,
              isCourse: true as const,
            } as UpcomingBooking)),
          ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          return (
            <UpcomingCommitmentsCard
              bookings={upcomingItems}
              basePath="/dashboard/admin"
            />
          );
        })()}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between flex-shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Centro Notifiche</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <NotificationsList limit={0} showSearch={true} showTableHeader={true} showHeader={false} maxVisibleRows={5} />
          </div>
        </div>
      </div>

      {/* AZIONI RAPIDE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Azioni Rapide</h2>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Link href="/dashboard/admin/bookings/new" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <CalendarPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Crea Prenotazione</span>
            </Link>
            <Link href="/dashboard/admin/users/new" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Crea Utente</span>
            </Link>
            <Link href="/dashboard/admin/video-lessons/new" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Video className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Crea Video Lab</span>
            </Link>
            <Link href="/dashboard/admin/news/create" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Newspaper className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Crea News</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

