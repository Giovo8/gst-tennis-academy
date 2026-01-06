"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface Coach {
  id: string;
  full_name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  blocked?: boolean;
}

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];
const BOOKING_TYPES = [
  { value: "campo", label: "Solo Campo", icon: "🎾" },
  { value: "lezione_privata", label: "Lezione Privata", icon: "👤" },
  { value: "lezione_gruppo", label: "Lezione di Gruppo", icon: "👥" },
];

export default function NewBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);

  // Form state
  const [bookingType, setBookingType] = useState("campo");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedCoach, setSelectedCoach] = useState("");
  const [duration, setDuration] = useState(1);
  const [notes, setNotes] = useState("");

  // Available slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);

  // Calendar navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (bookingType === "lezione_privata" || bookingType === "lezione_gruppo") {
      loadCoaches();
    }
  }, [bookingType]);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  async function loadCoaches() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "maestro");

    if (data) {
      setCoaches(data);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoading(true);
    
    const dateStr = selectedDate.toISOString().split("T")[0];

    // Get existing bookings for this court and date
    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("court", selectedCourt)
      .neq("status", "cancelled")
      .gte("start_time", `${dateStr}T00:00:00`)
      .lte("start_time", `${dateStr}T23:59:59`);

    // Get court blocks
    const { data: blocks } = await supabase
      .from("court_blocks")
      .select("start_time, end_time")
      .eq("court_id", selectedCourt)
      .gte("start_time", `${dateStr}T00:00:00`)
      .lte("start_time", `${dateStr}T23:59:59`);

    // Build occupied hours set
    const occupiedHours = new Set<number>();
    
    bookings?.forEach(b => {
      const start = new Date(b.start_time).getHours();
      const end = new Date(b.end_time).getHours();
      for (let h = start; h < end; h++) {
        occupiedHours.add(h);
      }
    });

    blocks?.forEach(b => {
      const start = new Date(b.start_time).getHours();
      const end = new Date(b.end_time).getHours();
      for (let h = start; h < end; h++) {
        occupiedHours.add(h);
      }
    });

    // Generate slots (8:00 - 22:00)
    const generatedSlots: TimeSlot[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 8; hour < 22; hour++) {
      const time = `${hour.toString().padStart(2, "0")}:00`;
      let available = !occupiedHours.has(hour);
      
      // If today, check if slot is in the past
      if (isToday && hour <= now.getHours() + 2) {
        available = false;
      }

      generatedSlots.push({ time, available });
    }

    setSlots(generatedSlots);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedCourt || !selectedSlot) {
      setError("Completa tutti i campi obbligatori");
      return;
    }

    if ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && !selectedCoach) {
      setError("Seleziona un maestro per la lezione");
      return;
    }

    setSubmitting(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessione scaduta. Effettua nuovamente il login.");
      setSubmitting(false);
      return;
    }

    const startHour = parseInt(selectedSlot.split(":")[0]);
    const startTime = new Date(selectedDate);
    startTime.setHours(startHour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startHour + duration);

    const { error: insertError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        court: selectedCourt,
        type: bookingType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        coach_id: selectedCoach || null,
        notes: notes || null,
        status: "pending",
      });

    if (insertError) {
      if (insertError.code === "23P01") {
        setError("Questo slot è già stato prenotato. Scegli un altro orario.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/atleta/bookings?success=true");
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty slots for days before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7); // 7 days ahead

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/atleta/bookings"
          className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground-muted)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Nuova Prenotazione</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Passo {step} di 3
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Tipo di Prenotazione
          </h2>
          <div className="space-y-3">
            {BOOKING_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setBookingType(type.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  bookingType === type.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--primary)]/30"
                }`}
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="text-[var(--foreground)] font-medium">{type.label}</span>
                {bookingType === type.value && (
                  <Check className="h-5 w-5 text-[var(--primary)] ml-auto" />
                )}
              </button>
            ))}
          </div>

          {/* Coach selection for lessons */}
          {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Seleziona Maestro
              </label>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              >
                <option value="">Scegli un maestro...</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            className="w-full mt-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
          >
            Continua
          </button>
        </div>
      )}

      {/* Step 2: Select Date and Court */}
      {step === 2 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Data e Campo
          </h2>

          {/* Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-medium text-[var(--foreground)]">
                {currentMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["D", "L", "M", "M", "G", "V", "S"].map((day, i) => (
                <div key={i} className="text-xs text-[var(--foreground-muted)] py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} />;
                }
                
                const isPast = day < today;
                const isTooFar = day > maxDate;
                const isDisabled = isPast || isTooFar;
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const isToday = day.toDateString() === today.toDateString();

                return (
                  <button
                    key={index}
                    onClick={() => !isDisabled && setSelectedDate(day)}
                    disabled={isDisabled}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? "bg-[var(--primary)] text-white"
                        : isToday
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : isDisabled
                        ? "text-[var(--foreground-subtle)] cursor-not-allowed"
                        : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Court Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Seleziona Campo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COURTS.map((court) => (
                <button
                  key={court}
                  onClick={() => setSelectedCourt(court)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedCourt === court
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--primary)]/30"
                  }`}
                >
                  <MapPin className={`h-4 w-4 mx-auto mb-1 ${
                    selectedCourt === court ? "text-[var(--primary)]" : "text-[var(--foreground-muted)]"
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedCourt === court ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                  }`}>
                    {court}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-hover)] transition-colors"
            >
              Indietro
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedDate || !selectedCourt}
              className="flex-1 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continua
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Time */}
      {step === 3 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Orario e Durata
          </h2>
          <p className="text-[var(--foreground-muted)] text-sm mb-4">
            {selectedDate?.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} • {selectedCourt}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : (
            <>
              {/* Time Slots */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-6">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      selectedSlot === slot.time
                        ? "bg-[var(--primary)] text-white"
                        : slot.available
                        ? "border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)]"
                        : "bg-[var(--surface-hover)] text-[var(--foreground-subtle)] cursor-not-allowed line-through"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Durata
                </label>
                <div className="flex gap-2">
                  {[1, 1.5, 2].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                        duration === d
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--foreground)]"
                      }`}
                    >
                      {d}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Note (opzionale)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Aggiungi eventuali note..."
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Indietro
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedSlot || submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Prenotazione...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Conferma
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
