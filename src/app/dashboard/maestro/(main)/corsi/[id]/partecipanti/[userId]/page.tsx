"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Course = {
  name: string;
  schedule_time: string | null;
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  cancelled_dates: string[] | null;
};

type Athlete = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

const DAY_INDEX: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6,
};

const DAYS: Record<string, string> = {
  lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì",
  ven: "Venerdì", sab: "Sabato", dom: "Domenica",
};

function computeLessonDates(course: Course): Date[] {
  if (!course.start_date || !course.end_date || !course.schedule_days?.length) return [];
  const allowed = new Set(course.schedule_days.map((d) => DAY_INDEX[d] ?? -1));
  const cancelled = new Set(course.cancelled_dates ?? []);
  const start = new Date(course.start_date);
  const end = new Date(course.end_date);
  const result: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = cur.toISOString().split("T")[0];
    if (allowed.has(cur.getDay()) && !cancelled.has(dateStr)) result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export default function MaestroPartecipantePresenzePage() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;

  const [course, setCourse] = useState<Course | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId || !userId) return;
    void load();
  }, [courseId, userId]);

  async function load() {
    setLoading(true);

    const [{ data: courseData }, { data: profileData }, { data: attendanceData }] = await Promise.all([
      supabase
        .from("courses")
        .select("name, schedule_time, schedule_days, start_date, end_date, cancelled_dates")
        .eq("id", courseId)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", userId)
        .single(),
      supabase
        .from("lesson_attendance")
        .select("lesson_date, present")
        .eq("course_id", courseId)
        .eq("user_id", userId),
    ]);

    if (courseData) setCourse(courseData);
    if (profileData) setAthlete(profileData);
    if (attendanceData) {
      const map: Record<string, boolean> = {};
      attendanceData.forEach((r: { lesson_date: string; present: boolean }) => {
        map[r.lesson_date] = r.present;
      });
      setAttendance(map);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!course || !athlete) return null;

  const lessonDates = computeLessonDates(course);
  const presentCount = lessonDates.filter((d) => attendance[d.toISOString().split("T")[0]] === true).length;
  const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(", ");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/maestro/corsi" className="hover:text-secondary/80 transition-colors">Corsi</Link>
          {" › "}
          <Link href={`/dashboard/maestro/corsi/${courseId}`} className="hover:text-secondary/80 transition-colors">Dettagli Corso</Link>
          {" › "}
          <span>Dettagli Partecipante</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Partecipante</h1>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "#075985", borderColor: "#075985", borderLeftColor: "#075985" }}
      >
        <div className="flex items-start gap-6">
          <User className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{athlete.full_name}</h2>
          </div>
        </div>
      </div>

      {/* Informazioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Corso</label>
            <p className="text-secondary font-semibold">{course.name}</p>
          </div>
          {athlete.email && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Email</label>
              <p className="text-secondary font-semibold">{athlete.email}</p>
            </div>
          )}
          {athlete.phone && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
              <p className="text-secondary font-semibold">{athlete.phone}</p>
            </div>
          )}
          {days && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni corso</label>
              <p className="text-secondary font-semibold">{days}</p>
            </div>
          )}
          {course.schedule_time && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <p className="text-secondary font-semibold">{course.schedule_time}</p>
            </div>
          )}
          {lessonDates.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Presenze</label>
              <p className="text-secondary font-semibold">{presentCount} / {lessonDates.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lezioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Lezioni</h2>
        </div>
        {lessonDates.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-secondary/50">Nessuna lezione calcolabile</p>
          </div>
        ) : (
          <div className="px-6 py-4">
            <ul className="flex flex-col gap-2">
              {lessonDates.map((d, i) => {
                const dateStr = d.toISOString().split("T")[0];
                const label = d.toLocaleDateString("it-IT", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                }).replace(/^./, (c) => c.toUpperCase());
                const hasRecord = attendance[dateStr] !== undefined;
                const isPresent = attendance[dateStr] === true;
                const bg = hasRecord
                  ? isPresent ? "#023047" : "var(--color-frozen-lake-900)"
                  : "var(--secondary)";
                return (
                  <li key={i}>
                    <Link href={`/dashboard/maestro/corsi/${courseId}/lezioni/${dateStr}`}>
                      <div
                        className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: bg }}
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{label}</p>
                        </div>
                        {hasRecord && (
                          <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                            {isPresent ? "PRESENTE" : "ASSENTE"}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
