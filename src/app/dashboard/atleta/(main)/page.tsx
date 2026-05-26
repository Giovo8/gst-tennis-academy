"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  CalendarClock,
  CalendarPlus,
  Trophy,
  Video,
  Swords,
  GraduationCap,
} from "lucide-react";
import WeatherCard from "@/components/dashboard/WeatherCard";
import NotificationsList from "@/components/dashboard/NotificationsList";

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

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, court, type, notes, start_time, end_time, coach_id")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(20);

    const bookings = (bookingsData || []) as UpcomingBooking[];
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
      bookings.slice(0, 10).map((booking) => ({
        ...booking,
        coach_name: booking.coach_id
          ? coachNameById.get(booking.coach_id) || "Maestro"
          : undefined,
      }))
    );

    // Fetch enrolled courses and compute next lesson dates
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("user_id", user.id);

    if (enrollments?.length) {
      const ids = enrollments.map((e: { course_id: string }) => e.course_id);
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, name, schedule_days, schedule_time, start_date, end_date")
        .in("id", ids)
        .eq("is_active", true);

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
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-secondary">Dashboard</h1>

      <WeatherCard />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Prossimi Impegni</h2>
        </div>
        <div className="px-6 py-4">
          {(() => {
            const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
            const tomorrowD = new Date(todayD); tomorrowD.setDate(todayD.getDate() + 1);
            const dayAfterD = new Date(todayD); dayAfterD.setDate(todayD.getDate() + 2);
            const allItems = [
              ...upcomingBookings.map((b) => ({ kind: "booking" as const, date: new Date(b.start_time), booking: b })),
              ...upcomingLessons.map((l) => ({ kind: "lesson" as const, date: l.lessonDate, lesson: l })),
            ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);

            if (allItems.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-8 text-secondary/40">
                  <CalendarClock className="h-8 w-8 mb-2" />
                  <p className="text-sm font-medium">Nessun impegno in arrivo</p>
                </div>
              );
            }

            return (
              <ul className="flex flex-col gap-2">
                {allItems.map((item, idx) => {
                  let dayPill: { text: string; cls: string } | null = null;
                  if (item.date >= todayD && item.date < tomorrowD) {
                    dayPill = { text: "Oggi", cls: "bg-primary text-white" };
                  } else if (item.date >= tomorrowD && item.date < dayAfterD) {
                    dayPill = { text: "Domani", cls: "bg-secondary/10 text-secondary" };
                  }

                  if (item.kind === "booking") {
                    const booking = item.booking;
                    const isArena = booking.type === "arena" || booking.notes?.toLowerCase().includes("sfida arena");
                    const typeColors: Record<string, string> = {
                      lezione_privata: "#023047",
                      lezione_gruppo: "#023047",
                      campo: "var(--secondary)",
                      lezione: "#023047",
                    };
                    const typeBg = isArena ? "#023b52" : (typeColors[booking.type] || "var(--secondary)");
                    return (
                      <li key={`b-${booking.id}`}>
                        <Link
                          href={`/dashboard/atleta/bookings/${booking.id}`}
                          className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                          style={{ background: typeBg }}
                        >
                          <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                            <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                              {item.date.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                            </span>
                            <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                              {item.date.getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">
                              {booking.coach_name
                                ? `${formatBookingType(booking.type, isArena)} - ${booking.coach_name}`
                                : formatBookingType(booking.type, isArena)}
                            </p>
                            <p className="text-xs text-white/70 mt-0.5">
                              {formatBookingTimeRange(booking.start_time, booking.end_time)} · {booking.court}
                            </p>
                          </div>
                          {dayPill && (
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${dayPill.cls}`}>
                              {dayPill.text}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  }

                  const lesson = item.lesson;
                  return (
                    <li key={`l-${lesson.courseId}-${idx}`}>
                      <Link
                        href={`/dashboard/atleta/corsi/${lesson.courseId}`}
                        className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: "#023047" }}
                      >
                        <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                          <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                            {item.date.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                          </span>
                          <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                            {item.date.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{lesson.courseName}</p>
                          {lesson.scheduleTime && (
                            <p className="text-xs text-white/70 mt-0.5">{lesson.scheduleTime}</p>
                          )}
                        </div>
                        {dayPill && (
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${dayPill.cls}`}>
                            {dayPill.text}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Azioni Rapide</h2>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/dashboard/atleta/bookings/new" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <CalendarPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Nuova Prenotazione</span>
            </Link>
            <Link href="/dashboard/atleta/arena" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Swords className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Vai ad Arena</span>
            </Link>
            <Link href="/dashboard/atleta/videos" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Video className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Apri Video Lab</span>
            </Link>
            <Link href="/dashboard/atleta/tornei" className="group flex items-center gap-3 bg-secondary rounded-xl px-4 py-4 hover:opacity-90 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-white">Vai ai Tornei</span>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

function formatBookingType(type?: string, isArena?: boolean) {
  if (type === "lezione_privata") return "Lezione privata";
  if (type === "lezione_gruppo") return "Lezione gruppo";
  if (isArena || type === "arena") return "Sfida Arena";
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
