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
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
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
};

const DAYS: Record<string, string> = {
  lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì",
  ven: "Venerdì", sab: "Sabato", dom: "Domenica",
};

const DAY_INDEX: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6,
};

function computeLessonDates(course: {
  start_date: string | null;
  end_date: string | null;
  schedule_days: string[] | null;
}): Date[] {
  if (!course.start_date || !course.end_date || !course.schedule_days?.length) return [];
  const allowed = new Set(course.schedule_days.map((d) => DAY_INDEX[d] ?? -1));
  const start = new Date(course.start_date);
  const end = new Date(course.end_date);
  const result: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (allowed.has(cur.getDay())) result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
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
      .select("user_id")
      .eq("course_id", courseId);

    if (enrollments && enrollments.length > 0) {
      const userIds = enrollments.map((e: { user_id: string }) => e.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);
      if (profiles) setAthletes(profiles as Athlete[]);
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

  const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(", ");
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
        style={{ backgroundColor: "#05384c", borderColor: "#05384c", borderLeftColor: "#023047" }}
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
          {course.court_name && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <p className="text-secondary font-semibold">{course.court_name}</p>
            </div>
          )}
          {days && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni</label>
              <p className="text-secondary font-semibold">{days}</p>
            </div>
          )}
          {course.schedule_time && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <p className="text-secondary font-semibold">{course.schedule_time}</p>
            </div>
          )}
          {(course.start_date || course.end_date) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Periodo</label>
              <p className="text-secondary font-semibold">
                <span className="text-secondary/50 font-normal text-sm mr-2">Dal</span>
                {course.start_date ? new Date(course.start_date).toLocaleDateString("it-IT") : "—"}
                <span className="text-secondary/50 font-normal text-sm mx-3">Al</span>
                {course.end_date ? new Date(course.end_date).toLocaleDateString("it-IT") : "—"}
              </p>
            </div>
          )}
          {course.description && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
              <p className="text-secondary/70 leading-relaxed">{course.description}</p>
            </div>
          )}
        </div>
      </div>

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
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
            Partecipanti {athletes.length > 0 && <span className="text-secondary/50 font-normal">({athletes.length})</span>}
          </h2>
        </div>
        {athletes.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Users className="h-10 w-10 text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-secondary/50">Nessun partecipante iscritto</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 px-4 py-4">
            {athletes.map((a) => (
              <li key={a.id}>
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg"
                  style={{ background: "#05384c" }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white leading-none">
                      {a.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{a.full_name}</p>
                    {(a.email || a.phone) && (
                      <p className="text-xs text-white/60 truncate mt-0.5">
                        {[a.email, a.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
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
                        {course.schedule_time && (
                          <p className="text-xs text-white/70 mt-0.5">{course.schedule_time}</p>
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
