"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isBookableCoachProfile } from "@/lib/roles";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

interface Athlete {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "atleta" | "admin" | "gestore" | "maestro";
}

type SelectedAthlete = {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
};

type SchedulePeriod = { days: string[]; slots: string[]; court: string; start_date: string; end_date: string };

function slotsToTimeStr(slots: string[]): string | null {
  if (slots.length === 0) return null;
  const sorted = [...slots].sort();
  const first = sorted[0];
  const [lh, lm] = sorted[sorted.length - 1].split(":").map(Number);
  let endH = lh, endM = lm + 30;
  if (endM >= 60) { endH++; endM -= 60; }
  return `${first} \u2013 ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function parseTimeToSlots(timeStr: string): string[] {
  const match = timeStr.match(/(\d{1,2}:\d{2})\s*[\u2013-]\s*(\d{1,2}:\d{2})/);
  if (!match) return [];
  const [, start, end] = match;
  const slots: string[] = [];
  let [h, m] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  while (h * 60 + m < eh * 60 + em) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

const DAYS = [
  { value: "lun", label: "Lun" },
  { value: "mar", label: "Mar" },
  { value: "mer", label: "Mer" },
  { value: "gio", label: "Gio" },
  { value: "ven", label: "Ven" },
  { value: "sab", label: "Sab" },
  { value: "dom", label: "Dom" },
];

export default function NuovoCorsoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("id");
  const isEditMode = !!courseId;

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerMonth, setPricePerMonth] = useState(0);
  const [periods, setPeriods] = useState<SchedulePeriod[]>([{ days: [], slots: [], court: "", start_date: "", end_date: "" }]);
  const [periodStartTexts, setPeriodStartTexts] = useState<string[]>([""]);
  const [periodEndTexts, setPeriodEndTexts] = useState<string[]>([""]);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [selectedMaestros, setSelectedMaestros] = useState<{ id: string; full_name: string }[]>([]);
  const [maestros, setMaestros] = useState<Athlete[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<SelectedAthlete[]>([]);
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [activeDateContext, setActiveDateContext] = useState<{ pidx: number; field: "start" | "end" } | null>(null);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    async function loadMaestros() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, metadata")
        .in("role", ["maestro", "gestore"])
        .order("full_name");
      if (data) {
        setMaestros(
          data
            .filter((p) => isBookableCoachProfile(p))
            .map(({ id, full_name, email }) => ({ id, full_name, email: email || "", role: "maestro" as const }))
        );
      }
    }
    loadMaestros();
  }, []);

  useEffect(() => {
    getCourts().then(setCourts);
  }, []);

  useEffect(() => {
    async function loadAthletes() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role")
        .eq("role", "atleta")
        .order("full_name");
      if (data) setAthletes(data as Athlete[]);
    }
    loadAthletes();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    async function loadCourse() {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error || !data) {
        setError("Corso non trovato.");
        setLoading(false);
        return;
      }

      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setPricePerMonth(data.price_per_month ?? 0);
      if (data.schedule_periods && data.schedule_periods.length > 0) {
        const loaded = data.schedule_periods.map((p: { days: string[]; time: string | null; court?: string; start_date?: string; end_date?: string }) => ({
          days: p.days ?? [],
          slots: p.time ? parseTimeToSlots(p.time) : [],
          court: p.court ?? "",
          start_date: p.start_date ?? data.start_date ?? "",
          end_date: p.end_date ?? data.end_date ?? "",
        }));
        setPeriods(loaded);
        setPeriodStartTexts(loaded.map((p: SchedulePeriod) => isoToDisplay(p.start_date)));
        setPeriodEndTexts(loaded.map((p: SchedulePeriod) => isoToDisplay(p.end_date)));
      } else {
        const single: SchedulePeriod = {
          days: data.schedule_days ?? [],
          slots: parseTimeToSlots(data.schedule_time ?? ""),
          court: data.court_name ?? "",
          start_date: data.start_date ?? "",
          end_date: data.end_date ?? "",
        };
        setPeriods([single]);
        setPeriodStartTexts([isoToDisplay(single.start_date)]);
        setPeriodEndTexts([isoToDisplay(single.end_date)]);
      }
      const maestroNames = (data.instructor_name ?? "").split(", ").filter(Boolean);
      setSelectedMaestros(maestroNames.map((n) => ({ id: n, full_name: n })));
      // Load existing enrollments
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("user_id, guest_name")
        .eq("course_id", courseId);
      if (enrollments && enrollments.length > 0) {
        const registeredIds = enrollments.filter((e: { user_id: string | null }) => e.user_id).map((e: { user_id: string }) => e.user_id);
        const guestEnrollments = enrollments.filter((e: { user_id: string | null; guest_name: string | null }) => !e.user_id && e.guest_name);
        const athletes: typeof selectedAthletes = [];
        if (registeredIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", registeredIds);
          if (profiles) {
            athletes.push(
              ...profiles.map((p: { id: string; full_name: string; email: string; phone?: string | null }) => ({
                userId: p.id,
                fullName: p.full_name,
                email: p.email,
                phone: p.phone ?? undefined,
                isRegistered: true,
              }))
            );
          }
        }
        for (const g of guestEnrollments) {
          athletes.push({ fullName: g.guest_name!, isRegistered: false });
        }
        setSelectedAthletes(athletes);
      }
      setLoading(false);
    }
    loadCourse();
  }, [courseId, isEditMode]);

  const WEEK_DAYS_CAL = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return { date, isCurrentMonth: date.getMonth() === calendarViewDate.getMonth() };
    });
  }, [calendarViewDate]);

  function normalizeDate(date: Date): Date {
    const d = new Date(date); d.setHours(12, 0, 0, 0); return d;
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

  function handlePeriodDateText(pidx: number, field: "start" | "end", value: string) {
    if (field === "start") {
      setPeriodStartTexts((prev) => prev.map((t, i) => i === pidx ? value : t));
    } else {
      setPeriodEndTexts((prev) => prev.map((t, i) => i === pidx ? value : t));
    }
    const iso = displayToIso(value);
    const key = field === "start" ? "start_date" : "end_date";
    if (iso) {
      setPeriods((prev) => prev.map((p, i) => i !== pidx ? p : { ...p, [key]: iso }));
    } else if (value === "") {
      setPeriods((prev) => prev.map((p, i) => i !== pidx ? p : { ...p, [key]: "" }));
    }
  }

  function openDatePicker(pidx: number, field: "start" | "end") {
    const existing = field === "start" ? periods[pidx]?.start_date : periods[pidx]?.end_date;
    const base = existing ? normalizeDate(new Date(existing)) : normalizeDate(new Date());
    setActiveDateContext({ pidx, field });
    setPendingDate(base);
    setCalendarViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    setPendingDate(normalizeDate(day));
  }

  function applyDateSelection() {
    if (!activeDateContext) return;
    const iso = pendingDate.toISOString().split("T")[0];
    const display = isoToDisplay(iso);
    const { pidx, field } = activeDateContext;
    const key = field === "start" ? "start_date" : "end_date";
    setPeriods((prev) => prev.map((p, i) => i !== pidx ? p : { ...p, [key]: iso }));
    if (field === "start") {
      setPeriodStartTexts((prev) => prev.map((t, i) => i === pidx ? display : t));
    } else {
      setPeriodEndTexts((prev) => prev.map((t, i) => i === pidx ? display : t));
    }
    setDatePickerModalOpen(false);
  }

  function handleDatePickerToday() {
    const today = normalizeDate(new Date());
    setPendingDate(today);
    setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function getCalendarMonthLabel(date: Date): string {
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function toggleSlot(pidx: number, time: string) {
    setPeriods((prev) => prev.map((p, pIdx) => {
      if (pIdx !== pidx) return p;
      const slots = p.slots;
      if (slots.includes(time)) return { ...p, slots: slots.filter((t) => t !== time) };
      if (slots.length === 0) return { ...p, slots: [time] };
      const allSlots = [...slots, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      for (let i = 1; i < allSlots.length; i++) {
        const [hP, mP] = allSlots[i - 1].split(":").map(Number);
        const [hC, mC] = allSlots[i].split(":").map(Number);
        if ((hC * 60 + mC) - (hP * 60 + mP) !== 30) return { ...p, slots: [time] };
      }
      return { ...p, slots: allSlots };
    }));
  }

  function handleTimelineMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    isDragging.current = true;
    timelineScrollRef.current = e.currentTarget;
    startX.current = e.pageX - e.currentTarget.offsetLeft;
    scrollLeft.current = e.currentTarget.scrollLeft;
    e.currentTarget.style.cursor = "grabbing";
    e.currentTarget.style.userSelect = "none";
  }
  function handleTimelineMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging.current || !timelineScrollRef.current) return;
    const x = e.pageX - timelineScrollRef.current.offsetLeft;
    timelineScrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }
  function handleTimelineMouseUp() {
    isDragging.current = false;
    if (timelineScrollRef.current) {
      timelineScrollRef.current.style.cursor = "grab";
      timelineScrollRef.current.style.userSelect = "auto";
    }
  }

  function toggleDay(pidx: number, day: string) {
    setPeriods((prev) => prev.map((p, pIdx) => {
      if (pIdx !== pidx) return p;
      const days = p.days.includes(day) ? p.days.filter((d) => d !== day) : [...p.days, day];
      return { ...p, days };
    }));
  }

  function addPeriod() {
    setPeriods((prev) => [...prev, { days: [], slots: [], court: "", start_date: "", end_date: "" }]);
    setPeriodStartTexts((prev) => [...prev, ""]);
    setPeriodEndTexts((prev) => [...prev, ""]);
  }

  function removePeriod(idx: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== idx));
    setPeriodStartTexts((prev) => prev.filter((_, i) => i !== idx));
    setPeriodEndTexts((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Il nome del corso è obbligatorio.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const allDays = [...new Set(periods.flatMap((p) => p.days))];
      const periodsData = periods.map((p) => ({
        days: p.days,
        time: slotsToTimeStr(p.slots),
        court: p.court || null,
        start_date: p.start_date || null,
        end_date: p.end_date || null,
      }));
      const allStartDates = periods.map((p) => p.start_date).filter(Boolean).sort();
      const allEndDates = periods.map((p) => p.end_date).filter(Boolean).sort();
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price_per_month: pricePerMonth,
        schedule_days: allDays,
        schedule_time: periodsData[0]?.time ?? null,
        schedule_periods: periodsData,
        instructor_name: selectedMaestros.map((m) => m.full_name).join(", ") || null,
        court_name: periods[0]?.court || null,
        start_date: allStartDates[0] ?? null,
        end_date: allEndDates[allEndDates.length - 1] ?? null,
        is_active: true,
      };

      let err;
      let savedCourseId = courseId;
      if (isEditMode) {
        ({ error: err } = await supabase.from("courses").update(payload).eq("id", courseId));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: inserted, error: insertErr } = await supabase
          .from("courses")
          .insert([{ ...payload, created_by: user?.id ?? null }])
          .select("id")
          .single();
        err = insertErr;
        if (inserted) savedCourseId = inserted.id;
      }

      if (err) {
        setError(err.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Save enrollments
      if (savedCourseId) {
        const { error: delErr } = await supabase.from("course_enrollments").delete().eq("course_id", savedCourseId);
        if (delErr) throw new Error("Errore rimozione iscrizioni precedenti: " + delErr.message);

        const registeredAthletes = selectedAthletes.filter((a) => a.isRegistered && a.userId);
        const guestAthletes = selectedAthletes.filter((a) => !a.isRegistered && a.fullName.trim());
        const fee = pricePerMonth > 0 ? pricePerMonth : null;
        const rows = [
          ...registeredAthletes.map((a) => ({ course_id: savedCourseId, user_id: a.userId, fee, guest_name: null })),
          ...guestAthletes.map((a) => ({ course_id: savedCourseId, user_id: null, fee, guest_name: a.fullName.trim() })),
        ];
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from("course_enrollments").insert(rows);
          if (insErr) throw new Error("Errore salvataggio partecipanti: " + insErr.message);
        }
      }

      setSuccess(isEditMode ? "Corso aggiornato con successo!" : "Corso creato con successo!");
      setTimeout(() => router.push("/dashboard/admin/corsi"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto. Riprova.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6 pt-3">
        {/* Breadcrumb + Title */}
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link href="/dashboard/admin/corsi" className="hover:text-secondary/80 transition-colors">
              Corsi
            </Link>
            {" › "}
            <span>{isEditMode ? "Modifica Corso" : "Nuovo Corso"}</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">
            {isEditMode ? "Modifica Corso" : "Nuovo Corso"}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {/* Informazioni generali */}
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni generali</h2>
          </div>
          <div className="divide-y divide-black/10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Nome corso <span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Tennis Under 10 – Gruppo A"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
              <div className="flex-1">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrizione del corso..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder-secondary/40 resize-none focus:outline-none focus:ring-0 focus:border-black/10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Quota</label>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary/50">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerMonth || ""}
                    onChange={(e) => setPricePerMonth(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Maestri */}
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestri</h2>
          </div>
          <div className="p-6">
            <AthletesSelector
              athletes={maestros}
              selectedAthletes={selectedMaestros.map((m) => ({ userId: m.id, fullName: m.full_name, isRegistered: true }))}
              inlineMode={true}
              keepNeutralSelectedBorder={true}
              keepNeutralInputFocus={true}
              allowGuestParticipants={false}
              hideEmptyMessages={true}
              searchPlaceholder="Cerca maestro"
              participantToneByIndex={() => "dark"}
              maxAthletes={null}
              onAthleteAdd={(athlete) => {
                if (athlete.userId && !selectedMaestros.some((m) => m.id === athlete.userId)) {
                  setSelectedMaestros((prev) => [...prev, { id: athlete.userId!, full_name: athlete.fullName }]);
                }
              }}
              onAthleteRemove={(index) => {
                setSelectedMaestros((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>
        </div>

        {/* Partecipanti */}
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
          </div>
          <div className="p-6">
            <AthletesSelector
              athletes={athletes}
              selectedAthletes={selectedAthletes}
              inlineMode={true}
              keepNeutralSelectedBorder={true}
              keepNeutralInputFocus={true}
              hideEmptyMessages={true}
              onAthleteAdd={(athlete) => setSelectedAthletes((prev) => [...prev, athlete])}
              onAthleteRemove={(index) => setSelectedAthletes((prev) => prev.filter((_, i) => i !== index))}
              maxAthletes={null}
            />
          </div>
        </div>

        {periods.map((period, pidx) => (
          <div key={pidx} className="bg-white rounded-lg border border-black/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">
                {periods.length > 1 ? `Periodo ${pidx + 1}` : "Periodo"}
              </h2>
              {periods.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePeriod(pidx)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Rimuovi periodo"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="divide-y divide-black/10">

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
                  <div className="flex-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openDatePicker(pidx, "start")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                        tabIndex={-1}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        placeholder="GG/MM/AAAA"
                        value={periodStartTexts[pidx] ?? ""}
                        onChange={(e) => handlePeriodDateText(pidx, "start", e.target.value)}
                        maxLength={10}
                        className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-0 focus:border-black/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data fine</label>
                  <div className="flex-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openDatePicker(pidx, "end")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                        tabIndex={-1}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        placeholder="GG/MM/AAAA"
                        value={periodEndTexts[pidx] ?? ""}
                        onChange={(e) => handlePeriodDateText(pidx, "end", e.target.value)}
                        maxLength={10}
                        className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-0 focus:border-black/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni settimana</label>
                  <div className="flex-1 grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(pidx, day.value)}
                        className={`w-full px-4 py-2 text-sm font-medium text-center rounded-lg border transition-all ${
                          period.days.includes(day.value)
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white text-secondary border-gray-300 hover:border-secondary"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 p-6">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {courts.map((court) => (
                      <button
                        key={court}
                        type="button"
                        onClick={() => setPeriods((prev) => prev.map((p, pIdx) => pIdx !== pidx ? p : { ...p, court }))}
                        className={`w-full px-4 py-2 text-sm font-medium text-center rounded-lg border transition-all ${
                          period.court === court
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white text-secondary border-gray-300 hover:border-secondary"
                        }`}
                      >
                        {court}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-6">
                  <label className="text-sm text-secondary font-medium">Fascia oraria</label>
                  <div
                    className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                    style={{ overflowX: "scroll", WebkitOverflowScrolling: "touch" }}
                    onMouseDown={handleTimelineMouseDown}
                    onMouseMove={handleTimelineMouseMove}
                    onMouseUp={handleTimelineMouseUp}
                    onMouseLeave={handleTimelineMouseUp}
                  >
                    <div className="min-w-[1280px]">
                      <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                        {Array.from({ length: 16 }, (_, i) => (
                          <div key={i} className="p-3 text-center font-bold text-white text-xs flex items-center justify-center">
                            {String(7 + i).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg" style={{ minHeight: "70px" }}>
                        {Array.from({ length: 16 }, (_, hi) => {
                          const hour = 7 + hi;
                          const t1 = `${String(hour).padStart(2, "0")}:00`;
                          const t2 = hour < 22 ? `${String(hour).padStart(2, "0")}:30` : null;
                          return (
                            <div key={hi} className="border-r border-gray-200 last:border-r-0 relative flex">
                              <div
                                className={`flex-1 transition-colors cursor-pointer ${
                                  period.slots.includes(t1) ? "bg-secondary" : "bg-white hover:bg-secondary/10"
                                }`}
                                onClick={() => toggleSlot(pidx, t1)}
                                title={t1}
                              >
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300 pointer-events-none" />
                              </div>
                              {t2 && (
                                <div
                                  className={`flex-1 transition-colors cursor-pointer ${
                                    period.slots.includes(t2) ? "bg-secondary" : "bg-white hover:bg-secondary/10"
                                  }`}
                                  onClick={() => toggleSlot(pidx, t2)}
                                  title={t2}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={addPeriod}
            className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium"
          >
            Aggiungi periodo
          </button>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="flex-1 px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Salvataggio...</span>
              </>
            ) : (
              <span>{isEditMode ? "Salva Modifiche" : "Crea Corso"}</span>
            )}
          </button>
        </div>
      </div>

      {/* Date Picker Modal */}
      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" showBuiltinClose={false} className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200">
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="text-white text-lg">
              {activeDateContext?.field === "start" ? "Data inizio" : "Data fine"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese precedente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {getCalendarMonthLabel(calendarViewDate)}
                </p>
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {WEEK_DAYS_CAL.map((day) => (
                  <span key={day} className="py-1">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, pendingDate);
                  const isTodayDate = isSameCalendarDay(date, new Date());
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => selectCalendarDay(date)}
                      className={`h-9 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-secondary text-white font-semibold"
                          : isCurrentMonth
                          ? "text-gray-800 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={handleDatePickerToday}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={applyDateSelection}
              className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
