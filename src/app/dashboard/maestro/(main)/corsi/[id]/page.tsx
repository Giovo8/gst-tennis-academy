"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
  Users,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Athlete = {
  id: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  isGuest?: boolean;
};

type MaestroRow = {
  id?: string;
  full_name: string;
};

type Course = {
  id: string;
  name: string;
  description: string | null;
  max_participants: number;
  price_per_month: number;
  schedule_days: string[] | null;
  schedule_time: string | null;
  instructor_name: string | null;
  court_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  cancelled_dates: string[] | null;
  extra_dates: string[] | null;
  lesson_overrides: Record<string, string> | null;
  lesson_time_overrides: Record<string, string> | null;
  schedule_periods: { days: string[]; time: string | null; court: string | null; start_date?: string | null; end_date?: string | null }[] | null;
};

const DAYS: Record<string, string> = {
  lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì",
  ven: "Venerdì", sab: "Sabato", dom: "Domenica",
};

const DAY_INDEX: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6,
};

const DAY_CODE: Record<number, string> = { 0: "dom", 1: "lun", 2: "mar", 3: "mer", 4: "gio", 5: "ven", 6: "sab" };

function getPeriodForDate(course: Course, dateStr: string) {
  if (!course.schedule_periods?.length) return null;
  const dayCode = DAY_CODE[new Date(dateStr + "T12:00:00").getDay()];
  return course.schedule_periods.find((p) => p.days?.includes(dayCode)) ?? null;
}

function getCourtForDate(course: Course, dateStr: string): string | null {
  if (course.lesson_overrides?.[dateStr]) return course.lesson_overrides[dateStr];
  const period = getPeriodForDate(course, dateStr);
  if (period?.court) return period.court;
  return course.court_name;
}

function getTimeForDate(course: Course, dateStr: string): string | null {
  if (course.lesson_time_overrides?.[dateStr]) return course.lesson_time_overrides[dateStr];
  const period = getPeriodForDate(course, dateStr);
  if (period?.time) return period.time;
  return course.schedule_time;
}

function computeLessonDates(course: {
  start_date: string | null;
  end_date: string | null;
  schedule_days: string[] | null;
  cancelled_dates?: string[] | null;
  extra_dates?: string[] | null;
}): Date[] {
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
  for (const d of course.extra_dates ?? []) {
    result.push(new Date(d));
  }
  result.sort((a, b) => a.getTime() - b.getTime());
  return result;
}

