"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
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
  const [selectedCourt, setSelectedCourt] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedCoach, setSelectedCoach] = useState("");
  const [duration, setDuration] = useState(1);
  const [notes, setNotes] = useState("");

  // Available slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Validation
  const canSubmit = selectedDate && selectedCourt && selectedSlot &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoach));

  useEffect(() => {
    loadCoaches();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt, duration]);

  async function loadCoaches() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "maestro")
      .order("full_name");

    if (data) setCoaches(data);
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
    if (!selectedDate || !selectedCourt || !selectedSlot) {
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

      const [hours, minutes] = selectedSlot.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(duration));
      endTime.setMinutes(startTime.getMinutes() + (duration % 1) * 60);

      const bookingData = {
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
        router.push("/dashboard/atleta/bookings");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore nella creazione della prenotazione");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/atleta/bookings"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Torna alle prenotazioni</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2">
            Nuova Prenotazione
          </h1>
          <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>
            Seleziona giorno, campo e slot. Per le lezioni private scegli il maestro.
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Successo</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        
        {/* Header Card con Data */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold mb-1">Calendario Prenotazioni</p>
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
              </h2>
            </div>
            
            {/* Navigazione Data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-2 rounded-lg hover:bg-white/60 text-gray-700 transition-all"
                title="Giorno precedente"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white/60 rounded-lg transition-all"
              >
                Oggi
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 rounded-lg hover:bg-white/60 text-gray-700 transition-all"
                title="Giorno successivo"
              >
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tipo Prenotazione */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tipo prenotazione</label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
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
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Campo</label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
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
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Durata</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
              >
                <option value={1}>1 ora</option>
                <option value={1.5}>1.5 ore</option>
                <option value={2}>2 ore</option>
              </select>
            </div>

            {/* Maestro se necessario */}
            {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Maestro *</label>
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
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
          </div>

          {/* Note */}
          <div className="mt-4">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuali note o richieste particolari..."
              rows={2}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Slot Orari */}
        <div className="p-6">
          {!selectedCourt ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Seleziona un campo</h3>
              <p className="text-sm text-gray-600">
                Scegli un campo dal menu sopra per vedere gli slot disponibili
              </p>
            </div>
          ) : loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-700 font-semibold">Caricamento slot...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Slot disponibili
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-600"></div>
                    <span className="text-gray-600">Selezionato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border-2 border-gray-300"></div>
                    <span className="text-gray-600">Disponibile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-200"></div>
                    <span className="text-gray-600">Occupato</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available}
                    className={`relative p-4 rounded-xl border-2 transition-all font-semibold ${
                      selectedSlot === slot.time
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-blue-600 shadow-lg shadow-blue-200"
                        : slot.available
                        ? "bg-white border-gray-300 hover:border-blue-400 hover:shadow-md"
                        : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock className={`h-4 w-4 ${
                        selectedSlot === slot.time ? "text-white" : slot.available ? "text-gray-600" : "text-gray-400"
                      }`} />
                      <span className={`text-lg font-bold ${
                        selectedSlot === slot.time ? "text-white" : slot.available ? "text-gray-900" : "text-gray-400 line-through"
                      }`}>
                        {slot.time}
                      </span>
                    </div>
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
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg disabled:shadow-none text-base"
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
            <p className="text-xs text-gray-600 text-center mt-3">
              Completa tutti i campi per procedere
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
