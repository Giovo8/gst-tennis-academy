"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Search,
  CheckCircle,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { addDays, format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
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
  const [athleteSearch, setAthleteSearch] = useState("");

  // Form state
  const [bookingType, setBookingType] = useState("campo");
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedCoach, setSelectedCoach] = useState("");
  const [duration, setDuration] = useState(1);
  const [notes, setNotes] = useState("");

  // Available slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Filtered athletes based on search
  const filteredAthletes = useMemo(() => {
    if (!athleteSearch.trim()) return athletes;
    const search = athleteSearch.toLowerCase();
    return athletes.filter(
      (a) =>
        a.full_name.toLowerCase().includes(search) ||
        a.email.toLowerCase().includes(search)
    );
  }, [athletes, athleteSearch]);

  // Calendar days
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  // Validation
  const canSubmit = selectedAthlete && selectedDate && selectedCourt && selectedSlot &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoach));

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt, duration]);

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

    // Build occupied hours set with duration consideration
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
      
      // Check if all hours needed for this duration are available
      let available = true;
      const hoursNeeded = Math.ceil(duration);
      for (let i = 0; i < hoursNeeded; i++) {
        if (occupiedHours.has(hour + i) || (hour + hoursNeeded) > 22) {
          available = false;
          break;
        }
      }
      
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
    if (!selectedAthlete || !selectedDate || !selectedCourt || !selectedSlot) {
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
      const [hours, minutes] = selectedSlot.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(duration));
      endTime.setMinutes(startTime.getMinutes() + (duration % 1) * 60);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore nella creazione della prenotazione");
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/dashboard/admin/bookings"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Indietro</span>
          </Link>
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">Prenotazioni</p>
            <h1 className="text-2xl font-bold text-gray-900">Campi e lezioni private</h1>
            <p className="text-gray-600 text-sm mt-1">Seleziona giorno, campo e slot. Per le lezioni private scegli il maestro.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-5xl mx-auto px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="max-w-5xl mx-auto px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Successo</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          
          {/* Header Card con Navigazione e Filtri */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold mb-1">Calendario Prenotazioni</p>
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {format(selectedDate, "EEEE dd MMMM", { locale: it })}
                </h2>
              </div>
              
              {/* Navigazione Data */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-600 px-3 font-medium">Giorno prec.</span>
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 rotate-180" />
                </button>
              </div>
            </div>

            {/* Filtri: Atleta, Tipo, Campo, Durata */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Atleta Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Atleta</label>
                <div className="relative">
                  <select
                    value={selectedAthlete}
                    onChange={(e) => setSelectedAthlete(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleziona atleta</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.full_name}
                      </option>
                    ))}
                  </select>
                  <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Tipo Prenotazione */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo prenotazione</label>
                <select
                  value={bookingType}
                  onChange={(e) => setBookingType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {BOOKING_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Campo</label>
                <select
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleziona campo</option>
                  {COURTS.map((court) => (
                    <option key={court} value={court}>
                      {court}
                    </option>
                  ))}
                </select>
              </div>

              {/* Durata */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Durata</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1 ora</option>
                  <option value={1.5}>1.5 ore</option>
                  <option value={2}>2 ore</option>
                </select>
              </div>
            </div>

            {/* Maestro se necessario */}
            {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Maestro</label>
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleziona maestro</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Note */}
            {selectedAthlete && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Note (opzionale)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eventuali note o richieste particolari..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            )}
          </div>

          {/* Slot Orari Grid */}
          <div className="p-6">
            {!selectedCourt ? (
              <div className="text-center py-20">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 font-semibold">Seleziona un campo per vedere gli slot disponibili</p>
                <p className="text-sm text-gray-600 mt-2">Gli slot occupati sono disabilitati</p>
              </div>
            ) : loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mb-4" />
                <p className="text-gray-700 font-semibold">Caricamento slot disponibili...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <p className="text-sm text-gray-700 font-medium">
                    Seleziona uno slot disponibile (1h). Gli slot occupati sono disabilitati.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedSlot(slot.time)}
                      disabled={!slot.available}
                      className={`relative p-4 rounded-lg border transition-all ${
                        selectedSlot === slot.time
                          ? "bg-blue-600 border-blue-600 shadow-sm"
                          : slot.available
                          ? "bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-400"
                          : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className={`h-4 w-4 ${
                          selectedSlot === slot.time ? "text-white" : slot.available ? "text-gray-600" : "text-gray-400"
                        }`} />
                        <span className={`text-xl font-bold ${
                          selectedSlot === slot.time ? "text-white" : slot.available ? "text-gray-900" : "text-gray-400 line-through"
                        }`}>
                          {slot.time}
                        </span>
                      </div>
                      <p className={`text-xs font-medium ${
                        selectedSlot === slot.time ? "text-white/90" : slot.available ? "text-gray-700" : "text-gray-400"
                      }`}>
                        {selectedCourt}
                      </p>
                      {selectedSlot === slot.time && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bottom Action */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creazione in corso...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Conferma prenotazione</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}
