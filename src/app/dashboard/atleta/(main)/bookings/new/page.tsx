"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";

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
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-secondary flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
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
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary/5 ${
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

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4", "Campo 5", "Campo 6", "Campo 7", "Campo 8"];
const BOOKING_TYPES = [
  { value: "campo", label: "Campo Libero", icon: "🎾" },
  { value: "lezione_privata", label: "Lezione Privata", icon: "👤" },
  { value: "lezione_gruppo", label: "Lezione Gruppo", icon: "👥" },
];

export default function NewBookingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);

  // Form state
  const [bookingType, setBookingType] = useState("campo");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState(COURTS[0]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [notes, setNotes] = useState("");

  // Available slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  // Validation
  const canSubmit = selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoach));

  useEffect(() => {
    loadCoaches();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  async function loadCoaches() {
    const { data: coachData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "maestro")
      .order("full_name");

    if (coachData) setCoaches(coachData);
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoadingSlots(true);
    
    const dateStr = selectedDate.toISOString().split("T")[0];

    // Get existing bookings for this court and date
    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
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
      .select("start_time, end_time")
      .eq("court_id", selectedCourt)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString());

    // Build occupied hours set (bookings + court blocks)
    const occupiedHours = new Set<number>();
    
    // Mark hours occupied by bookings
    bookings?.forEach(b => {
      const start = new Date(b.start_time).getHours();
      const end = new Date(b.end_time).getHours();
      for (let h = start; h < end; h++) {
        occupiedHours.add(h);
      }
    });

    // Mark hours occupied by court blocks
    courtBlocks?.forEach(block => {
      const start = new Date(block.start_time).getHours();
      const end = new Date(block.end_time).getHours();
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
      
      // Slot disponibile se l'ora non è già occupata
      let available = !occupiedHours.has(hour);
      
      // If today, check if slot is in the past (1h buffer)
      if (isToday && hour <= now.getHours()) {
        available = false;
      }

      generatedSlots.push({ time, available });
    }

    setSlots(generatedSlots);
    setLoadingSlots(false);
  }

  const handleSlotClick = (time: string, available: boolean) => {
    if (!available) return;

    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        // Deselect
        return prev.filter((t) => t !== time);
      } else {
        // Select consecutive slots
        const allSlots = slots.map((s) => s.time);
        const newIndex = allSlots.indexOf(time);

        if (prev.length === 0) {
          return [time];
        }

        const existingIndices = prev.map((t) => allSlots.indexOf(t));
        const minIndex = Math.min(...existingIndices);
        const maxIndex = Math.max(...existingIndices);

        // If clicking adjacent
        if (newIndex === minIndex - 1 || newIndex === maxIndex + 1) {
          return [...prev, time].sort((a, b) => allSlots.indexOf(a) - allSlots.indexOf(b));
        }

        // Otherwise start fresh
        return [time];
      }
    });
  };

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year, month - 1, day);
    setSelectedDate(newDate);
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

      // Recupera il token dell'utente per chiamare l'API protetta
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta, effettua di nuovo il login.");
      }

      // Create bookings for all selected slots
      const bookingsToCreate = selectedSlots.map((slotTime) => {
        const [hours, minutes] = slotTime.split(":").map(Number);
        const startTime = new Date(selectedDate);
        startTime.setHours(hours, minutes, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1);

        return {
          user_id: user.id,
          coach_id: selectedCoach || null,
          court: selectedCourt,
          type: bookingType,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending",
          manager_confirmed: false,
          coach_confirmed: false,
          notes: notes || null,
        };
      });

      // Create all bookings
      for (const bookingData of bookingsToCreate) {
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
      }

      setSuccess(`${bookingsToCreate.length} prenotazione/i creata/e con successo!`);
      setTimeout(() => {
        router.push("/dashboard/atleta/bookings");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore nella creazione della prenotazione");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <Link
            href="/dashboard/atleta/bookings"
            className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
          >
            Prenotazioni
          </Link>
          <h1 className="text-3xl font-bold text-secondary">Nuova Prenotazione</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Seleziona giorno, campo e slot. Per le lezioni private scegli il maestro.
          </p>
        </div>
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

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        
        {/* Header Card con Data */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-secondary/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-secondary/70 uppercase tracking-wider font-semibold mb-1">Calendario Prenotazioni</p>
              <h2 className="text-xl font-bold text-secondary capitalize">
                {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
              </h2>
            </div>
            
            {/* Navigazione Data */}
            <div className="flex items-center gap-3">
              <input
                ref={dateInputRef}
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => handleDateInputChange(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo Prenotazione */}
            <div>
              <label className="block text-xs font-semibold text-secondary/70 uppercase tracking-wider mb-2">Tipo prenotazione</label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              >
                {BOOKING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo */}
            <div>
              <label className="block text-xs font-semibold text-secondary/70 uppercase tracking-wider mb-2">Campo *</label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              >
                {COURTS.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>

            {/* Maestro se necessario */}
            {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-secondary/70 uppercase tracking-wider mb-2">Maestro *</label>
                <SearchableSelect
                  value={selectedCoach}
                  onChange={setSelectedCoach}
                  options={coaches.map((coach) => ({
                    value: coach.id,
                    label: coach.full_name,
                  }))}
                  placeholder="Seleziona maestro"
                  searchPlaceholder="Cerca maestro..."
                />
              </div>
            )}
          </div>

          {/* Note */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-secondary/70 uppercase tracking-wider mb-2">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuali note o richieste particolari..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
            />
          </div>
        </div>

        {/* Slot Orari */}
        <div className="p-6">
          {!selectedCourt ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
                <Calendar className="h-8 w-8 text-secondary/40" />
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">Seleziona un campo</h3>
              <p className="text-sm text-secondary/60">
                Scegli un campo dal menu sopra per vedere gli slot disponibili
              </p>
            </div>
          ) : loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
              <p className="text-secondary font-semibold">Caricamento slot...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary/60" />
                  <h3 className="text-sm font-semibold text-secondary/70 uppercase tracking-wider">
                    Slot disponibili
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-secondary"></div>
                    <span className="text-secondary/70">Selezionato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border-2 border-gray-300"></div>
                    <span className="text-secondary/70">Disponibile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-200"></div>
                    <span className="text-secondary/70">Occupato</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleSlotClick(slot.time, slot.available)}
                    disabled={!slot.available}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      selectedSlots.includes(slot.time)
                        ? "bg-secondary border-secondary shadow-md"
                        : slot.available
                        ? "bg-white border-gray-200 hover:border-secondary/40 hover:shadow-sm"
                        : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock className={`h-4 w-4 ${
                        selectedSlots.includes(slot.time) ? "text-white" : slot.available ? "text-secondary/60" : "text-gray-400"
                      }`} />
                      <span className={`text-base font-bold ${
                        selectedSlots.includes(slot.time) ? "text-white" : slot.available ? "text-secondary" : "text-gray-400 line-through"
                      }`}>
                        {slot.time}
                      </span>
                    </div>
                    {selectedSlots.includes(slot.time) && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedSlots.length > 0 && (
                <div className="mt-6 p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                  <p className="text-sm font-semibold text-secondary">
                    {selectedSlots.length} slot selezionato/i: {selectedSlots.sort().join(", ")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Action */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full px-6 py-3.5 bg-secondary hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-3 shadow-md disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Creazione in corso...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Conferma Prenotazione</span>
              </>
            )}
          </button>
          {!canSubmit && !submitting && (
            <p className="text-xs text-secondary/60 text-center mt-3">
              Completa tutti i campi per procedere
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
