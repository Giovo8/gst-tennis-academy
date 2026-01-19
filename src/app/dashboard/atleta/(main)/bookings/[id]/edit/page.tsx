"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";

interface Coach {
  id: string;
  full_name: string;
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
  { value: "campo", label: "Campo", shortLabel: "Campo", icon: "🎾" },
  { value: "lezione_privata", label: "Lezione Privata", shortLabel: "Privata", icon: "👤" },
  { value: "lezione_gruppo", label: "Lezione Gruppo", shortLabel: "Gruppo", icon: "👥" },
];

export default function EditBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [originalBooking, setOriginalBooking] = useState<any>(null);

  // Form state
  const [bookingType, setBookingType] = useState("campo");
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
  
  // Drag to scroll
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineScrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - timelineScrollRef.current.offsetLeft;
    scrollLeft.current = timelineScrollRef.current.scrollLeft;
    timelineScrollRef.current.style.cursor = 'grabbing';
    timelineScrollRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !timelineScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - timelineScrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    timelineScrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (timelineScrollRef.current) {
      timelineScrollRef.current.style.cursor = 'grab';
      timelineScrollRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      handleMouseUp();
    }
  };

  // Validation
  const canSubmit = selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoach));

  useEffect(() => {
    loadInitialData();
  }, [bookingId]);

  useEffect(() => {
    if (selectedDate && selectedCourt && !loading) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt, loading]);

  async function loadInitialData() {
    setLoading(true);
    try {
      // Verifica utente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Carica prenotazione esistente
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();

      if (bookingError || !bookingData) {
        setError("Prenotazione non trovata");
        router.push("/dashboard/atleta/bookings");
        return;
      }

      // Verifica che la prenotazione sia modificabile
      const isPast = new Date(bookingData.start_time) < new Date();
      if (bookingData.status === "cancelled" || isPast) {
        setError("Questa prenotazione non può essere modificata");
        router.push("/dashboard/atleta/bookings");
        return;
      }

      // Non si può modificare una prenotazione già confermata
      if (bookingData.manager_confirmed) {
        setError("Non puoi modificare una prenotazione già confermata dalla segreteria");
        router.push("/dashboard/atleta/bookings");
        return;
      }

      setOriginalBooking(bookingData);

      // Popola il form con i dati esistenti
      setBookingType(bookingData.type);
      setSelectedCourt(bookingData.court);
      setSelectedCoach(bookingData.coach_id || "");
      setNotes(bookingData.notes || "");

      // Estrai data e slot dalla prenotazione esistente
      const startTime = new Date(bookingData.start_time);
      const endTime = new Date(bookingData.end_time);
      setSelectedDate(startTime);

      // Calcola gli slot selezionati
      const slotsFromBooking: string[] = [];
      let current = new Date(startTime);
      while (current < endTime) {
        const hours = current.getHours().toString().padStart(2, "0");
        const minutes = current.getMinutes().toString().padStart(2, "0");
        slotsFromBooking.push(`${hours}:${minutes}`);
        current.setMinutes(current.getMinutes() + 30);
      }
      setSelectedSlots(slotsFromBooking);

      // Carica campi e maestri
      const courtsData = await getCourts();
      setCourts(courtsData);

      const { data: coachData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "maestro")
        .order("full_name");

      if (coachData) setCoaches(coachData);

    } catch (err) {
      console.error("Error loading data:", err);
      setError("Errore nel caricamento dei dati");
    } finally {
      setCourtsLoading(false);
      setLoading(false);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoadingSlots(true);

    const dateStr = selectedDate.toISOString().split("T")[0];

    // Get existing bookings for this court and date (excluding current booking)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, user_id, coach_id, start_time, end_time, type, status")
      .eq("court", selectedCourt)
      .neq("status", "cancelled")
      .neq("id", bookingId) // Escludi la prenotazione corrente
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

    // Build enriched bookings for display
    const enrichedBookings = bookings?.map(booking => ({
      ...booking,
      isBlock: false
    })) || [];

    // Add court blocks as fake bookings
    const blocksAsBookings = courtBlocks?.map(block => ({
      id: block.id,
      start_time: block.start_time,
      end_time: block.end_time,
      type: "blocco",
      status: "blocked",
      reason: block.reason,
      isBlock: true
    })) || [];

    setExistingBookings([...enrichedBookings, ...blocksAsBookings]);

    // Build occupied half-hour slots set
    const occupiedSlots = new Set<string>();

    // Mark slots occupied by bookings (excluding current)
    bookings?.forEach(b => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);

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
      for (const minute of [0, 30]) {
        if (hour === 22 && minute === 30) break;

        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

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

  // Gestione selezione multipla di slot consecutivi
  const toggleSlotSelection = (time: string, available: boolean) => {
    if (!available) return;

    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      }

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
          return [time];
        }
      }

      return allSlots;
    });
  };

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
    setSelectedSlots([]); // Reset slot quando cambia la data
  };

  async function handleSubmit() {
    if (!selectedDate || !selectedCourt || selectedSlots.length === 0) {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      const orderedSlots = [...selectedSlots].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      const durationMinutes = orderedSlots.length * 30;
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);

      const updateData = {
        coach_id: selectedCoach || null,
        court: selectedCourt,
        type: bookingType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: notes || null,
        // Reset conferme quando la prenotazione viene modificata
        manager_confirmed: false,
        coach_confirmed: false,
      };

      const { error: updateError } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess("Prenotazione modificata con successo! In attesa di nuova conferma.");
      setTimeout(() => {
        router.push("/dashboard/atleta/bookings");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore nella modifica della prenotazione");
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link href="/dashboard/atleta/bookings" className="hover:text-secondary/80 transition-colors">Prenotazioni</Link>
            {" › "}
            <span>Modifica</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Modifica Prenotazione</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Modifica i dettagli della tua prenotazione. Le conferme verranno resettate.
          </p>
        </div>
        <Link
          href="/dashboard/atleta/bookings"
          className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all self-start"
          title="Torna alla lista"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
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
              onClick={() => {
                setSelectedDate(addDays(selectedDate, -1));
                setSelectedSlots([]);
              }}
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
              onClick={() => {
                setSelectedDate(addDays(selectedDate, 1));
                setSelectedSlots([]);
              }}
              className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
            >
              <span className="text-lg font-semibold text-white">&gt;</span>
            </button>
          </div>

          {/* Area Principale */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
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

                {/* Dettagli prenotazione */}
                <div className="space-y-6 mt-6">
                  {/* Tipo prenotazione */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo prenotazione *</label>
                    <div className="flex-1 flex gap-2 sm:gap-3">
                      {BOOKING_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setBookingType(type.value)}
                          className={`px-3 sm:px-5 py-2 text-sm rounded-lg border transition-all ${
                            bookingType === type.value
                              ? 'bg-secondary text-white border-secondary'
                              : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                          }`}
                        >
                          <span className="sm:hidden">{type.shortLabel}</span>
                          <span className="hidden sm:inline">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campo */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                    <div className="flex-1 flex flex-wrap gap-2 sm:gap-3">
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
                            onClick={() => {
                              setSelectedCourt(court);
                              setSelectedSlots([]);
                            }}
                            className={`px-4 sm:px-5 py-2 text-sm rounded-lg border transition-all ${
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
                </div>

                <p className="text-sm font-semibold text-secondary mt-6 mb-2">Orari disponibili</p>

                {/* Timeline orizzontale */}
                <div 
                  ref={timelineScrollRef}
                  className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                  style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="min-w-[1280px]">
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

                    {/* Griglia slot selezionabili */}
                    <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                      {/* Prenotazioni esistenti come blocchi sovrapposti */}
                      {existingBookings.map((booking) => {
                        const start = new Date(booking.start_time);
                        const end = new Date(booking.end_time);
                        const startHour = start.getHours();
                        const startMinute = start.getMinutes();
                        const endHour = end.getHours();
                        const endMinute = end.getMinutes();

                        const startSlot = (startHour - 7) * 2 + (startMinute === 30 ? 1 : 0);
                        const endSlot = (endHour - 7) * 2 + (endMinute === 30 ? 1 : 0);
                        const duration = endSlot - startSlot;

                        const getBookingStyle = () => {
                          if (booking.isBlock) {
                            return { background: "linear-gradient(to bottom right, #dc2626, #ea580c)" };
                          }
                          return { background: "linear-gradient(to bottom right, #6b7280, #4b5563)" };
                        };

                        const getBookingLabel = () => {
                          if (booking.isBlock) return booking.reason || "BLOCCATO";
                          return "Occupato";
                        };

                        return (
                          <div
                            key={booking.id}
                            className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md mx-0.5 my-1.5 z-10"
                            style={{
                              ...getBookingStyle(),
                              left: `${(startSlot / 32) * 100}%`,
                              width: `${(duration / 32) * 100}%`,
                              top: '4px',
                              bottom: '4px'
                            }}
                          >
                            <div className="truncate leading-tight uppercase tracking-wider">
                              {getBookingLabel()}
                            </div>
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

          {/* Bottone Conferma */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Salvataggio...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Salva Modifiche</span>
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
