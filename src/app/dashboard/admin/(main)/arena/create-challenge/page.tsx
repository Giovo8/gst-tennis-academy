"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
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

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];
const MATCH_TYPES = [
  { value: "singles", label: "Singolo" },
  { value: "doubles", label: "Doppio" },
];
const CHALLENGE_TYPES = [
  { value: "ranked", label: "Classificata" },
  { value: "amichevole", label: "Amichevole" },
];
const MATCH_FORMATS = [
  { value: "best_of_3", label: "Best of 3" },
  { value: "best_of_5", label: "Best of 5" },
  { value: "best_of_1", label: "Set Singolo" },
];

export default function CreateChallengePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenger, setChallenger] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchType, setMatchType] = useState("singles");
  const [challengeType, setChallengeType] = useState("ranked");
  const [matchFormat, setMatchFormat] = useState("best_of_3");
  const [myPartner, setMyPartner] = useState("");
  const [opponentPartner, setOpponentPartner] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState("Campo 1");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPlayers();
    loadAvailableSlots(); // Carica gli slot immediatamente
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  async function loadPlayers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("role", ["atleta", "maestro"])
        .order("full_name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
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

    const allItems = [...enrichedBookings, ...blocksAsBookings];
    setExistingBookings(allItems);

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
    const generatedSlots: { time: string; available: boolean }[] = [];
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


  function handleSlotClick(time: string, available: boolean) {
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
  }

  const handleCourtChange = (court: string) => {
    setSelectedCourt(court);
    setSelectedSlots([]); // Reset slot selezionati quando cambia il campo
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlots([]); // Reset slot selezionati quando cambia la data
  };

  async function handleSubmit() {
    setError("");
    setSuccess("");

    // Validation
    if (!challenger || !opponent) {
      setError("Seleziona sia lo sfidante che lo sfidato");
      return;
    }

    if (challenger === opponent) {
      setError("Lo sfidante e lo sfidato devono essere persone diverse");
      return;
    }

    if (matchType === "doubles" && (!myPartner || !opponentPartner)) {
      setError("Per il doppio devi selezionare i partner di entrambe le coppie");
      return;
    }

    if (selectedSlots.length === 0) {
      setError("Seleziona almeno uno slot orario");
      return;
    }

    // Verifica che tutti gli slot selezionati siano disponibili
    const unavailableSlots = selectedSlots.filter(slot => {
      const slotData = slots.find(s => s.time === slot);
      return !slotData || !slotData.available;
    });

    if (unavailableSlots.length > 0) {
      setError(`Gli slot selezionati non sono più disponibili: ${unavailableSlots.join(", ")}. Ricarica la pagina.`);
      return;
    }

    try {
      setSending(true);

      // Get session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta, effettua di nuovo il login.");
      }

      // Calculate start and end times
      const firstSlot = selectedSlots[0];
      const lastSlot = selectedSlots[selectedSlots.length - 1];
      
      const [startHours, startMinutes] = firstSlot.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(startHours, startMinutes, 0, 0);

      const [endHours, endMinutes] = lastSlot.split(":").map(Number);
      const endTime = new Date(selectedDate);
      endTime.setHours(endHours, endMinutes + 30, 0, 0); // +30 minuti per completare l'ultimo slot

      const duration = selectedSlots.length * 30; // Ogni slot è 30 minuti

      // Create booking
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: challenger,
          court: selectedCourt,
          type: "campo",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending",
          manager_confirmed: false,
          notes: `Sfida Arena (creata da admin): ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singles" ? "Singolo" : "Doppio"} - ${matchFormat.replace("_", " ")}`,
        }),
      });

      if (!bookingResponse.ok) {
        const bookingError = await bookingResponse.json();
        throw new Error(bookingError.error || "Errore nella prenotazione del campo");
      }

      const bookingData = await bookingResponse.json();

      // Create challenge
      const challengeResponse = await fetch("/api/arena/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenger_id: challenger,
          opponent_id: opponent,
          scheduled_date: startTime.toISOString(),
          court: selectedCourt,
          match_format: matchFormat,
          duration_minutes: duration,
          match_type: matchType === "singles" ? "singolo" : "doppio",
          challenge_type: challengeType,
          my_partner_id: matchType === "doubles" ? myPartner : null,
          opponent_partner_id: matchType === "doubles" ? opponentPartner : null,
          booking_id: bookingData.booking?.id,
          message: message.trim() || "Sfida creata dall'amministratore",
        }),
      });

      if (!challengeResponse.ok) {
        const challengeError = await challengeResponse.json();
        throw new Error(challengeError.error || "Errore nella creazione della sfida");
      }

      setSuccess("Sfida creata con successo!");
      setTimeout(() => {
        router.push("/dashboard/admin/arena");
      }, 1500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split("T")[0];
  };

  const availablePartners = players.filter(
    (p) => p.id !== challenger && p.id !== opponent && p.id !== myPartner && p.id !== opponentPartner
  );

  const playerOptions: SearchableOption[] = players.map((player) => ({
    value: player.id,
    label: `${player.full_name} (${player.role})`,
  }));

  const partnerOptions: SearchableOption[] = availablePartners.map((player) => ({
    value: player.id,
    label: player.full_name,
  }));

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
      <div className="flex flex-col gap-2">
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/arena"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Arena
            </Link>
            <span className="mx-2">›</span>
            <span>Crea Sfida</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">Crea sfida</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Seleziona giocatori, data e slot.
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
          {/* Selettore Data */}
          <div className="rounded-lg p-4 flex items-center justify-between transition-all bg-secondary">
            <button
              onClick={() => handleDateChange(addDays(selectedDate, -1))}
              className="p-2 rounded-md transition-colors hover:bg-white/10"
            >
              <span className="text-lg font-semibold text-white">&lt;</span>
            </button>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('date-picker') as HTMLInputElement;
                  if (input) input.showPicker();
                }}
                className="p-2 rounded-md transition-colors hover:bg-white/10"
                title="Scegli data"
              >
                <Calendar className="h-5 w-5 text-white" />
              </button>
              <input
                id="date-picker"
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                min={getMinDate()}
                max={getMaxDate()}
                className="absolute opacity-0 pointer-events-none"
              />
              <h2 className="text-lg font-bold capitalize text-white">
                {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
              </h2>
            </div>

            <button
              onClick={() => handleDateChange(addDays(selectedDate, 1))}
              className="p-2 rounded-md transition-colors hover:bg-white/10"
            >
              <span className="text-lg font-semibold text-white">&gt;</span>
            </button>
          </div>

          {/* Area Principale */}
          <div className="bg-white rounded-xl p-6 space-y-6">
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
                    <h2 className="text-lg font-semibold text-secondary">Dettagli sfida</h2>
                  </div>

                  {/* Dettagli sfida - stile form moderno */}
                  <div className="space-y-6 mt-6">
                    {/* Sfidante */}
                    <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                      <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Sfidante *</label>
                      <div className="flex-1">
                        <SearchableSelect
                          value={challenger}
                          onChange={setChallenger}
                          options={playerOptions}
                          placeholder="Seleziona sfidante"
                          searchPlaceholder="Cerca giocatore..."
                        />
                      </div>
                    </div>

                    {/* Sfidato */}
                    <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                      <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Sfidato *</label>
                      <div className="flex-1">
                        <SearchableSelect
                          value={opponent}
                          onChange={setOpponent}
                          options={playerOptions.filter(p => p.value !== challenger)}
                          placeholder="Seleziona sfidato"
                          searchPlaceholder="Cerca giocatore..."
                        />
                      </div>
                    </div>

                    {/* Tipo Match */}
                    <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                      <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo match *</label>
                      <div className="flex-1 flex gap-3">
                        {MATCH_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setMatchType(type.value)}
                            className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                              matchType === type.value
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Partners se doppio */}
                    {matchType === "doubles" && (
                      <>
                        <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                          <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Partner sfidante</label>
                          <div className="flex-1">
                            <SearchableSelect
                              value={myPartner}
                              onChange={setMyPartner}
                              options={partnerOptions.filter(p => p.value !== opponentPartner)}
                              placeholder="Seleziona partner"
                              searchPlaceholder="Cerca partner..."
                            />
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                          <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Partner sfidato</label>
                          <div className="flex-1">
                            <SearchableSelect
                              value={opponentPartner}
                              onChange={setOpponentPartner}
                              options={partnerOptions.filter(p => p.value !== myPartner)}
                              placeholder="Seleziona partner"
                              searchPlaceholder="Cerca partner..."
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Tipo Sfida */}
                    <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                      <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo sfida *</label>
                      <div className="flex-1 flex gap-3">
                        {CHALLENGE_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setChallengeType(type.value)}
                            className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                              challengeType === type.value
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Formato Match */}
                    <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                      <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Formato match *</label>
                      <div className="flex-1 flex gap-3">
                        {MATCH_FORMATS.map((format) => (
                          <button
                            key={format.value}
                            type="button"
                            onClick={() => setMatchFormat(format.value)}
                            className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                              matchFormat === format.value
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {format.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campo */}
                    <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                      <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                      <div className="flex-1 flex gap-3 flex-wrap">
                        {COURTS.map((court) => (
                          <button
                            key={court}
                            type="button"
                            onClick={() => handleCourtChange(court)}
                            className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                              selectedCourt === court
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {court}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-secondary mt-6 mb-2">Orari disponibili</p>
                  
                  {/* Timeline orizzontale stile bookings */}
                  <div className="overflow-x-auto scrollbar-hide">
                    <div style={{ minWidth: 'min(100%, 1280px)' }} className="md:min-w-[1280px]">
                      {/* Header con orari */}
                      <div className="grid grid-cols-[repeat(16,_minmax(60px,_1fr))] md:grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg mb-3">
                        {Array.from({ length: 16 }, (_, i) => {
                          const hour = 7 + i;
                          return (
                            <div
                              key={hour}
                              className="p-1.5 sm:p-2 md:p-3 text-center font-bold text-secondary text-[10px] sm:text-xs flex items-center justify-center"
                            >
                              {hour.toString().padStart(2, '0')}:00
                            </div>
                          );
                        })}
                      </div>

                      {/* Griglia slot selezionabili (ogni colonna divisa in due slot da 30 min) */}
                      <div className="grid grid-cols-[repeat(16,_minmax(60px,_1fr))] md:grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
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
                              className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md mx-0.5 my-1.5 z-10 pointer-events-none"
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
                          const slot1 = slots.find(s => s.time === time1);
                          const slot2 = time2 ? slots.find(s => s.time === time2) : null;
                          const available1 = slot1 ? slot1.available : false;
                          const available2 = slot2 ? slot2.available : false;
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
                                onClick={() => handleSlotClick(time1, available1)}
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
                                onClick={() => handleSlotClick(time1, available1)}
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
                                onClick={() => handleSlotClick(time2, available2)}
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
            disabled={sending || !challenger || !opponent || selectedSlots.length === 0}
            className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
          >
            {sending ? (
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
