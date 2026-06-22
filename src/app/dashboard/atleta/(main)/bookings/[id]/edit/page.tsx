"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, X } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalBody,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import { createNotification } from "@/lib/notifications/createNotification";
import { getAdminBookingNotificationLink } from "@/lib/notifications/links";
import { SearchableSelect } from "@/components/bookings/SearchableSelect";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import { isBookableCoachProfile, type UserRole } from "@/lib/roles";
import { useDragScroll } from "@/components/admin/hooks/useDragScroll";
import { MATCH_FORMATS, type MatchFormat } from "@/lib/bookings/bookingTypes";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ExistingBooking {
  id: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  isBlock?: boolean;
  reason?: string;
}

interface AthleteProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone?: string | null;
  role: UserRole;
}

type SelectedAthlete = {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
};

const BOOKING_TYPES = [
  { value: "campo", label: "Campo", shortLabel: "Campo" },
  { value: "lezione_privata", label: "Lezione Privata", shortLabel: "Privata" },
];

export default function EditBookingPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/bookings")[0];
  const bookingId = params?.id as string;

  const [selectedCourt, setSelectedCourt] = useState("");
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [bookingType, setBookingType] = useState<string>("campo");
  const [coaches, setCoaches] = useState<{ id: string; full_name: string; email?: string }[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("singolo");
  const [selectedAthletes, setSelectedAthletes] = useState<SelectedAthlete[]>([]);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [previousGuests, setPreviousGuests] = useState<{ fullName: string; email?: string; phone?: string }[]>([]);

  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDragScroll();

  // Carica prenotazione
  useEffect(() => {
    if (!bookingId) {
      setError("Prenotazione non trovata");
      setLoading(false);
      return;
    }

    const loadBooking = async () => {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select("id, user_id, court, start_time, end_time, notes, type, coach_id, status")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !data) {
        setError("Prenotazione non trovata");
        setLoading(false);
        return;
      }

      const isPast = new Date(data.start_time) < new Date();
      if (data.status === "cancelled" || data.status === "rejected" || isPast) {
        router.replace(`${dashboardBase}/bookings/${bookingId}`);
        return;
      }

      setSelectedCourt(data.court);
      setBookingType(data.type || "campo");
      setSelectedCoaches(data.coach_id ? [data.coach_id] : []);
      setSelectedDate(new Date(data.start_time));

      const existingStart = new Date(data.start_time);
      const existingEnd = new Date(data.end_time);
      const initialSlots: string[] = [];
      const cur = new Date(existingStart);
      while (cur < existingEnd) {
        initialSlots.push(`${cur.getHours().toString().padStart(2, "0")}:${cur.getMinutes().toString().padStart(2, "0")}`);
        cur.setMinutes(cur.getMinutes() + 30);
      }
      setSelectedSlots(initialSlots);
      setNotes(data.notes || "");

      // Carica partecipanti esistenti
      const { data: participantsData } = await supabase
        .from("booking_participants")
        .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
        .eq("booking_id", bookingId)
        .order("order_index", { ascending: true });

      if (participantsData) {
        setSelectedAthletes(
          participantsData.map((p: any) => ({
            userId: p.user_id || undefined,
            fullName: p.full_name || "",
            email: p.email || undefined,
            phone: p.phone || undefined,
            isRegistered: p.is_registered || false,
          }))
        );
        // Inferisci il formato dal numero di partecipanti
        if ((data.type === "campo" || !data.type) && participantsData.length > 2) {
          setMatchFormat("doppio");
        }
      }

      setLoading(false);
    };

    void loadBooking();
  }, [bookingId]);

  // Carica campi e maestri
  useEffect(() => {
    const loadCourtsAndCoaches = async () => {
      try {
        const courtsData = await getCourts();
        setCourts(courtsData);

        const { data: coachRes } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, metadata")
          .in("role", ["maestro", "gestore"])
          .order("full_name");

        if (coachRes) {
          setCoaches(
            coachRes
              .filter((c) => isBookableCoachProfile(c))
              .map(({ id, full_name, email }) => ({ id, full_name, email: email ?? undefined }))
          );
        }

        const { data: athleteRes } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, role")
          .eq("role", "atleta")
          .order("full_name");
        if (athleteRes) setAthletes(athleteRes as AthleteProfile[]);

        const { data: guestsData } = await supabase
          .from("booking_participants")
          .select("full_name, email, phone")
          .eq("is_registered", false)
          .order("full_name");
        if (guestsData) {
          const seen = new Set<string>();
          setPreviousGuests(
            guestsData.reduce((acc: { fullName: string; email?: string; phone?: string }[], g) => {
              const key = g.full_name.trim().toLowerCase();
              if (!seen.has(key)) { seen.add(key); acc.push({ fullName: g.full_name.trim(), email: g.email ?? undefined, phone: g.phone ?? undefined }); }
              return acc;
            }, [])
          );
        }
      } finally {
        setCourtsLoading(false);
      }
    };
    void loadCourtsAndCoaches();
  }, []);

  // Carica slot disponibili
  useEffect(() => {
    const loadSlots = async () => {
      if (!bookingId || !selectedDate || !selectedCourt) return;
      setLoadingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];

        // Usa l'API server-side (service role) per vedere tutte le occupazioni,
        // aggirando la RLS che limita l'atleta a vedere solo le proprie prenotazioni.
        let allOccupations: ExistingBooking[] = [];
        try {
          const res = await fetch(`/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(selectedCourt)}`);
          if (res.ok) {
            const data = await res.json();
            allOccupations = data.bookings ?? [];
          }
        } catch (err) {
          console.error("Error fetching availability:", err);
        }

        setExistingBookings(allOccupations);

        const occupied = new Set<string>();
        allOccupations.forEach((b) => {
          if (b.id === bookingId && !b.isBlock) return;
          const s = new Date(b.start_time), e = new Date(b.end_time);
          const c = new Date(s);
          while (c < e) {
            occupied.add(`${c.getHours().toString().padStart(2, "0")}:${c.getMinutes().toString().padStart(2, "0")}`);
            c.setMinutes(c.getMinutes() + 30);
          }
        });

        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();
        const generatedSlots: TimeSlot[] = [];
        for (let hour = 7; hour <= 22; hour++) {
          for (const minute of [0, 30]) {
            if (hour === 22 && minute === 30) break;
            const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            let available = !occupied.has(time);
            if (isToday) {
              const st = new Date(selectedDate);
              st.setHours(hour, minute, 0, 0);
              if (st <= now) available = false;
            }
            generatedSlots.push({ time, available });
          }
        }
        setSlots(generatedSlots);
      } finally {
        setLoadingSlots(false);
      }
    };
    void loadSlots();
  }, [bookingId, selectedDate, selectedCourt]);

  const isSlotAvailable = (time: string): boolean => {
    if (!selectedCourt) return true;
    if (selectedSlots.includes(time)) return true;
    const slot = slots.find((s) => s.time === time);
    return slot ? slot.available : false;
  };

  const toggleSlotSelection = (time: string, available: boolean) => {
    if (!available) return;
    setSelectedSlots((prev) => {
      if (prev.includes(time)) return prev.filter((t) => t !== time);
      if (prev.length === 0) return [time];
      const all = [...prev, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      for (let i = 1; i < all.length; i++) {
        const [hP, mP] = all[i - 1].split(":").map(Number);
        const [hC, mC] = all[i].split(":").map(Number);
        if (hC * 60 + mC - (hP * 60 + mP) !== 30) return [time];
      }
      return all;
    });
  };

  const canSave = !!selectedDate && !!selectedCourt && selectedSlots.length > 0 &&
    (bookingType === "campo" || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoaches.length > 0));

  async function handleSave() {
    if (!bookingId) return;
    setSaving(true);
    setError(null);
    try {
      if (!selectedDate || !selectedCourt || selectedSlots.length === 0)
        throw new Error("Seleziona giorno, campo e almeno uno slot orario");
      if ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoaches.length === 0)
        throw new Error("Seleziona almeno un maestro per le lezioni");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessione non valida");

      const ordered = [...selectedSlots].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      const [hours, minutes] = ordered[0].split(":").map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(startDate.getMinutes() + ordered.length * 30);

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          court: selectedCourt,
          type: bookingType,
          coach_id: (bookingType === "lezione_privata" || bookingType === "lezione_gruppo") ? selectedCoaches[0] || null : null,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          notes: notes || null,
        })
        .eq("id", bookingId)
        .eq("user_id", user.id);

      if (updateError) throw new Error(updateError.message);

      // Aggiorna partecipanti
      await supabase.from("booking_participants").delete().eq("booking_id", bookingId);
      if (selectedAthletes.length > 0) {
        await supabase.from("booking_participants").insert(
          selectedAthletes.map((a, i) => ({
            booking_id: bookingId,
            user_id: a.userId || null,
            full_name: a.fullName,
            email: a.email || null,
            phone: a.phone || null,
            is_registered: a.isRegistered,
            order_index: i,
          }))
        );
      }

      // Notifica admin/gestore
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const userName = userProfile?.full_name?.trim() || "Un atleta";
      const dateLabel = startDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeLabel = startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      const { data: admins } = await supabase.from("profiles").select("id").in("role", ["admin", "gestore"]);
      if (admins && admins.length > 0) {
        await Promise.all(
          admins.map((admin) =>
            createNotification({
              userId: admin.id,
              type: "booking",
              title: "Prenotazione modificata",
              message: `${userName} ha modificato la prenotazione ${selectedCourt} del ${dateLabel} alle ${timeLabel}.`,
              link: getAdminBookingNotificationLink(bookingId),
            })
          )
        );
      }

      setSuccess("Prenotazione aggiornata con successo!");
      setTimeout(() => { router.push(`${dashboardBase}/bookings/${bookingId}`); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'aggiornamento della prenotazione");
    } finally {
      setSaving(false);
    }
  }

  // Calendar helpers
  const WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

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

  function openDatePickerModal() {
    if (!selectedDate) return;
    const n = normalizeDate(selectedDate);
    setPendingDate(n);
    setCalendarViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    const n = normalizeDate(day);
    setPendingDate(n);
    setCalendarViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
  }

  function applyDateSelection() {
    setSelectedDate(normalizeDate(pendingDate));
    setSelectedSlots([]);
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

  function formatDateHeader(short: boolean = false): string {
    if (!selectedDate) return "";
    if (short) {
      const f = selectedDate.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      return f.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    const f = selectedDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return f.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={`${dashboardBase}/bookings`} className="hover:text-secondary/80 transition-colors">
            Prenotazioni
          </Link>
          {" › "}
          <span>Modifica Prenotazione</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Modifica Prenotazione</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Successo</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Selettore Data */}
        {selectedDate && (
          <div className="rounded-lg p-3 sm:p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center transition-all bg-secondary">
            <button
              type="button"
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); setSelectedSlots([]); }}
              className="justify-self-start h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
            >
              <span className="text-lg font-semibold text-white">&lt;</span>
            </button>

            <div className="min-w-0 flex justify-center">
              <button
                type="button"
                onClick={openDatePickerModal}
                className="relative inline-flex items-center justify-center rounded-md px-1.5 sm:px-2 py-1 transition-colors hover:bg-white/10"
                title="Scegli data"
              >
                <span className="inline-flex items-center justify-center sm:hidden" style={{ gap: "6px" }}>
                  <span className="font-bold text-white text-xl leading-none text-center whitespace-nowrap">
                    {formatDateHeader(true)}
                  </span>
                </span>
                <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-2">
                  <span className="font-bold text-white text-xl leading-none text-left min-w-0 truncate max-w-none capitalize">
                    {formatDateHeader()}
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); setSelectedSlots([]); }}
              className="justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
            >
              <span className="text-lg font-semibold text-white">&gt;</span>
            </button>
          </div>
        )}

        {/* Card Dettagli prenotazione */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli prenotazione</h2>
          </div>
          {courtsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-secondary mb-3" />
              <p className="text-secondary font-semibold">Caricamento...</p>
            </div>
          ) : (
            <div className="space-y-6 p-4 sm:p-6">
              {/* Tipo prenotazione */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo prenotazione</label>
                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {BOOKING_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setBookingType(type.value)}
                      className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border shadow-sm transition-all ${
                        bookingType === type.value
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      <span className="sm:hidden">{type.shortLabel}</span>
                      <span className="hidden sm:inline">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modalità campo */}
              {bookingType === "campo" && (
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Modalità</label>
                  <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    {MATCH_FORMATS.map((formatOption) => (
                      <button
                        key={formatOption.value}
                        type="button"
                        onClick={() => setMatchFormat(formatOption.value)}
                        className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border shadow-sm transition-all ${
                          matchFormat === formatOption.value
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white text-secondary border-gray-300 hover:border-secondary"
                        }`}
                      >
                        {formatOption.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
                <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  {courts.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setSelectedCourt(c); setSelectedSlots([]); }}
                      className={`px-4 sm:px-5 py-2 text-sm text-left rounded-lg border shadow-sm transition-all ${
                        selectedCourt === c
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Maestro */}
        {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestro</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              <SearchableSelect
                value=""
                onChange={(id) => {
                  if (!selectedCoaches.includes(id)) {
                    setSelectedCoaches([...selectedCoaches, id]);
                  }
                }}
                options={coaches
                  .filter((c) => !selectedCoaches.includes(c.id))
                  .map((coach) => ({ value: coach.id, label: coach.full_name }))}
                placeholder="Seleziona maestro"
                searchPlaceholder="Cerca maestro"
              />
              {selectedCoaches.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {selectedCoaches.map((coachId) => {
                    const coach = coaches.find((c) => c.id === coachId);
                    if (!coach) return null;
                    return (
                      <li key={coachId}>
                        <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "#023047" }}>
                          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-white leading-none">
                              {coach.full_name.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{coach.full_name}</p>
                            {coach.email && (
                              <p className="text-xs text-white/60 mt-0.5 truncate">{coach.email}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedCoaches(selectedCoaches.filter((id) => id !== coachId))}
                            className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all focus:outline-none w-8 h-8"
                            aria-label={`Rimuovi ${coach.full_name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Card Partecipanti */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
          </div>
          <div className="p-4 sm:p-6">
            <AthletesSelector
              athletes={athletes}
              selectedAthletes={selectedAthletes}
              onAthleteAdd={(athlete) => {
                const max = bookingType === "lezione_privata" ? 1 : matchFormat === "doppio" ? 4 : 2;
                if (selectedAthletes.length < max) setSelectedAthletes([...selectedAthletes, athlete]);
              }}
              onAthleteRemove={(index) => setSelectedAthletes(selectedAthletes.filter((_, i) => i !== index))}
              maxAthletes={bookingType === "lezione_privata" ? 1 : matchFormat === "doppio" ? 4 : 2}
              useSecondaryParticipantBorder
              previousGuests={previousGuests}
            />
          </div>
        </div>

        {/* Card Orari disponibili */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Orari disponibili</h2>
          </div>
          <div className="p-4 sm:p-6">
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                <p className="text-secondary font-semibold">Caricamento slot...</p>
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                style={{ overflowX: "scroll", WebkitOverflowScrolling: "touch" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <div className="min-w-[1280px]">
                  <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                    {Array.from({ length: 16 }, (_, i) => {
                      const hour = 7 + i;
                      return (
                        <div key={hour} className="p-3 text-center font-bold text-white text-xs flex items-center justify-center">
                          {hour.toString().padStart(2, "0")}:00
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>

                    {Array.from({ length: 16 }, (_, hourIndex) => {
                      const hour = 7 + hourIndex;
                      const time1 = `${hour.toString().padStart(2, "0")}:00`;
                      const time2 = hour < 22 ? `${hour.toString().padStart(2, "0")}:30` : null;
                      const available1 = isSlotAvailable(time1);
                      const available2 = time2 ? isSlotAvailable(time2) : false;
                      const isSelected1 = selectedSlots.includes(time1);
                      const isSelected2 = time2 ? selectedSlots.includes(time2) : false;

                      if (!time2) {
                        return (
                          <div
                            key={hour}
                            className={`border-r border-gray-200 relative transition-colors cursor-pointer ${
                              isSelected1 ? "bg-secondary hover:bg-secondary/90"
                              : available1 ? "bg-white hover:bg-emerald-50/40"
                              : "bg-gray-100 cursor-not-allowed"
                            }`}
                            onClick={() => toggleSlotSelection(time1, available1)}
                            title={`${time1} - ${available1 ? (isSelected1 ? "Selezionato" : "Disponibile") : "Occupato"}`}
                          >
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                          </div>
                        );
                      }

                      return (
                        <div key={hour} className="border-r border-gray-200 last:border-r-0 relative flex">
                          <div
                            className={`flex-1 relative transition-colors cursor-pointer ${
                              isSelected1 ? "bg-secondary hover:bg-secondary/90"
                              : available1 ? "bg-white hover:bg-emerald-50/40"
                              : "bg-gray-100 cursor-not-allowed"
                            }`}
                            onClick={() => toggleSlotSelection(time1, available1)}
                            title={`${time1} - ${available1 ? (isSelected1 ? "Selezionato" : "Disponibile") : "Occupato"}`}
                          />
                          <div
                            className={`flex-1 relative transition-colors cursor-pointer ${
                              isSelected2 ? "bg-secondary hover:bg-secondary/90"
                              : available2 ? "bg-white hover:bg-emerald-50/40"
                              : "bg-gray-100 cursor-not-allowed"
                            }`}
                            onClick={() => toggleSlotSelection(time2, available2)}
                            title={`${time2} - ${available2 ? (isSelected2 ? "Selezionato" : "Disponibile") : "Occupato"}`}
                          />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Note */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
          </div>
          <div className="p-4 sm:p-6">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuali note..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white shadow-sm px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:border-secondary/50 resize-none"
            />
          </div>
        </div>

        {/* Bottone Salva */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md shadow-sm transition-all flex items-center justify-center gap-3"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Salvataggio...</span>
            </>
          ) : (
            <span>Salva Modifiche</span>
          )}
        </button>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />

      {/* Date Picker Modal */}
      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" className="overflow-hidden rounded-xl !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200" showBuiltinClose={false}>
          <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-secondary">
            <h3 className="text-base font-semibold text-white">Seleziona Data</h3>
            <button
              type="button"
              onClick={() => setDatePickerModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>
          </div>
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
                {WEEK_DAYS.map((day) => (
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
                          : isTodayDate
                          ? "bg-secondary/10 text-secondary font-semibold"
                          : isCurrentMonth
                          ? "text-gray-900 hover:bg-gray-100"
                          : "text-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={handleDatePickerToday}
              className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
            >
              Oggi
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDatePickerModalOpen(false)}
                className="px-3 py-1.5 text-sm font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={applyDateSelection}
                className="px-3 py-1.5 text-sm font-medium text-white bg-secondary rounded-lg hover:opacity-90 transition-opacity"
              >
                Conferma
              </button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

