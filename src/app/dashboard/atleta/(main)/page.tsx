"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  CalendarPlus,
  CalendarClock,
  Trophy,
  Video,
  Swords,
} from "lucide-react";
import WeatherCard from "@/components/dashboard/WeatherCard";
import AthleteNewsCarousel from "@/components/dashboard/AthleteNewsCarousel";
import LiveScoresSection from "@/components/landing/LiveScoresSection";

interface UpcomingBooking {
  id: string;
  court: string;
  type: string;
  notes: string | null;
  start_time: string;
  end_time: string;
  coach_id: string | null;
  coach_name?: string;
}

interface UpcomingCourseLesson {
  courseId: string;
  courseName: string;
  scheduleTime: string | null;
  lessonDate: Date;
}

const COURSE_DAY_INDEX: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6,
};

function computeCourseLessonDates(course: {
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
}): Date[] {
  if (!course.start_date || !course.end_date || !course.schedule_days?.length) return [];
  const allowed = new Set(course.schedule_days.map((d) => COURSE_DAY_INDEX[d] ?? -1));
  const cur = new Date(course.start_date);
  const end = new Date(course.end_date);
  const result: Date[] = [];
  while (cur <= end) {
    if (allowed.has(cur.getDay())) result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export default function AtletaDashboard() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingCourseLesson[]>([]);

  const dashboardCardClassName = "bg-white rounded-lg border border-black/10 overflow-hidden";
  const dashboardCardHeaderClassName = "px-6 py-4 border-b border-black/10 flex items-center gap-2 bg-gradient-to-r from-secondary/5 to-transparent";

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

    const now = new Date().toISOString();

    // Round 1: profilo, prenotazioni e iscrizioni ai corsi in parallelo
    const [{ data: profile }, { data: bookingsData }, { data: enrollments }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select("id, court, type, notes, start_time, end_time, coach_id")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(20),
      supabase.from("course_enrollments").select("course_id").eq("user_id", user.id),
    ]);

    if (profile) setUserName(profile.full_name || "Atleta");

    const bookings = (bookingsData || []) as UpcomingBooking[];
    const coachIds = Array.from(new Set(bookings.map((b) => b.coach_id).filter(Boolean))) as string[];
    const enrollmentIds = (enrollments ?? []).map((e: { course_id: string }) => e.course_id);

    // Round 2: coaches e corsi in parallelo (dipendono entrambi dal round 1)
    const [coachesData, coursesData] = await Promise.all([
      coachIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", coachIds).then((r) => r.data)
        : Promise.resolve(null),
      enrollmentIds.length > 0
        ? supabase
            .from("courses")
            .select("id, name, schedule_days, schedule_time, start_date, end_date")
            .in("id", enrollmentIds)
            .eq("is_active", true)
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

    const coachNameById = new Map<string, string>();
    for (const coach of coachesData || []) {
      coachNameById.set(coach.id, coach.full_name || "Maestro");
    }

    setUpcomingBookings(
      bookings.slice(0, 10).map((booking) => ({
        ...booking,
        coach_name: booking.coach_id
          ? coachNameById.get(booking.coach_id) || "Maestro"
          : undefined,
      }))
    );

    if (enrollmentIds.length > 0) {
      const lessons: UpcomingCourseLesson[] = [];
      const nowDate = new Date();
      nowDate.setHours(0, 0, 0, 0);

      for (const course of coursesData || []) {
        const dates = computeCourseLessonDates(course).filter((d) => d >= nowDate);
        if (dates.length > 0) {
          lessons.push({
            courseId: course.id,
            courseName: course.name,
            scheduleTime: course.schedule_time,
            lessonDate: dates[0],
          });
        }
      }
      setUpcomingLessons(lessons);
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
    <div className="space-y-6 pt-3">
      <h1 className="text-4xl font-bold text-secondary">Dashboard</h1>

      <WeatherCard />

      <Link href="/dashboard/atleta/bookings" className="block bg-secondary rounded-lg text-white overflow-hidden hover:opacity-90 transition-opacity">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
              <CalendarClock className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg">Prossimi Impegni</span>
          </div>
          <span className="text-2xl font-bold leading-none">{upcomingBookings.length + upcomingLessons.length}</span>
        </div>
      </Link>

      <div className={dashboardCardClassName}>
        <div className={dashboardCardHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">News</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <AthleteNewsCarousel />
          <Link
            href="/news"
            className="flex w-full items-center justify-center px-4 py-3 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Vedi tutte le news
          </Link>
        </div>
      </div>

      <div className={dashboardCardClassName}>
        <div className={dashboardCardHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Live</h2>
        </div>
        <div className="px-6 py-4">
          <LiveScoresSection embedded />
        </div>
      </div>

      {/* AZIONI RAPIDE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/dashboard/atleta/bookings/new" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <CalendarPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Nuova Prenotazione</span>
        </Link>
        <Link href="/dashboard/atleta/arena" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Swords className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Vai ad Arena</span>
        </Link>
        <Link href="/dashboard/atleta/videos" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Video className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Apri Video Lab</span>
        </Link>
        <Link href="/dashboard/atleta/tornei" className="group flex items-center gap-3 bg-secondary rounded-lg px-3 py-3.5 hover:opacity-90 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-white">Vai ai Tornei</span>
        </Link>
      </div>
    </div>
  );
}
