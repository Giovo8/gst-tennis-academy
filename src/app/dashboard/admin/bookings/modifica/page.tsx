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

interface ExistingBooking {
  id: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  user_id?: string;
  coach_id?: string;
  user_profile?: { full_name: string | null } | null;
  coach_profile?: { full_name: string | null } | null;
  isBlock?: boolean;
  reason?: string;
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
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
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

        // Pre-compila gli slot selezionati a partire da start_time / end_time (ogni 30 min)
        const existingStart = new Date(data.start_time);
        const existingEnd = new Date(data.end_time);
        console.log("📅 Prenotazione caricata:", {
          id: data.id,
          start: existingStart.toISOString(),
          end: existingEnd.toISOString(),
          duration: (existingEnd.getTime() - existingStart.getTime()) / (1000 * 60) + " minuti"
        });
        const initialSlots: string[] = [];
        let current = new Date(existingStart);
        while (current < existingEnd) {
          const hours = current.getHours().toString().padStart(2, "0");
          const minutes = current.getMinutes().toString().padStart(2, "0");
          initialSlots.push(`${hours}:${minutes}`);
          current.setMinutes(current.getMinutes() + 30);
        }
        console.log("🕐 Slot selezionati:", initialSlots);
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

        // Get existing bookings for this court and date
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("id, start_time, end_time, status, type, user_id, coach_id")
          .eq("court", selectedCourt)
          .neq("status", "cancelled")
          .gte("start_time", `${dateStr}T00:00:00`)
          .lte("start_time", `${dateStr}T23:59:59`);

        // Get court blocks for this court and date
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: blocksData } = await supabase
          .from("court_blocks")
          .select("id, start_time, end_time, reason")
          .eq("court_id", selectedCourt)
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString());

        // Fetch profiles for bookings
        const userIds = [...new Set([
          ...(bookingsData?.map(b => b.user_id) || []),
          ...(bookingsData?.map(b => b.coach_id).filter(Boolean) || [])
        ])];

        let profilesMap = new Map();
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          profilesData?.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }

        // Enrich bookings with profiles
        const enrichedBookings = bookingsData?.map((b: any) => ({
          id: b.id,
          start_time: b.start_time,
          end_time: b.end_time,
          type: b.type,
          status: b.status,
          user_id: b.user_id,
          coach_id: b.coach_id,
          user_profile: b.user_id ? profilesMap.get(b.user_id) : undefined,
          coach_profile: b.coach_id ? profilesMap.get(b.coach_id) : undefined,
        })) || [];

        // Add court blocks as fake bookings for visualization
        const blocksAsBookings = blocksData?.map((block: any) => ({
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

        const allBookings: ExistingBooking[] = [...enrichedBookings, ...blocksAsBookings];

        setExistingBookings(allBookings);

        const occupiedSlots = new Set<string>();

        // Mark slots occupied by bookings and blocks
        allBookings.forEach((b) => {
          // Ignora la prenotazione che stiamo modificando
          if (b.id === bookingId && !b.isBlock) return;

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
      } finally {
        setLoadingSlots(false);
      }
    };

    void loadSlots();
  }, [bookingId, selectedDate, selectedCourt]);

  // Verifica disponibilità slot
  const isSlotAvailable = (time: string): boolean => {
    if (!selectedCourt) return true;
    const slot = slots.find(s => s.time === time);
    // Gli slot selezionati sono sempre disponibili
    if (selectedSlots.includes(time)) return true;
    return slot ? slot.available : false;
  };

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

  async function handleSave() {
    if (!bookingId) return;

    setSaving(true);
    setError(null);

    try {
      if (!selectedDate || !selectedCourt || selectedSlots.length === 0) {
        throw new Error("Seleziona giorno, campo e almeno uno slot orario");
      }

      const orderedSlots = [...selectedSlots].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      const durationMinutes = orderedSlots.length * 30; // ogni slot dura 30 minuti
      endDate.setMinutes(startDate.getMinutes() + durationMinutes);

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
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/bookings"
              className="hover:text-secondary/80 transition-colors"
            >
              Prenotazioni
            </Link>
            <span className="mx-2">›</span>
            <span>Modifica Prenotazione</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">Modifica prenotazione</h1>
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
            <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Successo</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="py-4">
          <div className="space-y-6">
            {/* Selettore Data */}
            {selectedDate && (
              <div className="rounded-lg p-4 flex items-center justify-between transition-all bg-secondary">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDate) return;
                    setSelectedDate(addDays(selectedDate, -1));
                    setSelectedSlots([]);
                  }}
                  className="p-2 rounded-md transition-colors hover:bg-white/10"
                >
                  <span className="text-lg font-semibold text-white">&lt;</span>
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (dateInputRef.current) {
                        dateInputRef.current.click();
                      }
                    }}
                    className="p-2 rounded-md transition-colors hover:bg-white/10"
                    title="Scegli data"
                  >
                    <Calendar className="h-5 w-5 text-white" />
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
                    className="absolute opacity-0 pointer-events-none"
                  />
                  <h2 className="text-lg font-bold capitalize text-white">
                    {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDate) return;
                    setSelectedDate(addDays(selectedDate, 1));
                    setSelectedSlots([]);
                  }}
                  className="p-2 rounded-md transition-colors hover:bg-white/10"
                >
                  <span className="text-lg font-semibold text-white">&gt;</span>
                </button>
              </div>
            )}

            {/* Area Principale */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
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
                      {/* Atleta (read-only) */}
                      {booking && (
                        <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                          <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Atleta</label>
                          <div className="flex-1">
                            <div className="text-secondary font-semibold">
                              {booking.user_profile?.full_name || "Nome non disponibile"}
                              {booking.user_profile?.email && (
                                <span className="text-secondary/60 font-normal ml-2">
                                  ({booking.user_profile.email})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tipo prenotazione */}
                      <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                        <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo prenotazione *</label>
                        <div className="flex-1 flex gap-3">
                          {BOOKING_TYPES.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => {
                                setBookingType(type.value);
                                if (type.value === "campo") {
                                  setSelectedCoach("");
                                }
                              }}
                              className={`px-5 py-2 text-sm rounded-lg border transition-all ${
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
                      <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                        <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                        <div className="flex-1 flex gap-3">
                          {COURTS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setSelectedCourt(c);
                                setSelectedSlots([]);
                              }}
                              className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                                selectedCourt === c
                                  ? 'bg-secondary text-white border-secondary'
                                  : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Maestro se necessario */}
                      {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
                        <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                          <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Maestro *</label>
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
                      <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                        <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Note</label>
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
                    
                    {/* Timeline orizzontale stile bookings */}
                    <div className="overflow-x-auto scrollbar-hide">
                      <div style={{ minWidth: '1280px' }}>
                        {/* Header con orari */}
                        <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg mb-3">
                          {Array.from({ length: 16 }, (_, i) => {
                            const hour = 7 + i;
                            return (
                              <div
                                key={hour}
                                className="p-3 text-center font-bold text-secondary text-xs flex items-center justify-center"
                              >
                                {hour.toString().padStart(2, '0')}:00
                              </div>
                            );
                          })}
                        </div>

                        {/* Griglia slot selezionabili (ogni colonna divisa in due slot da 30 min) */}
                        <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                          {/* Prenotazioni esistenti come blocchi sovrapposti */}
                          {existingBookings.map((booking) => {
                            // Ignora la prenotazione che stiamo modificando
                            if (booking.id === bookingId && !booking.isBlock) return null;

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

            {/* Bottone Salva */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
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
        </div>
      )}

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}
