"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronDown,
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

interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) setQuery("");
      return next;
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-left text-secondary flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
      >
        <span className={selectedOption ? "" : "text-secondary/40"}>
          {selectedOption ? selectedOption.label : placeholder || "Seleziona"}
        </span>
        <ChevronDown className="h-4 w-4 text-secondary/60 ml-2 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder || "Cerca..."}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-1 focus:ring-secondary/30 focus:border-secondary/50"
            />
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-secondary/40">Nessun risultato</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-secondary/5 ${
                    opt.value === value ? "bg-secondary/10 font-semibold" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [pricePerMonth, setPricePerMonth] = useState(0);
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [selectedMaestros, setSelectedMaestros] = useState<{ id: string; full_name: string }[]>([]);
  const [maestros, setMaestros] = useState<{ id: string; full_name: string }[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<SelectedAthlete[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dateTexts, setDateTexts] = useState({ start_date: "", end_date: "" });

  useEffect(() => {
    async function loadMaestros() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, metadata")
        .in("role", ["maestro", "gestore"])
        .order("full_name");
      if (data) {
        setMaestros(
          data
            .filter((p) => isBookableCoachProfile(p))
            .map(({ id, full_name }) => ({ id, full_name }))
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
      setMaxParticipants(data.max_participants ?? 8);
      setPricePerMonth(data.price_per_month ?? 0);
      setScheduleDays(data.schedule_days ?? []);
      // Parse schedule_time back to slots (e.g. "09:00 – 10:30")
      const rawTime = data.schedule_time ?? "";
      if (rawTime) {
        const match = rawTime.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
        if (match) {
          const [, start, end] = match;
          const slots: string[] = [];
          let [h, m] = start.split(":").map(Number);
          const [eh, em] = end.split(":").map(Number);
          while (h * 60 + m < eh * 60 + em) {
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            m += 30;
            if (m >= 60) { h++; m -= 60; }
          }
          setSelectedSlots(slots);
        }
      }
      const maestroNames = (data.instructor_name ?? "").split(", ").filter(Boolean);
      setSelectedMaestros(maestroNames.map((n) => ({ id: n, full_name: n })));
      setSelectedCourt(data.court_name ?? "");
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
      const sd = data.start_date ?? "";
      const ed = data.end_date ?? "";
      setStartDate(sd);
      setEndDate(ed);
      setDateTexts({ start_date: isoToDisplay(sd), end_date: isoToDisplay(ed) });
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

  function handleDateTextChange(field: "start_date" | "end_date", value: string) {
    setDateTexts((prev) => ({ ...prev, [field]: value }));
    const iso = displayToIso(value);
    if (iso) {
      if (field === "start_date") setStartDate(iso);
      else setEndDate(iso);
    } else if (value === "") {
      if (field === "start_date") setStartDate("");
      else setEndDate("");
    }
  }

  function openDatePicker(field: "start" | "end") {
    const existing = field === "start" ? startDate : endDate;
    const base = existing ? normalizeDate(new Date(existing)) : normalizeDate(new Date());
    setActiveDateField(field);
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
    const iso = pendingDate.toISOString().split("T")[0];
    const display = isoToDisplay(iso);
    if (activeDateField === "start") {
      setStartDate(iso);
      setDateTexts((prev) => ({ ...prev, start_date: display }));
    } else {
      setEndDate(iso);
      setDateTexts((prev) => ({ ...prev, end_date: display }));
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

  function toggleSlot(time: string) {
    setSelectedSlots((prev) => {
      if (prev.includes(time)) return prev.filter((t) => t !== time);
      if (prev.length === 0) return [time];
      const allSlots = [...prev, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      for (let i = 1; i < allSlots.length; i++) {
        const [hP, mP] = allSlots[i - 1].split(":").map(Number);
        const [hC, mC] = allSlots[i].split(":").map(Number);
        if ((hC * 60 + mC) - (hP * 60 + mP) !== 30) return [time];
      }
      return allSlots;
    });
  }

  function handleTimelineMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!timelineScrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - timelineScrollRef.current.offsetLeft;
    scrollLeft.current = timelineScrollRef.current.scrollLeft;
    timelineScrollRef.current.style.cursor = "grabbing";
    timelineScrollRef.current.style.userSelect = "none";
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

  function toggleDay(day: string) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        max_participants: maxParticipants,
        price_per_month: pricePerMonth,
        schedule_days: scheduleDays,
        schedule_time: (() => {
          if (selectedSlots.length === 0) return null;
          const sorted = [...selectedSlots].sort();
          const first = sorted[0];
          const [lh, lm] = sorted[sorted.length - 1].split(":").map(Number);
          let endH = lh, endM = lm + 30;
          if (endM >= 60) { endH++; endM -= 60; }
          const last = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
          return `${first} – ${last}`;
        })(),
        instructor_name: selectedMaestros.map((m) => m.full_name).join(", ") || null,
        court_name: selectedCourt || null,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: true,
      };

      let err;
      let savedCourseId = courseId;
      if (isEditMode) {
        ({ error: err } = await supabase.from("courses").update(payload).eq("id", courseId));
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("courses")
          .insert([payload])
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
        const rows = [
          ...registeredAthletes.map((a) => ({ course_id: savedCourseId, user_id: a.userId, fee: pricePerMonth || null, guest_name: null })),
          ...guestAthletes.map((a) => ({ course_id: savedCourseId, user_id: null, fee: pricePerMonth || null, guest_name: a.fullName.trim() })),
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
      <div className="space-y-6">
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
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {/* Informazioni generali */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni generali</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Nome corso <span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Tennis Under 10 – Gruppo A"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
              <div className="flex-1">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrizione del corso..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder-secondary/40 resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Quota</label>
              <div className="flex-1">
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary/50">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerMonth || ""}
                    onChange={(e) => setPricePerMonth(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1 flex flex-wrap gap-2">
                {courts.map((court) => (
                  <button
                    key={court}
                    type="button"
                    onClick={() => setSelectedCourt(court)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                      selectedCourt === court
                        ? "bg-secondary text-white border-secondary"
                        : "bg-white text-secondary border-gray-300 hover:border-secondary"
                    }`}
                  >
                    {court}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Orario e Periodo */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Orario e periodo</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni settimana</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                        scheduleDays.includes(day.value)
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pb-6 border-b border-gray-200">
              <label className="text-sm text-secondary font-medium">Fascia oraria</label>
              <div
                ref={timelineScrollRef}
                className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                style={{ overflowX: "scroll", WebkitOverflowScrolling: "touch" }}
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleTimelineMouseMove}
                onMouseUp={handleTimelineMouseUp}
                onMouseLeave={handleTimelineMouseUp}
              >
                <div className="min-w-[1280px]">
                  {/* Header orari */}
                  <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                    {Array.from({ length: 16 }, (_, i) => (
                      <div key={i} className="p-3 text-center font-bold text-white text-xs flex items-center justify-center">
                        {String(7 + i).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                  {/* Slot selezionabili */}
                  <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg" style={{ minHeight: "70px" }}>
                    {Array.from({ length: 16 }, (_, hi) => {
                      const hour = 7 + hi;
                      const t1 = `${String(hour).padStart(2, "0")}:00`;
                      const t2 = hour < 22 ? `${String(hour).padStart(2, "0")}:30` : null;
                      return (
                        <div key={hi} className="border-r border-gray-200 last:border-r-0 relative flex">
                          <div
                            className={`flex-1 transition-colors cursor-pointer ${
                              selectedSlots.includes(t1) ? "bg-secondary" : "bg-white hover:bg-secondary/10"
                            }`}
                            onClick={() => toggleSlot(t1)}
                            title={t1}
                          >
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300 pointer-events-none" />
                          </div>
                          {t2 && (
                            <div
                              className={`flex-1 transition-colors cursor-pointer ${
                                selectedSlots.includes(t2) ? "bg-secondary" : "bg-white hover:bg-secondary/10"
                              }`}
                              onClick={() => toggleSlot(t2)}
                              title={t2}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {selectedSlots.length > 0 && (() => {
                const sorted = [...selectedSlots].sort();
                const first = sorted[0];
                const [lh, lm] = sorted[sorted.length - 1].split(":").map(Number);
                let endH = lh, endM = lm + 30;
                if (endM >= 60) { endH++; endM -= 60; }
                const last = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
                return (
                  <p className="text-sm font-medium text-secondary">{first} – {last}</p>
                );
              })()}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
              <div className="flex-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => openDatePicker("start")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="GG/MM/AAAA"
                    value={dateTexts.start_date}
                    onChange={(e) => handleDateTextChange("start_date", e.target.value)}
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data fine</label>
              <div className="flex-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => openDatePicker("end")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="GG/MM/AAAA"
                    value={dateTexts.end_date}
                    onChange={(e) => handleDateTextChange("end_date", e.target.value)}
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Maestri */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestri</h2>
          </div>
          <div className="p-6 space-y-4">
            <SearchableSelect
              value=""
              onChange={(val) => {
                const m = maestros.find((x) => x.id === val);
                if (!m || selectedMaestros.some((sm) => sm.full_name === m.full_name)) return;
                setSelectedMaestros((prev) => [...prev, { id: m.id, full_name: m.full_name }]);
              }}
              options={maestros
                .filter((m) => !selectedMaestros.some((sm) => sm.full_name === m.full_name))
                .map((m) => ({ value: m.id, label: m.full_name }))}
              placeholder="Cerca maestro"
              searchPlaceholder="Cerca maestro..."
            />
            {selectedMaestros.length > 0 && (
              <ul className="flex flex-col gap-2">
                {selectedMaestros.map((m) => (
                  <li key={m.full_name}>
                    <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "#05384c" }}>
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-white leading-none">
                          {m.full_name.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{m.full_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMaestros((prev) => prev.filter((x) => x.full_name !== m.full_name))
                        }
                        className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all focus:outline-none w-8 h-8"
                        aria-label={`Rimuovi ${m.full_name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Partecipanti */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
          </div>
          <div className="p-6">
            <AthletesSelector
              athletes={athletes}
              selectedAthletes={selectedAthletes}
              onAthleteAdd={(athlete) => setSelectedAthletes((prev) => [...prev, athlete])}
              onAthleteRemove={(index) => setSelectedAthletes((prev) => prev.filter((_, i) => i !== index))}
              maxAthletes={null}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3"
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

      {/* Date Picker Modal */}
      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">
              {activeDateField === "start" ? "Data inizio" : "Data fine"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
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
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
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
                      className={`h-9 rounded-md text-sm transition-colors ${
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
