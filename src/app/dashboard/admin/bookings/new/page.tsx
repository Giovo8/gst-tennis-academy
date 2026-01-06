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
  UserCircle,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";

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

export default function NewAdminBookingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  // Form state
  const [bookingType, setBookingType] = useState("campo");
  const [selectedAthlete, setSelectedAthlete] = useState("");
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
  const canSubmit = selectedAthlete && selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoach));

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  async function loadUsers() {
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

    // Build occupied hours set
    const occupiedHours = new Set<number>();
    
    bookings?.forEach(b => {
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

      const orderedSlots = [...selectedSlots].sort();
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      const durationHours = orderedSlots.length; // ogni slot dura 1 ora
      endTime.setHours(startTime.getHours() + durationHours);

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

  // Slot "di base" per mostrare sempre il calendario orario anche senza campo selezionato
  const baseSlots: TimeSlot[] = Array.from({ length: 14 }, (_, i) => {
    const hour = 8 + i; // dalle 8:00 alle 21:00
    return {
      time: `${hour.toString().padStart(2, "0")}:00`,
      available: true,
    };
  });

  const displaySlots = selectedCourt ? slots : baseSlots;

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

      const allSlots = [...prev, time].sort();

      // consenti solo blocchi consecutivi, altrimenti resetta sulla nuova scelta
      for (let i = 1; i < allSlots.length; i++) {
        const [hPrev] = allSlots[i - 1].split(":").map(Number);
        const [hCurr] = allSlots[i].split(":").map(Number);
        if (hCurr - hPrev !== 1) {
          return [time];
        }
      }

      return allSlots;
    });
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
      <div className="flex flex-col gap-2">
        <div>
          <Link
            href="/dashboard/admin/bookings"
            className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
          >
            Prenotazioni
          </Link>
          <h1 className="text-3xl font-bold text-secondary">Crea prenotazione</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Seleziona giorno, campo e slot.
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

      {/* Main Content */}
      <div className="py-4">
        <div className="space-y-6">
          {/* Area Principale - Data, Campo, Dettagli e Slot */}
          <div className="bg-white rounded-xl p-6 space-y-6">
            {/* Selettore Data */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">Seleziona Data</p>
                <h2 className="text-xl font-bold text-secondary capitalize">
                  {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
                </h2>
              </div>
              {/* Navigazione Data */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  className="p-2 rounded-md bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors"
                >
                  <span className="text-lg font-semibold">&lt;</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (dateInputRef.current) {
                      dateInputRef.current.click();
                    }
                  }}
                  className="p-2 rounded-md bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  className="sr-only"
                />
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="p-2 rounded-md bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors"
                >
                  <span className="text-lg font-semibold">&gt;</span>
                </button>
              </div>
            </div>

            {/* Slot Orari + Campo + Dettagli */}
            <div className="space-y-4">
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                  <p className="text-secondary font-semibold">Caricamento slot...</p>
                </div>
              ) : (
                <>
                  {/* Dettagli prenotazione compatti */}
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    {/* Atleta */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-secondary mb-2">Atleta *</label>
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

                    {/* Tipo prenotazione */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-secondary mb-2">Tipo prenotazione *</label>
                      <select
                        value={bookingType}
                        onChange={(e) => setBookingType(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      >
                        <option value="">Seleziona tipo</option>
                        {BOOKING_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campo */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-secondary mb-2">Campo *</label>
                      <select
                        value={selectedCourt}
                        onChange={(e) => setSelectedCourt(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
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
                        <label className="block text-sm font-semibold text-secondary mb-2">Maestro *</label>
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
                    )}
                  </div>

                  {/* Note, se serve */}
                  {selectedAthlete && (
                    <div>
                      <label className="block text-sm font-semibold text-secondary mb-2">Note</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Eventuali note..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                      />
                    </div>
                  )}

                  <p className="text-sm font-semibold text-secondary mt-4">Orari disponibili</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
                    {displaySlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => toggleSlotSelection(slot.time, slot.available)}
                        disabled={!slot.available}
                        className={`relative p-4 rounded-md border border-gray-200 transition-all h-20 flex items-center justify-center ${
                          selectedSlots.includes(slot.time)
                            ? "bg-secondary"
                            : slot.available
                            ? "bg-secondary/5 hover:bg-secondary/10 hover:scale-105"
                            : "bg-secondary/5 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div className="text-center">
                            <span className={`text-xl font-bold block ${
                            selectedSlots.includes(slot.time)
                              ? "text-white"
                              : slot.available
                              ? "text-secondary"
                              : "text-secondary/40"
                          }`}>
                            {slot.time}
                          </span>
                          {!slot.available && (
                            <span className="text-[10px] text-secondary/40 font-medium">Occupato</span>
                          )}
                        </div>
                      </button>
                    ))}
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
