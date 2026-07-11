"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Course = {
  id: string;
  name: string;
  description: string | null;
  schedule_time: string | null;
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  instructor_name: string | null;
  price_per_month: number | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  metadata: { note?: string } | null;
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
  const cur = new Date(course.start_date);
  const end = new Date(course.end_date);
  const result: Date[] = [];
  while (cur <= end) {
    if (allowed.has(cur.getDay())) result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const methodLabel = (m: string | null) => {
  if (m === "cash") return "Contanti";
  if (m === "bank_transfer") return "Bonifico";
  return m ?? "—";
};

export default function AtletaCorsoDetailPage() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrollmentFee, setEnrollmentFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    void load();
  }, [courseId]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [{ data: courseData }, { data: attendanceData }, { data: paymentsData }, { data: enrollmentData }] =
      await Promise.all([
        supabase
          .from("courses")
          .select("id, name, description, schedule_time, schedule_days, start_date, end_date, instructor_name, price_per_month")
          .eq("id", courseId)
          .single(),
        supabase
          .from("lesson_attendance")
          .select("lesson_date, present")
          .eq("course_id", courseId)
          .eq("user_id", user.id),
        supabase
          .from("payments")
          .select("id, amount, payment_method, status, paid_at, created_at, metadata")
          .eq("user_id", user.id)
          .eq("reference_id", courseId)
          .eq("payment_type", "course")
          .order("created_at", { ascending: true }),
        supabase
          .from("course_enrollments")
          .select("fee")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .single(),
      ]);

    if (courseData) setCourse(courseData);
    if (attendanceData) {
      const map: Record<string, boolean> = {};
      attendanceData.forEach((r: { lesson_date: string; present: boolean }) => {
        map[r.lesson_date] = r.present;
      });
      setAttendance(map);
    }
    if (paymentsData) setPayments(paymentsData);
    if (enrollmentData?.fee != null) setEnrollmentFee(Number(enrollmentData.fee));
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
  const presentCount = lessonDates.filter((d) => attendance[d.toISOString().split("T")[0]] === true).length;
  const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(", ");
  const maestros = (course.instructor_name ?? "").split(", ").filter(Boolean);
  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDue = enrollmentFee != null ? enrollmentFee - totalPaid : null;

  return (
    <div className="space-y-6 pt-3">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/atleta/corsi" className="hover:text-secondary/80 transition-colors">
            I Miei Corsi
          </Link>
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

      {/* Informazioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="px-6 py-6 divide-y divide-gray-100">
          {course.description && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-4">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
              <p className="text-secondary font-semibold whitespace-pre-wrap">{course.description}</p>
            </div>
          )}
          {days && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-4">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni</label>
              <p className="text-secondary font-semibold">{days}</p>
            </div>
          )}
          {course.schedule_time && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-4">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <p className="text-secondary font-semibold">{course.schedule_time}</p>
            </div>
          )}
          {course.start_date && course.end_date && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-4">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Periodo</label>
              <p className="text-secondary font-semibold">
                {new Date(course.start_date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                {" – "}
                {new Date(course.end_date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          )}
          {lessonDates.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pt-4">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Presenze</label>
              <p className="text-secondary font-semibold">{presentCount} / {lessonDates.length}</p>
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
            {maestros.map((name, i) => {
              const initials = name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <li key={i}>
                  <div
                    className="flex items-center gap-4 py-3 px-3 rounded-lg"
                    style={{ background: "#023047" }}
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white leading-none">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{name}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Lezioni */}
      {lessonDates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Lezioni</h2>
          </div>
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
                    <div
                      className="flex items-center gap-4 py-3 px-3 rounded-lg"
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
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Contabilità */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Contabilità</h2>
        </div>

        {/* Riepilogo */}
        <div className="px-6 py-5 divide-y divide-gray-100 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Quota</label>
            <p className="text-secondary font-semibold">
              {enrollmentFee != null ? `€${enrollmentFee.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-4">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Importo pagato</label>
            <p className="text-secondary font-semibold">€{totalPaid.toFixed(2)}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pt-4">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Importo dovuto</label>
            <p className="text-secondary font-semibold">
              {totalDue != null ? `€${totalDue.toFixed(2)}` : "—"}
            </p>
          </div>
        </div>

        {/* Lista pagamenti */}
        {payments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-secondary/50">Nessun pagamento registrato</p>
          </div>
        ) : (
          <div className="px-6 py-4">
            <ul className="flex flex-col gap-2">
              {payments.map((p, i) => {
                const date = new Date(p.paid_at ?? p.created_at).toLocaleDateString("it-IT", {
                  day: "numeric", month: "long", year: "numeric",
                });
                return (
                  <li key={p.id}>
                    <div
                      className="flex items-center gap-4 py-3 px-3 rounded-lg"
                      style={{ background: "#023047" }}
                    >
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">€{Number(p.amount).toFixed(2)}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {date} · {methodLabel(p.payment_method)}
                          {p.metadata?.note ? ` · ${p.metadata.note}` : ""}
                        </p>
                      </div>
                    </div>
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