export default function MaestroCorsoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [maestros, setMaestros] = useState<MaestroRow[]>([]);
  const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  async function loadCourse() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();

    if (error || !data) {
      router.push("/dashboard/maestro/corsi");
      return;
    }
    setCourse(data as Course);

    // Load maestros by name
    const maestroNames = (data.instructor_name ?? "").split(", ").filter(Boolean);
    if (maestroNames.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("full_name", maestroNames);
      const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.full_name, p.id]));
      setMaestros(maestroNames.map((name) => ({ id: profileMap.get(name), full_name: name })));
    }

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("user_id, guest_name")
      .eq("course_id", courseId);

    if (enrollments && enrollments.length > 0) {
      const allAthletes: Athlete[] = [];

      const userIds = enrollments
        .filter((e: { user_id: string | null }) => e.user_id != null)
        .map((e: { user_id: string }) => e.user_id);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        if (profiles) allAthletes.push(...(profiles as Athlete[]));
      }

      const guests: Athlete[] = enrollments
        .filter((e: { user_id: string | null; guest_name: string | null }) => e.user_id == null && e.guest_name)
        .map((e: { guest_name: string }) => ({
          id: `guest-${e.guest_name}`,
          full_name: e.guest_name,
          isGuest: true,
        }));
      allAthletes.push(...guests);

      setAthletes(allAthletes);
    }

    const { data: attendanceRecords } = await supabase
      .from("lesson_attendance")
      .select("lesson_date")
      .eq("course_id", courseId);
    if (attendanceRecords) {
      setAttendedDates(new Set(attendanceRecords.map((r: { lesson_date: string }) => r.lesson_date)));
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

  if (!course) return null;

  const lessonDates = computeLessonDates(course);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/maestro/corsi" className="hover:text-secondary/80 transition-colors">Corsi</Link>
          {" › "}
          <span>Dettagli Corso</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Corso</h1>
      </div>

      {/* Header card */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "var(--color-frozen-lake-900)", borderColor: "var(--color-frozen-lake-900)", borderLeftColor: "var(--color-frozen-lake-900)" }}
      >
        <div className="flex items-start gap-6">
          <GraduationCap className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{course.name}</h2>
          </div>
        </div>
      </div>

      {/* Dettagli */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli corso</h2>
        </div>
        <div className="px-6 py-6 space-y-5">
          {course.description && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Descrizione
              </label>
              <p className="text-secondary/70 leading-relaxed">{course.description}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Creato il
            </label>
            <p className="text-secondary/60">
              {new Date(course.created_at).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Periodi */}
      {(() => {
        const periodsToShow = course.schedule_periods && course.schedule_periods.length > 0
          ? course.schedule_periods
          : (course.schedule_days?.length || course.schedule_time || course.court_name)
            ? [{ days: course.schedule_days ?? [], time: course.schedule_time, court: course.court_name, start_date: course.start_date, end_date: course.end_date }]
            : [];
        if (periodsToShow.length === 0) return null;
        return periodsToShow.map((p, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">
                {periodsToShow.length > 1 ? `Periodo ${i + 1}` : "Periodo"}
              </h2>
            </div>
            <div className="px-6 py-6 space-y-5">
              {(p.start_date || p.end_date) && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
                    <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
                    <p className="text-secondary font-semibold">
                      {p.start_date ? new Date(p.start_date).toLocaleDateString("it-IT") : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
                    <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data fine</label>
                    <p className="text-secondary font-semibold">
                      {p.end_date ? new Date(p.end_date).toLocaleDateString("it-IT") : "—"}
                    </p>
                  </div>
                </>
              )}
              {(p.days ?? []).length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni</label>
                  <p className="text-secondary font-semibold">{(p.days ?? []).map((d) => DAYS[d] ?? d).join(", ")}</p>
                </div>
              )}
              {p.court && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
                  <p className="text-secondary font-semibold">{p.court}</p>
                </div>
              )}
              {p.time && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
                  <p className="text-secondary font-semibold">{p.time}</p>
                </div>
              )}
            </div>
          </div>
        ));
      })()}

      {/* Maestri */}
      {maestros.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestri</h2>
          </div>
          <ul className="flex flex-col gap-2 px-4 py-4">
            {maestros.map((m, i) => {
              const initials = m.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              const inner = (
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "#023047" }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white leading-none">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{m.full_name}</p>
                  </div>
                </div>
              );
              return (
                <li key={m.id ?? i}>
                  {inner}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Partecipanti */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        {athletes.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Users className="h-10 w-10 text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-secondary/50">Nessun partecipante iscritto</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 px-4 py-4">
            {athletes.map((a, idx) => {
              const initials = a.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              const inner = (
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "#05384c" }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white leading-none">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{a.full_name}</p>
                    {a.isGuest ? (
                      <p className="text-xs text-white/40 mt-0.5">Ospite</p>
                    ) : (a.email || a.phone) && (
                      <p className="text-xs text-white/60 truncate mt-0.5">
                        {[a.email, a.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={a.id ?? `guest-${idx}`}>
                  {!a.isGuest
                    ? <Link href={`/dashboard/maestro/corsi/${courseId}/partecipanti/${a.id}`}>{inner}</Link>
                    : <Link href={`/dashboard/maestro/corsi/${courseId}/partecipanti/ospite/${encodeURIComponent(a.full_name)}`}>{inner}</Link>
                  }
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Lezioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Lezioni</h2>
        </div>
        {lessonDates.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Calendar className="h-10 w-10 text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-secondary/50">Nessuna lezione calcolabile</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 px-4 py-4">
            {lessonDates.map((date, i) => {
              const label = date.toLocaleDateString("it-IT", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              }).replace(/^./, (c) => c.toUpperCase());
              const dateStr = date.toISOString().split("T")[0];
              const attended = attendedDates.has(dateStr);
              return (
                <li key={i}>
                  <Link href={`/dashboard/maestro/corsi/${courseId}/lezioni/${dateStr}`}>
                    <div
                      className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ background: attended ? "#023047" : "var(--secondary)" }}
                    >
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                        {attended ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : (
                          <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{label}</p>
                        {(getCourtForDate(course, dateStr) || getTimeForDate(course, dateStr)) && (
                          <p className="text-xs text-white/70 mt-0.5">
                            {[getCourtForDate(course, dateStr), getTimeForDate(course, dateStr)].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
