"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserCircle,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { addDays, format, isToday } from "date-fns";
import { it } from "date-fns/locale";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";

interface Coach {
  id: string;
  full_name: string;
}

interface Athlete {
  id: string;
  full_name: string;
  email: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

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
      if (!next) {
        setQuery("");
      }
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
              <div className="px-3 py-2 text-xs text-secondary/40">
                Nessun risultato
              </div>
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

const BOOKING_TYPES = [
  { value: "campo", label: "Campo", icon: "🎾" },
  { value: "lezione_privata", label: "Lezione Privata", icon: "👤" },
  { value: "lezione_gruppo", label: "Lezione Privata di Gruppo", icon: "👥" },
];

function NewAdminBookingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);

  // Form state
  const [bookingType, setBookingType] = useState("campo");
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [notes, setNotes] = useState("");

  // Available slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlotsSelection = useRef<string[]>([]);
  const urlParamsApplied = useRef<boolean>(false);

  // Validation
  const canSubmit = selectedAthlete && selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoach));

  // Load courts and users on mount
  useEffect(() => {
    loadCourtsAndUsers();
  }, []);

  // Apply URL parameters after courts are loaded
  useEffect(() => {
    if (courtsLoading || urlParamsApplied.current) return;

    const courtParam = searchParams.get('court');
    const dateParam = searchParams.get('date');
    const timesParam = searchParams.get('times');

    // Only apply if there are URL parameters to apply
    if (!courtParam && !dateParam && !timesParam) {
      // No URL params, just set default court
      if (courts.length > 0 && !selectedCourt) {
        setSelectedCourt(courts[0]);
      }
      return;
    }

    if (courtParam && courts.includes(courtParam)) {
      setSelectedCourt(courtParam);
    } else if (courts.length > 0 && !selectedCourt) {
      setSelectedCourt(courts[0]);
    }

    if (dateParam) {
      const parsedDate = new Date(dateParam + 'T12:00:00');
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }

    if (timesParam) {
      const times = timesParam.split(',').filter(Boolean);
      pendingSlotsSelection.current = times;
    }

    urlParamsApplied.current = true;
  }, [courtsLoading, courts, searchParams]);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      // Reset selected slots when date or court changes (unless we have pending slots from URL)
      if (pendingSlotsSelection.current.length === 0) {
        setSelectedSlots([]);
      }
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  // Apply pending slots selection after slots are loaded
  useEffect(() => {
    // Only proceed if we have pending slots
    if (pendingSlotsSelection.current.length === 0) return;

    // Wait for slots to finish loading
    if (loadingSlots) return;

    // Must have slots loaded to proceed
    if (slots.length === 0) return;

    // Filter only available slots
    const slotsToSelect = pendingSlotsSelection.current;
    const availableSlots = slotsToSelect.filter(time => {
      const slot = slots.find(s => s.time === time);
      return slot && slot.available;
    });

    // Clear pending slots after attempting selection
    pendingSlotsSelection.current = [];

    if (availableSlots.length > 0) {
      setSelectedSlots(availableSlots);

      // Remove URL parameters after successfully applying the slots
      setTimeout(() => {
        router.replace('/dashboard/admin/bookings/new', { scroll: false });
      }, 100);
    }
  }, [slots, loadingSlots, router]);

  async function loadCourtsAndUsers() {
    setCourtsLoading(true);
    try {
      // Load courts
      const courtsData = await getCourts();
      setCourts(courtsData);

      // Set first court as default
      if (courtsData.length > 0 && !selectedCourt) {
        setSelectedCourt(courtsData[0]);
      }

      // Load coaches
      const { data: coachData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "maestro")
        .order("full_name");

      if (coachData) setCoaches(coachData);

      // Load athletes
      const { data: athleteData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "atleta")
        .order("full_name");

      if (athleteData) setAthletes(athleteData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setCourtsLoading(false);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoadingSlots(true);

    const dateStr = selectedDate.toISOString().split("T")[0];

    // Get existing bookings for this court and date
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, user_id, coach_id, start_time, end_time, type, status, manager_confirmed, coach_confirmed")
      .eq("court", selectedCourt)
      .neq("status", "cancelled")
      .gte("start_time", `${dateStr}T00:00:00`)
      .lte("start_time", `${dateStr}T23:59:59`);

    // Get court blocks for this court and date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: courtBlocks } = await supabase
      .from("court_blocks")
      .select("id, start_time, end_time, reason")
      .eq("court_id", selectedCourt)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString());

    // Fetch profiles for bookings
    const userIds = [...new Set([
      ...(bookings?.map(b => b.user_id) || []),
      ...(bookings?.map(b => b.coach_id).filter(Boolean) || [])
    ])];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map(
      profilesData?.map(p => [p.id, p]) || []
    );

    const enrichedBookings = bookings?.map(booking => ({
      ...booking,
      user_profile: profilesMap.get(booking.user_id) || null,
      coach_profile: booking.coach_id ? profilesMap.get(booking.coach_id) || null : null
    })) || [];

    // Add court blocks as fake bookings for visualization
    const blocksAsBookings = courtBlocks?.map(block => ({
      id: block.id,
      start_time: block.start_time,
      end_time: block.end_time,
      type: "blocco",
      status: "blocked",
      user_profile: null,
      coach_profile: null,
      reason: block.reason,
      isBlock: true
    })) || [];

    // Merge consecutive bookings of the same person
    const mergeConsecutiveBookings = (bookings: any[]) => {
      if (bookings.length === 0) return [];
      
      // Sort by start time
      const sorted = [...bookings].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      const merged: any[] = [];
      let current = sorted[0];
      
      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        
        // Check if same user, same type, and consecutive times
        const currentEnd = new Date(current.end_time);
        const nextStart = new Date(next.start_time);
        const sameUser = current.user_id === next.user_id;
        const sameType = current.type === next.type;
        const consecutive = currentEnd.getTime() === nextStart.getTime();
        
        if (sameUser && sameType && consecutive && !current.isBlock && !next.isBlock) {
          // Merge: extend current end time
          current = {
            ...current,
            end_time: next.end_time
          };
        } else {
          // Not mergeable, push current and move to next
          merged.push(current);
          current = next;
        }
      }
      
      // Push the last one
      merged.push(current);
      return merged;
    };

    const allItems = [...enrichedBookings, ...blocksAsBookings];
    const mergedItems = mergeConsecutiveBookings(allItems);

    setExistingBookings(mergedItems);

    // Build occupied half-hour slots set (bookings + court blocks)
    const occupiedSlots = new Set<string>();
    
    // Mark slots occupied by bookings
    bookings?.forEach(b => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      
      // Mark all 30-minute slots as occupied
      let current = new Date(start);
      while (current < end) {
        const hours = current.getHours().toString().padStart(2, "0");
        const minutes = current.getMinutes().toString().padStart(2, "0");
        occupiedSlots.add(`${hours}:${minutes}`);
        current.setMinutes(current.getMinutes() + 30);
      }
    });

    // Mark slots occupied by court blocks
    courtBlocks?.forEach(block => {
      const start = new Date(block.start_time);
      const end = new Date(block.end_time);
      
      // Mark all 30-minute slots as occupied
      let current = new Date(start);
      while (current < end) {
        const hours = current.getHours().toString().padStart(2, "0");
        const minutes = current.getMinutes().toString().padStart(2, "0");
        occupiedSlots.add(`${hours}:${minutes}`);
        current.setMinutes(current.getMinutes() + 30);
      }
    });

    // Generate slots every 30 minutes (07:00 - 22:00)
    const generatedSlots: TimeSlot[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 7; hour <= 22; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 22 && minute === 30) break;
        
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        
        // Slot disponibile se non è già occupato
        let available = !occupiedSlots.has(time);
        
        // If today, check if slot is in the past
        if (isToday) {
          const slotTime = new Date(selectedDate);
          slotTime.setHours(hour, minute, 0, 0);
          if (slotTime <= now) {
            available = false;
          }
        }

        generatedSlots.push({ time, available });
      }
    }

    setSlots(generatedSlots);
    setLoadingSlots(false);
  }

  async function handleSubmit() {
    if (!selectedAthlete || !selectedDate || !selectedCourt || selectedSlots.length === 0) {
      setError("Completa tutti i campi obbligatori");
      return;
    }

    if ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && !selectedCoach) {
      setError("Seleziona un maestro per le lezioni");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Recupera il token dell'utente per chiamare l'API protetta
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta, effettua di nuovo il login.");
      }

      const orderedSlots = [...selectedSlots].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      const durationMinutes = orderedSlots.length * 30; // ogni slot dura 30 minuti
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);

      console.log("📅 Creazione prenotazione:", {
        slots: orderedSlots,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        duration: durationMinutes + " minuti"
      });

      const bookingData = {
        user_id: selectedAthlete,
        coach_id: selectedCoach || null,
        court: selectedCourt,
        type: bookingType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "confirmed",
        manager_confirmed: true,
        coach_confirmed: bookingType === "campo" ? true : false,
        notes: notes || null,
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        let errorMessage = "Errore nella creazione della prenotazione";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error || errorData.message || errorMessage;
        } catch {
          // ignore JSON parse errors and use default message
        }
        throw new Error(errorMessage);
      }

      setSuccess("Prenotazione creata con successo!");
      setTimeout(() => {
        router.push("/dashboard/admin/bookings");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore nella creazione della prenotazione");
    } finally {
      setSubmitting(false);
    }
  }

  // Genera slot ogni mezz'ora dalle 07:00 alle 22:00 per la logica
  const TIME_SLOTS = [];
  for (let hour = 7; hour <= 22; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 22) {
      TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }

  // Gestione selezione multipla di slot consecutivi
  const toggleSlotSelection = (time: string, available: boolean) => {
    if (!available) return;

    setSelectedSlots((prev) => {
      // se già selezionato, deseleziona
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      }

      // prima selezione
      if (prev.length === 0) {
        return [time];
      }

      const allSlots = [...prev, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });

      // verifica se sono consecutivi (ogni slot è 30 minuti)
      for (let i = 1; i < allSlots.length; i++) {
        const [hPrev, mPrev] = allSlots[i - 1].split(":").map(Number);
        const [hCurr, mCurr] = allSlots[i].split(":").map(Number);
        const prevMinutes = hPrev * 60 + mPrev;
        const currMinutes = hCurr * 60 + mCurr;
        if (currMinutes - prevMinutes !== 30) {
          return [time]; // non consecutivi, resetta
        }
      }

      return allSlots;
    });
  };

  // Verifica disponibilità slot
  const isSlotAvailable = (time: string): boolean => {
    if (!selectedCourt) return true;
    const slot = slots.find(s => s.time === time);
    return slot ? slot.available : false;
  };

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year, month - 1, day);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/bookings" className="hover:text-secondary/80 transition-colors">Prenotazioni</Link>
          {" › "}
          <span>Crea Prenotazione</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Crea prenotazione</h1>
        <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
          Seleziona giorno, campo e slot.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-2">
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mt-2">
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Successo</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-4">
        <div className="space-y-6">
          {/* Selettore Data */}
          <div className="rounded-lg p-3 sm:p-4 flex items-center justify-between transition-all bg-secondary">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
            >
              <span className="text-lg font-semibold text-white">&lt;</span>
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (dateInputRef.current) {
                    dateInputRef.current.showPicker();
                  }
                }}
                className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
                title="Scegli data"
              >
                <Calendar className="h-5 w-5 text-white" />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => handleDateInputChange(e.target.value)}
                className="absolute opacity-0 pointer-events-none"
              />
              <h2 className="text-base sm:text-lg font-bold capitalize text-white">
                <span className="hidden sm:inline">{format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}</span>
                <span className="sm:hidden">{format(selectedDate, "EEE dd MMM yyyy", { locale: it })}</span>
              </h2>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
            >
              <span className="text-lg font-semibold text-white">&gt;</span>
            </button>
          </div>

          {/* Area Principale - Campo, Dettagli e Slot */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            {/* Slot Orari + Campo + Dettagli */}
            <div className="space-y-4">
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                  <p className="text-secondary font-semibold">Caricamento slot...</p>
                </div>
              ) : (
                <>
                  {/* Titolo form */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-secondary">Dettagli prenotazione</h2>
                  </div>

                  {/* Dettagli prenotazione - stile form moderno */}
                  <div className="space-y-6 mt-6">
                    {/* Atleta */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Atleta *</label>
                      <div className="flex-1">
                        <SearchableSelect
                          value={selectedAthlete}
                          onChange={setSelectedAthlete}
                          options={athletes.map((athlete) => ({
                            value: athlete.id,
                            label: athlete.email
                              ? `${athlete.full_name} (${athlete.email})`
                              : athlete.full_name,
                          }))}
                          placeholder="Seleziona atleta"
                          searchPlaceholder="Cerca per nome o email"
                        />
                      </div>
                    </div>

                    {/* Tipo prenotazione */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo prenotazione *</label>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {BOOKING_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setBookingType(type.value)}
                            className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                              bookingType === type.value
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campo */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                      <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                        {courtsLoading ? (
                          <div className="flex items-center gap-2 text-secondary/60">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Caricamento campi...</span>
                          </div>
                        ) : (
                          courts.map((court) => (
                            <button
                              key={court}
                              type="button"
                              onClick={() => setSelectedCourt(court)}
                              className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                                selectedCourt === court
                                  ? 'bg-secondary text-white border-secondary'
                                  : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                              }`}
                            >
                              {court}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Maestro se necessario */}
                    {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                        <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Maestro *</label>
                        <div className="flex-1">
                          <SearchableSelect
                            value={selectedCoach}
                            onChange={setSelectedCoach}
                            options={coaches.map((coach) => ({
                              value: coach.id,
                              label: coach.full_name,
                            }))}
                            placeholder="Seleziona maestro"
                            searchPlaceholder="Cerca maestro"
                          />
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    {selectedAthlete && (
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                        <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Note</label>
                        <div className="flex-1">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Eventuali note..."
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-secondary mt-6 mb-2">Orari disponibili</p>
                  
                  {/* Timeline orizzontale stile bookings */}
                  <div className="overflow-x-auto scrollbar-hide">
                    <div style={{ minWidth: '1280px' }}>
                      {/* Header con orari */}
                      <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                        {Array.from({ length: 16 }, (_, i) => {
                          const hour = 7 + i;
                          return (
                            <div
                              key={hour}
                              className="p-3 text-center font-bold text-white text-xs flex items-center justify-center"
                            >
                              {hour.toString().padStart(2, '0')}:00
                            </div>
                          );
                        })}
                      </div>

                      {/* Griglia slot selezionabili (ogni colonna divisa in due slot da 30 min) */}
                      <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                        {/* Prenotazioni esistenti come blocchi sovrapposti */}
                        {existingBookings.map((booking) => {
                          const start = new Date(booking.start_time);
                          const end = new Date(booking.end_time);
                          const startHour = start.getHours();
                          const startMinute = start.getMinutes();
                          const endHour = end.getHours();
                          const endMinute = end.getMinutes();
                          
                          // Calcola posizione e larghezza
                          const startSlot = (startHour - 7) * 2 + (startMinute === 30 ? 1 : 0);
                          const endSlot = (endHour - 7) * 2 + (endMinute === 30 ? 1 : 0);
                          const duration = endSlot - startSlot;
                          
                          const getBookingStyle = () => {
                            if (booking.isBlock) {
                              return { background: "linear-gradient(to bottom right, #dc2626, #ea580c)" };
                            }
                            if (booking.status === "cancelled") {
                              return { background: "linear-gradient(to bottom right, #6b7280, #4b5563)" };
                            }
                            switch (booking.type) {
                              case "lezione_privata":
                              case "lezione_gruppo":
                                return { background: "linear-gradient(to bottom right, var(--color-frozen-lake-900), var(--secondary))" };
                              case "campo":
                                return { background: "linear-gradient(to bottom right, var(--color-frozen-lake-700), var(--color-frozen-lake-800))" };
                              case "arena":
                                return { background: "linear-gradient(to bottom right, var(--color-frozen-lake-600), var(--color-frozen-lake-700))" };
                              default:
                                return { background: "linear-gradient(to bottom right, var(--secondary-light), var(--secondary))" };
                            }
                          };
                          
                          const getBookingLabel = () => {
                            if (booking.isBlock) return booking.reason || "CAMPO BLOCCATO";
                            if (booking.type === "lezione_privata") return "Lezione Privata";
                            if (booking.type === "lezione_gruppo") return "Lezione Gruppo";
                            if (booking.type === "arena") return "Match Arena";
                            return "Campo";
                          };
                          
                          const isLesson = booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
                          const isBlock = booking.isBlock;
                          
                          return (
                            <div
                              key={booking.id}
                              onClick={() => router.push(isBlock ? `/dashboard/admin/courts/${booking.id}` : `/dashboard/admin/bookings/${booking.id}`)}
                              className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md mx-0.5 my-1.5 z-10 cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                ...getBookingStyle(),
                                left: `${(startSlot / 32) * 100}%`,
                                width: `${(duration / 32) * 100}%`,
                                top: '4px',
                                bottom: '4px'
                              }}
                            >
                              {isBlock ? (
                                <>
                                  <div className="truncate leading-tight uppercase tracking-wider">
                                    CAMPO BLOCCATO
                                  </div>
                                  <div className="text-white/90 text-[10px] mt-1 leading-tight">
                                    {booking.reason || "Blocco campo"}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="truncate leading-tight">
                                    {booking.user_profile?.full_name || "Sconosciuto"}
                                  </div>
                                  {isLesson && booking.coach_profile && (
                                    <div className="truncate text-white/95 mt-1 text-[11px] leading-tight">
                                      {booking.coach_profile.full_name}
                                    </div>
                                  )}
                                  <div className="text-white/90 text-[10px] mt-1 uppercase tracking-wide leading-tight">
                                    {getBookingLabel()}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Slot cliccabili */}
                        {Array.from({ length: 16 }, (_, hourIndex) => {
                          const hour = 7 + hourIndex;
                          const time1 = `${hour.toString().padStart(2, '0')}:00`;
                          const time2 = hour < 22 ? `${hour.toString().padStart(2, '0')}:30` : null;
                          const available1 = isSlotAvailable(time1);
                          const available2 = time2 ? isSlotAvailable(time2) : false;
                          const isSelected1 = selectedSlots.includes(time1);
                          const isSelected2 = time2 ? selectedSlots.includes(time2) : false;
                          
                          // Per l'ultima colonna (22:00) mostra solo un'area
                          if (!time2) {
                            return (
                              <div
                                key={hour}
                                className={`border-r border-gray-200 relative transition-colors cursor-pointer ${
                                  isSelected1
                                    ? 'bg-secondary hover:bg-secondary/90'
                                    : available1
                                    ? 'bg-white hover:bg-emerald-50/40'
                                    : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                onClick={() => toggleSlotSelection(time1, available1)}
                                title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                              >
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                              </div>
                            );
                          }
                          
                          return (
                            <div key={hour} className="border-r border-gray-200 last:border-r-0 relative flex">
                              {/* Prima metà (:00) - sinistra */}
                              <div
                                className={`flex-1 relative transition-colors cursor-pointer ${
                                  isSelected1
                                    ? 'bg-secondary hover:bg-secondary/90'
                                    : available1
                                    ? 'bg-white hover:bg-emerald-50/40'
                                    : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                onClick={() => toggleSlotSelection(time1, available1)}
                                title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                              />
                              
                              {/* Seconda metà (:30) - destra */}
                              <div
                                className={`flex-1 relative transition-colors cursor-pointer ${
                                  isSelected2
                                    ? 'bg-secondary hover:bg-secondary/90'
                                    : available2
                                    ? 'bg-white hover:bg-emerald-50/40'
                                    : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                onClick={() => toggleSlotSelection(time2, available2)}
                                title={`${time2} - ${available2 ? (isSelected2 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                              />
                              
                              {/* Tacchetta centrale */}
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Bottone Conferma */}
          <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creazione...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Conferma</span>
                </>
              )}
            </button>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}

export default function NewAdminBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    }>
      <NewAdminBookingPageInner />
    </Suspense>
  );
}
