"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Calendar, ChevronDown } from "lucide-react";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";

interface Booking {
  id: string;
  user_id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: string;
  coach_id?: string | null;
  notes: string | null;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  };
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
              <div className="px-3 py-2 text-xs text-secondary/40">Nessun risultato</div>
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

const COURTS = [
  "Campo 1",
  "Campo 2",
  "Campo 3",
  "Campo 4",
  "Campo 5",
  "Campo 6",
  "Campo 7",
  "Campo 8",
];

const BOOKING_TYPES = [
  { value: "campo", label: "Campo Libero" },
  { value: "lezione_privata", label: "Lezione Privata" },
  { value: "lezione_gruppo", label: "Lezione Gruppo" },
];

export default function AdminEditBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [bookingType, setBookingType] = useState<string>("campo");
  const [coaches, setCoaches] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError("Prenotazione non trovata");
      setLoading(false);
      return;
    }

    const loadBooking = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("bookings")
        .select("id, user_id, court, start_time, end_time, notes, type, coach_id")
        .eq("id", bookingId)
        .single();

      if (error) {
        setError("Errore nel caricamento della prenotazione");
      } else if (data) {
        let userProfile: { full_name: string | null; email: string | null } | undefined;

        // Carica i dati dell'atleta associato alla prenotazione
        if (data.user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", data.user_id)
            .single();

          if (profileData) {
            userProfile = {
              full_name: profileData.full_name ?? null,
              email: profileData.email ?? null,
            };
          }
        }

        setBooking({ ...(data as any), user_profile: userProfile } as Booking);
        setSelectedCourt(data.court);
        setBookingType(data.type || "campo");
        setSelectedCoach(data.coach_id || "");
        setSelectedDate(new Date(data.start_time));

        // Pre-compila gli slot selezionati a partire da start_time / end_time
        const existingStart = new Date(data.start_time);
        const existingEnd = new Date(data.end_time);
        const initialSlots: string[] = [];
        for (let h = existingStart.getHours(); h < existingEnd.getHours(); h++) {
          initialSlots.push(`${h.toString().padStart(2, "0")}:00`);
        }
        setSelectedSlots(initialSlots);

        setNotes(data.notes || "");
      }

      setLoading(false);
    };

    void loadBooking();
  }, [bookingId]);

  // Carica elenco maestri
  useEffect(() => {
    const loadCoaches = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "maestro")
        .order("full_name");

      if (data) {
        setCoaches(data as { id: string; full_name: string }[]);
      }
    };

    void loadCoaches();
  }, []);

  // Carica/aggiorna gli slot disponibili per la data e il campo selezionati
  useEffect(() => {
    const loadSlots = async () => {
      if (!bookingId || !selectedDate || !selectedCourt) return;

      setLoadingSlots(true);

      try {
        const dateStr = selectedDate.toISOString().split("T")[0];

        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("id, start_time, end_time, status")
          .eq("court", selectedCourt)
          .neq("status", "cancelled")
          .gte("start_time", `${dateStr}T00:00:00`)
          .lte("start_time", `${dateStr}T23:59:59`);

        const occupiedHours = new Set<number>();

        bookingsData?.forEach((b: any) => {
          // Ignora la prenotazione che stiamo modificando
          if (b.id === bookingId) return;
          const start = new Date(b.start_time).getHours();
          const end = new Date(b.end_time).getHours();
          for (let h = start; h < end; h++) {
            occupiedHours.add(h);
          }
        });

        const generatedSlots: TimeSlot[] = [];
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();

        for (let hour = 8; hour < 22; hour++) {
          const time = `${hour.toString().padStart(2, "0")}:00`;
          let available = !occupiedHours.has(hour);

          // Gli slot già selezionati per questa prenotazione rimangono sempre disponibili
          if (selectedSlots.includes(time)) {
            available = true;
          }

          // Se è oggi, i tempi passati (non selezionati) non sono prenotabili
          if (isToday && hour <= now.getHours() && !selectedSlots.includes(time)) {
            available = false;
          }

          generatedSlots.push({ time, available });
        }

        setSlots(generatedSlots);
      } finally {
        setLoadingSlots(false);
      }
    };

    void loadSlots();
  }, [bookingId, selectedDate, selectedCourt]);

  async function handleSave() {
    if (!bookingId) return;

    setSaving(true);
    setError(null);

    try {
      if (!selectedDate || !selectedCourt || selectedSlots.length === 0) {
        throw new Error("Seleziona giorno, campo e almeno uno slot orario");
      }

      const orderedSlots = [...selectedSlots].sort();
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      const durationHours = orderedSlots.length;
      endDate.setHours(startDate.getHours() + durationHours);

      const { error } = await supabase
        .from("bookings")
        .update({
          court: selectedCourt,
          type: bookingType || "campo",
          coach_id:
            bookingType === "lezione_privata" || bookingType === "lezione_gruppo"
              ? selectedCoach || null
              : null,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          notes: notes || null,
        })
        .eq("id", bookingId);

      if (error) throw error;

      setSuccess("Prenotazione aggiornata con successo!");
      setTimeout(() => {
        router.push("/dashboard/admin/bookings");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'aggiornamento della prenotazione"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!bookingId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">ID prenotazione mancante.</p>
        <Link href="/dashboard/admin/bookings" className="text-sm text-secondary underline">
          Torna alle prenotazioni
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/admin/bookings"
          className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
        >
          Prenotazioni
        </Link>
        <h1 className="text-3xl font-bold text-secondary">Modifica prenotazione</h1>
        <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
          Aggiorna giorno, campo, orari e note della prenotazione selezionata.
        </p>
      </div>

      {/* Messaggi */}
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Successo</p>
            <p className="text-sm text-emerald-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Info Atleta */}
          {booking && (
            <div>
              <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">
                Atleta
              </p>
              <h2 className="text-xl font-bold text-secondary flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span>{booking.user_profile?.full_name || "Nome non disponibile"}</span>
                {booking.user_profile?.email && (
                  <span
                    className="font-normal text-secondary/80"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {" - "}
                    {booking.user_profile.email}
                  </span>
                )}
              </h2>
            </div>
          )}

          {/* Selettore Data */}
          {selectedDate && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">
                  Seleziona Data
                </p>
                <h2 className="text-xl font-bold text-secondary capitalize">
                  {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDate) return;
                    setSelectedDate(addDays(selectedDate, -1));
                    setSelectedSlots([]);
                  }}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const [year, month, day] = value.split("-").map(Number);
                    const newDate = new Date(selectedDate);
                    newDate.setFullYear(year, month - 1, day);
                    setSelectedDate(newDate);
                    setSelectedSlots([]);
                  }}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDate) return;
                    setSelectedDate(addDays(selectedDate, 1));
                    setSelectedSlots([]);
                  }}
                  className="p-2 rounded-md bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors"
                >
                  <span className="text-lg font-semibold">&gt;</span>
                </button>
              </div>
            </div>
          )}

          {/* Tipo prenotazione + Campo + Maestro */}
          <div className="grid gap-4 md:grid-cols-3 mt-2">
            {/* Tipo prenotazione */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Tipo prenotazione *</label>
              <select
                value={bookingType}
                onChange={(e) => {
                  const value = e.target.value;
                  setBookingType(value);
                  if (value === "campo") {
                    setSelectedCoach("");
                  }
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
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
              <label className="block text-sm font-semibold text-secondary mb-2">Campo *</label>
              <select
                value={selectedCourt}
                onChange={(e) => {
                  setSelectedCourt(e.target.value);
                  setSelectedSlots([]);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              >
                {COURTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Maestro (quando necessario) */}
            {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
              <div>
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

          {/* Note */}
          <div className="mt-2">
            <label className="block text-sm font-semibold text-secondary mb-2">Note</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Aggiungi note opzionali..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
            />
          </div>

          {/* Griglia slot orari */}
          <div className="space-y-3 mt-2">
            <p className="text-sm font-semibold text-secondary">Orari disponibili</p>
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-secondary mb-3" />
                <p className="text-secondary font-semibold">Caricamento slot...</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => {
                      if (!slot.available) return;
                      setSelectedSlots((prev) => {
                        if (prev.includes(slot.time)) {
                          return prev.filter((t) => t !== slot.time);
                        }

                        if (prev.length === 0) {
                          return [slot.time];
                        }

                        const allSlots = [...prev, slot.time].sort();
                        for (let i = 1; i < allSlots.length; i++) {
                          const [hPrev] = allSlots[i - 1].split(":").map(Number);
                          const [hCurr] = allSlots[i].split(":").map(Number);
                          if (hCurr - hPrev !== 1) {
                            return [slot.time];
                          }
                        }

                        return allSlots;
                      });
                    }}
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
                      <span
                        className={`text-xl font-bold block ${
                          selectedSlots.includes(slot.time)
                            ? "text-white"
                            : slot.available
                            ? "text-secondary"
                            : "text-secondary/40"
                        }`}
                      >
                        {slot.time}
                      </span>
                      {!slot.available && !selectedSlots.includes(slot.time) && (
                        <span className="text-[10px] text-secondary/40 font-medium">
                          Occupato
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.push("/dashboard/admin/bookings")}
              className="px-6 py-2.5 text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-colors font-medium"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-white bg-secondary rounded-md hover:opacity-90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva Modifiche"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
