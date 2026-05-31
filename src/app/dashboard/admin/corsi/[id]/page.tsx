"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import { toast } from 'sonner';

type Athlete = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

type GuestAthlete = {
  id: null;
  full_name: string;
  email?: null;
  phone?: null;
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
  created_by: string | null;
};

const TIME_SLOTS: string[] = Array.from({ length: 31 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

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

export default function CorsoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [athletes, setAthletes] = useState<(Athlete | GuestAthlete)[]>([]);
  const [maestros, setMaestros] = useState<MaestroRow[]>([]);
  const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set());
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null);
  const [openMenuLesson, setOpenMenuLesson] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  function closeActionMenu() {
    setOpenMenuLesson(null);
    setMenuPosition(null);
  }

  function openActionMenu(dateStr: string, buttonRect: DOMRect) {
    const menuWidth = 176;
    const menuHeight = 88;
    const pad = 8;
    let left = buttonRect.right - menuWidth;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));
    let top = buttonRect.bottom + 6;
    if (top + menuHeight > window.innerHeight - pad) top = Math.max(pad, buttonRect.top - menuHeight - 6);
    setOpenMenuLesson(dateStr);
    setMenuPosition({ top, left });
  }
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editingNewDate, setEditingNewDate] = useState("");
  const [editingNewDateText, setEditingNewDateText] = useState("");
  const [editingNewCourt, setEditingNewCourt] = useState("");
  const [editingStartTime, setEditingStartTime] = useState("");
  const [editingEndTime, setEditingEndTime] = useState("");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const WEEK_DAYS_CAL = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return { date, isCurrentMonth: date.getMonth() === calendarViewDate.getMonth() };
    });
  }, [calendarViewDate]);

  function normalizeDate(date: Date): Date {
    const d = new Date(date); d.setHours(12, 0, 0, 0); return d;
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function getCalendarMonthLabel(date: Date): string {
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function openCalendar() {
    const base = editingNewDate ? normalizeDate(new Date(editingNewDate + "T12:00:00")) : normalizeDate(new Date());
    setPendingDate(base);
    setCalendarViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    setCalPickerOpen(true);
  }

  function applyCalendarDate() {
    const iso = pendingDate.toISOString().split("T")[0];
    setEditingNewDate(iso);
    setEditingNewDateText(isoToDisplay(iso));
    setCalPickerOpen(false);
  }

  function parseTimeRange(timeStr: string | null): { start: string; end: string } {
    if (!timeStr) return { start: "", end: "" };
    const match = timeStr.match(/(\d{1,2}:\d{2})\s*[\u2013\-]\s*(\d{1,2}:\d{2})/);
    if (!match) return { start: timeStr.trim(), end: "" };
    return { start: match[1], end: match[2] };
  }

  function isoToDisplay(iso: string): string {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function displayToIso(text: string): string {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function handleEditingDateTextChange(value: string) {
    setEditingNewDateText(value);
    const iso = displayToIso(value);
    if (iso) setEditingNewDate(iso);
    else if (value === "") setEditingNewDate("");
  }
  const [savingEdit, setSavingEdit] = useState(false);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  useEffect(() => {
    getCourts().then(setCourts);
  }, []);

  async function loadCourse() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();

    if (error || !data) {
      router.push("/dashboard/admin/corsi");
      return;
    }
    setCourse(data as Course);

    // Load creator name
    if (data.created_by) {
      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.created_by)
        .maybeSingle();
      if (creator) setCreatorName(creator.full_name);
    }

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
      const registeredIds = enrollments
        .filter((e: { user_id: string | null }) => e.user_id)
        .map((e: { user_id: string }) => e.user_id);
      const guestEnrollments = enrollments.filter(
        (e: { user_id: string | null; guest_name: string | null }) => !e.user_id && e.guest_name
      );

      const allParticipants: (Athlete | GuestAthlete)[] = [];

      if (registeredIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", registeredIds);
        if (profiles) allParticipants.push(...(profiles as Athlete[]));
      }

      for (const g of guestEnrollments) {
        allParticipants.push({ id: null, full_name: g.guest_name! });
      }

      setAthletes(allParticipants);
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

  async function handleDeleteLesson(dateStr: string) {
    if (!course) return;
    const updated = [...(course.cancelled_dates ?? []), dateStr];
    setDeletingLesson(dateStr);
    const { error } = await supabase
      .from("courses")
      .update({ cancelled_dates: updated })
      .eq("id", course.id);
    if (!error) setCourse({ ...course, cancelled_dates: updated });
    setDeletingLesson(null);
  }

  async function handleRescheduleLesson(fromDateStr: string, toDateStr: string) {
    if (!course || !toDateStr) return;
    setSlotError(null);
    setSavingEdit(true);

    // Conflict check
    const targetCourt = editingNewCourt || course.court_name;
    const rawTime = (editingStartTime && editingEndTime)
      ? `${editingStartTime} – ${editingEndTime}`
      : (course.lesson_time_overrides?.[toDateStr] ?? course.schedule_time ?? "");
    const rangeMatch = rawTime.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
    if (targetCourt && rangeMatch) {
      const startIso = `${toDateStr}T${rangeMatch[1].padStart(2,"0")}:${rangeMatch[2]}:00`;
      const endIso   = `${toDateStr}T${rangeMatch[3].padStart(2,"0")}:${rangeMatch[4]}:00`;
      const { data: conflicts } = await supabase
        .from("bookings")
        .select("id")
        .eq("court", targetCourt)
        .neq("status", "cancelled")
        .neq("status", "rejected")
        .or(`and(start_time.lt.${endIso},end_time.gt.${startIso})`);
      if (conflicts && conflicts.length > 0) {
        setSlotError(`Il campo ${targetCourt} è già occupato in questo orario.`);
        setSavingEdit(false);
        return;
      }
    }
    const dateChanged = toDateStr !== fromDateStr;
    const overrides: Record<string, string> = { ...(course.lesson_overrides ?? {}) };
    const timeOverrides: Record<string, string> = { ...(course.lesson_time_overrides ?? {}) };
    let newCancelled = course.cancelled_dates ?? [];
    let newExtra = course.extra_dates ?? [];
    if (dateChanged) {
      newCancelled = [...newCancelled, fromDateStr];
      newExtra = [...newExtra.filter((d) => d !== toDateStr), toDateStr];
      delete overrides[fromDateStr];
      delete timeOverrides[fromDateStr];
    }
    const targetDate = dateChanged ? toDateStr : fromDateStr;
    if (editingNewCourt) overrides[targetDate] = editingNewCourt;
    const newTimeStr = editingStartTime && editingEndTime ? `${editingStartTime} – ${editingEndTime}` : editingStartTime || "";
    if (newTimeStr) timeOverrides[targetDate] = newTimeStr;
    const { error } = await supabase
      .from("courses")
      .update({ cancelled_dates: newCancelled, extra_dates: newExtra, lesson_overrides: overrides, lesson_time_overrides: timeOverrides })
      .eq("id", course.id);
    if (error) {
      console.error("handleRescheduleLesson error:", error);
      setSlotError("Errore nel salvataggio: " + error.message);
    } else {
      setCourse({ ...course, cancelled_dates: newCancelled, extra_dates: newExtra, lesson_overrides: overrides, lesson_time_overrides: timeOverrides });
      setEditingLesson(null);
      setEditingNewDate("");
      setEditingNewDateText("");
      setEditingNewCourt("");
      setEditingStartTime("");
      setEditingEndTime("");
      setSlotError(null);
    }
    setSavingEdit(false);
  }

  async function handleDelete() {
    if (!course) return;
    if (!confirm(`Sei sicuro di voler eliminare il corso "${course.name}"?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      toast.error("Errore: " + error.message);
      setDeleting(false);
    } else {
      router.push("/dashboard/admin/corsi");
    }
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
          <Link href="/dashboard/admin/corsi" className="hover:text-secondary/80 transition-colors">Corsi</Link>
          {" › "}
          <span>Dettagli Corso</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Corso</h1>
      </div>

      {/* Header card */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "#075985", borderColor: "#075985", borderLeftColor: "#075985" }}
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

          {course.price_per_month > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Quota
              </label>
              <p className="text-secondary font-semibold">
                {course.price_per_month.toFixed(2)} € / mese
              </p>
            </div>
          )}

          {creatorName && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-5 border-b border-gray-100">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Creato da
              </label>
              <p className="text-secondary font-semibold">{creatorName}</p>
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
                  {m.id ? <Link href={`/dashboard/admin/users/${m.id}`}>{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Partecipanti */}
      {athletes.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        {
          <ul className="flex flex-col gap-2 px-4 py-4">
            {athletes.map((a, idx) => {
              const initials = a.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              const inner = (
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "#075985" }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white leading-none">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{a.full_name}</p>
                    {a.id && (a.email || a.phone) && (
                      <p className="text-xs text-white/60 truncate mt-0.5">
                        {[a.email, a.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {!a.id && (
                      <p className="text-xs text-white/50 mt-0.5">Ospite</p>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={a.id ?? `guest-${idx}`}>
                  {a.id
                    ? <Link href={`/dashboard/admin/corsi/${courseId}/partecipanti/${a.id}`}>{inner}</Link>
                    : <Link href={`/dashboard/admin/corsi/${courseId}/partecipanti/ospite/${encodeURIComponent(a.full_name)}`}>{inner}</Link>
                  }
                </li>
              );
            })}
          </ul>
        }
      </div>
      )}

      {/* Lezioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Lezioni</h2>
        </div>
        {lessonDates.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Calendar className="h-10 w-10 text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-secondary/50">Nessuna lezione calcolabile — inserisci date di inizio/fine e giorni</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 px-4 py-4">
            {lessonDates.map((date, i) => {
              const label = date.toLocaleDateString("it-IT", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              }).replace(/^./, (c) => c.toUpperCase());
              const dateStr = date.toISOString().split("T")[0];
              return (
                <li key={i} className="relative">
                  {athletes.length > 0 ? (
                  <Link href={`/dashboard/admin/corsi/${courseId}/lezioni/${dateStr}`}>
                    <div
                      className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ background: attendedDates.has(dateStr) ? "#023047" : "var(--secondary)" }}
                    >
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                        {attendedDates.has(dateStr)
                          ? <CheckCircle2 className="w-5 h-5 text-white" />
                          : <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{label}</p>
                        {(getCourtForDate(course, dateStr) || getTimeForDate(course, dateStr)) && (
                          <p className="text-xs text-white/70 mt-0.5">
                            {[getCourtForDate(course, dateStr), getTimeForDate(course, dateStr)].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (openMenuLesson === dateStr) { closeActionMenu(); return; } openActionMenu(dateStr, e.currentTarget.getBoundingClientRect()); }}
                        className="flex-shrink-0 p-2.5 -mr-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        aria-label="Opzioni lezione"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </Link>
                  ) : (
                    <div
                      className="flex items-center gap-4 py-3 px-3 rounded-lg cursor-default"
                      style={{ background: attendedDates.has(dateStr) ? "#023047" : "var(--secondary)" }}
                    >
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-white leading-none">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{label}</p>
                        {(getCourtForDate(course, dateStr) || getTimeForDate(course, dateStr)) && (
                          <p className="text-xs text-white/70 mt-0.5">
                            {[getCourtForDate(course, dateStr), getTimeForDate(course, dateStr)].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (openMenuLesson === dateStr) { closeActionMenu(); return; } openActionMenu(dateStr, e.currentTarget.getBoundingClientRect()); }}
                        className="flex-shrink-0 p-2.5 -mr-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        aria-label="Opzioni lezione"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {openMenuLesson === dateStr && menuPosition && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                      <div
                        className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                        style={{ top: menuPosition.top, left: menuPosition.left }}
                      >
                        <button
                          type="button"
                          onClick={() => { closeActionMenu(); setEditingLesson(dateStr); setEditingNewDate(dateStr); setEditingNewDateText(isoToDisplay(dateStr)); setEditingNewCourt(getCourtForDate(course, dateStr) ?? ""); const _t = parseTimeRange(getTimeForDate(course, dateStr) ?? ""); setEditingStartTime(_t.start); setEditingEndTime(_t.end); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => { closeActionMenu(); handleDeleteLesson(dateStr); }}
                          disabled={deletingLesson === dateStr}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors w-full disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingLesson === dateStr ? "Eliminando..." : "Elimina"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Azioni */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/dashboard/admin/corsi/new?id=${course.id}`}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium"
        >
          Modifica
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50"
        >
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
          Elimina
        </button>
      </div>

      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ background: "#075985" }}>
              <h3 className="text-lg font-semibold text-white">Modifica lezione</h3>
              <button
                type="button"
                onClick={() => { setEditingLesson(null); setEditingNewDate(""); setEditingNewDateText(""); setEditingNewCourt(""); setEditingStartTime(""); setEditingEndTime(""); setSlotError(null); }}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-secondary flex-shrink-0">Data</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={openCalendar}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="GG/MM/AAAA"
                    value={editingNewDateText}
                    onChange={(e) => handleEditingDateTextChange(e.target.value)}
                    maxLength={10}
                    className="w-44 rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">Ora inizio</span>
                <select
                  value={editingStartTime}
                  onChange={(e) => { setEditingStartTime(e.target.value); setSlotError(null); }}
                  className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  <option value="">—</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">Ora fine</span>
                <select
                  value={editingEndTime}
                  onChange={(e) => { setEditingEndTime(e.target.value); setSlotError(null); }}
                  className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  <option value="">—</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">Campo</span>
                <select
                  value={editingNewCourt}
                  onChange={(e) => { setEditingNewCourt(e.target.value); setSlotError(null); }}
                  className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  <option value="">—</option>
                  {courts.map((court) => (
                    <option key={court} value={court}>{court}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 pb-6 space-y-3">
              {slotError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {slotError}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRescheduleLesson(editingLesson, editingNewDate)}
                disabled={savingEdit || !editingNewDate || (editingNewDate === editingLesson && !editingNewCourt)}
                className="w-full py-3 rounded-xl bg-secondary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingEdit
                  ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Salvataggio...</span></>
                  : "Conferma"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar picker */}
      <Modal open={calPickerOpen} onOpenChange={setCalPickerOpen}>
        <ModalContent size="sm" showBuiltinClose={false} className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200">
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="font-semibold text-white">Seleziona data</ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setCalendarViewDate((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                <p className="text-sm font-semibold text-gray-900 capitalize">{getCalendarMonthLabel(calendarViewDate)}</p>
                <button type="button" onClick={() => setCalendarViewDate((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {WEEK_DAYS_CAL.map((d) => <span key={d} className="py-1">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, pendingDate);
                  const isToday = isSameCalendarDay(date, new Date());
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => setPendingDate(normalizeDate(date))}
                      className={`h-9 rounded-md text-sm transition-colors ${
                        isSelected ? "bg-secondary text-white font-semibold" :
                        isCurrentMonth ? "text-gray-800 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && isToday ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button type="button" onClick={() => { const t = normalizeDate(new Date()); setPendingDate(t); setCalendarViewDate(new Date(t.getFullYear(), t.getMonth(), 1)); }} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Oggi</button>
            <button type="button" onClick={applyCalendarDate} className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity">Applica</button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
