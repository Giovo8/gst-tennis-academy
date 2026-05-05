"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { type UserRole } from "@/lib/roles";

interface Player {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string;
  role: UserRole;
}

interface SelectedParticipant {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
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
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [matchType, setMatchType] = useState("singles");
  const [challengeType, setChallengeType] = useState("ranked");
  const [matchFormat, setMatchFormat] = useState("best_of_3");
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
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  
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

  useEffect(() => {
    loadPlayers();
    loadAvailableSlots(); // Carica gli slot immediatamente
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  useEffect(() => {
    if (matchType === "singles" && selectedParticipants.length > 2) {
      setSelectedParticipants((prev) => prev.slice(0, 2));
    }
  }, [matchType, selectedParticipants]);

  async function loadPlayers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role, metadata")
        .in("role", ["atleta", "maestro", "admin", "gestore"])
        .order("full_name");

      if (error) throw error;

      const filtered = (data || []).filter((p) => {
        if (p.role === "atleta" || p.role === "maestro") return true;
        // admin/gestore: include only if they have "maestro" in secondary_roles
        const secondaryRoles = (p.metadata as { secondary_roles?: unknown } | null)?.secondary_roles;
        return Array.isArray(secondaryRoles) && secondaryRoles.map(String).includes("maestro");
      });

      setPlayers(filtered);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoadingSlots(true);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    const startOfDayIso = startOfDay.toISOString();
    const endOfDayIso = endOfDay.toISOString();

    // Get existing bookings for this court and date
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, user_id, coach_id, start_time, end_time, type, status")
      .eq("court", selectedCourt)
      .neq("status", "cancelled")
      .lt("start_time", endOfDayIso)
      .gt("end_time", startOfDayIso);

    // Get court blocks for this court and date
    const { data: courtBlocks } = await supabase
      .from("court_blocks")
      .select("id, start_time, end_time, reason")
      .eq("court_id", selectedCourt)
      .eq("is_disabled", false)
      .lt("start_time", endOfDayIso)
      .gt("end_time", startOfDayIso);

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
      const current = new Date(start);
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
      const current = new Date(start);
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
      for (const minute of [0, 30]) {
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

  // Verifica disponibilità slot
  const isSlotAvailable = (time: string): boolean => {
    if (!selectedCourt) return true;
    const slot = slots.find(s => s.time === time);
    return slot ? slot.available : false;
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlots([]); // Reset slot selezionati quando cambia la data
  };

  async function handleSubmit() {
    setError("");
    setSuccess("");

    const challenger = selectedParticipants[0]?.userId || "";
    const myPartner = selectedParticipants[1]?.userId || "";
    const opponent = selectedParticipants[2]?.userId || "";
    const opponentPartner = selectedParticipants[3]?.userId || "";

    // Validation
    if (!challenger || !opponent) {
      setError("Seleziona sia lo sfidante che lo sfidato");
      return;
    }

    if (challenger === opponent) {
      setError("Lo sfidante e lo sfidato devono essere persone diverse");
      return;
    }

    if (matchType === "doubles" && selectedParticipants.length < 4) {
      setError("Per il doppio devi selezionare 4 partecipanti (2 coppie)");
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
          status: "confirmed",
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate;
  };

  const WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return { date, isCurrentMonth: date.getMonth() === calendarViewDate.getMonth() };
    });
  }, [calendarViewDate]);

  function normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function openDatePickerModal() {
    const normalized = normalizeDate(selectedDate);
    setPendingDate(normalized);
    setCalendarViewDate(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    const normalized = normalizeDate(day);
    setPendingDate(normalized);
    setCalendarViewDate(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
  }

  function applyDateSelection() {
    setSelectedDate(normalizeDate(pendingDate));
    setSelectedSlots([]);
    setDatePickerModalOpen(false);
  }

  function handleDatePickerToday() {
    const today = normalizeDate(new Date());
    setPendingDate(today);
    setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function getCalendarMonthLabel(date: Date): string {
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function getBookingLabel(booking: any): string {
    if (booking.isBlock) return "Blocco Campo";
    if (booking.type === "lezione_privata") return "Lezione Privata";
    if (booking.type === "lezione_gruppo") return "Lezione Gruppo";
    if (booking.type === "arena") return "Match Arena";
    return "Prenotazione Campo";
  }

  function formatEntryTimeRange(booking: any): string {
    const start = new Date(booking.start_time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const end = new Date(booking.end_time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${start} - ${end}`;
  }

  function getEntryStatusLabel(booking: any): string {
    if (booking.isBlock) return "Campo bloccato";
    if (booking.status === "confirmed") return "Confermata";
    if (booking.status === "pending") return "In attesa";
    if (booking.status === "cancelled") return "Annullata";
    return booking.status;
  }

  function getEntryDetailsPath(booking: any): string {
    return booking.isBlock
      ? `/dashboard/admin/courts/${booking.id}`
      : `/dashboard/admin/bookings/${booking.id}`;
  }

  function openEntryModal(booking: any) {
    setSelectedEntry(booking);
    setEntryModalOpen(true);
  }

  function goToEntryDetails() {
    if (!selectedEntry) return;
    setEntryModalOpen(false);
    router.push(getEntryDetailsPath(selectedEntry));
  }

  const challenger = selectedParticipants[0]?.userId || "";
  const opponent = selectedParticipants[1]?.userId || "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  const fullDateLabel = (() => {
    const value = format(selectedDate, "EEEE dd MMMM yyyy", { locale: it });
    return value.charAt(0).toUpperCase() + value.slice(1);
  })();
  const mobileWeekdayLabel = format(selectedDate, "EEE", { locale: it });
  const mobileDateLabel = (() => {
    const raw = `${mobileWeekdayLabel.slice(0, 1).toUpperCase()}${mobileWeekdayLabel.slice(1, 3).toLowerCase()} ${format(selectedDate, "dd MMM yyyy", { locale: it })}`;
    return raw.replace(/(\d{2} )(\w)/, (_, day, char) => day + char.toUpperCase());
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link
              href="/dashboard/admin/arena"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Arena
            </Link>
            {" › "}
            <span>Crea Sfida</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">Crea Sfida</h1>
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
      <div>
        <div className="space-y-6">
          {/* Selettore Data */}
          <div className="relative rounded-lg p-3 sm:p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center transition-all bg-secondary">
            <button
              onClick={() => handleDateChange(addDays(selectedDate, -1))}
              className="relative z-10 justify-self-start h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
            >
              <span className="text-lg font-semibold text-white">&lt;</span>
            </button>

            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center sm:static sm:inset-auto sm:translate-x-0 sm:min-w-0 sm:justify-center">
              <button
                type="button"
                onClick={openDatePickerModal}
                className="relative inline-flex items-center justify-center rounded-md px-1.5 sm:px-2 py-1 transition-colors hover:bg-white/10"
                title="Scegli data"
              >
                <span className="inline-flex items-center justify-center sm:hidden" style={{ gap: "6px" }}>
                  <Calendar className="h-5 w-5 text-white shrink-0" />
                  <span
                    className="font-bold text-white text-lg leading-none text-center whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-urbanist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                  >
                    {mobileDateLabel}
                  </span>
                </span>
                <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-2">
                  <Calendar className="h-5 w-5 text-white shrink-0" />
                  <span
                    className="font-bold text-white text-lg leading-none text-left min-w-0 truncate max-w-none capitalize"
                    style={{ fontFamily: 'var(--font-urbanist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                  >
                    {fullDateLabel}
                  </span>
                </span>
              </button>
            </div>

            <button
              onClick={() => handleDateChange(addDays(selectedDate, 1))}
              className="relative z-10 justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
            >
              <span className="text-lg font-semibold text-white">&gt;</span>
            </button>
          </div>

          {/* Area Principale */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli sfida</h2>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-secondary mb-3" />
                  <p className="text-secondary font-semibold">Caricamento...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {/* Tipo Match */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo match *</label>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {MATCH_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setMatchType(type.value)}
                            className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
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

                    {/* Tipo Sfida */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo sfida *</label>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {CHALLENGE_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setChallengeType(type.value)}
                            className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
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
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Formato match *</label>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {MATCH_FORMATS.map((format) => (
                          <button
                            key={format.value}
                            type="button"
                            onClick={() => setMatchFormat(format.value)}
                            className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
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
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                      <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                        {COURTS.map((court) => (
                          <button
                            key={court}
                            type="button"
                            onClick={() => handleCourtChange(court)}
                            className={`px-4 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
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

                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
            </div>
            <div className="p-4 sm:p-6">
              <AthletesSelector
                athletes={players}
                selectedAthletes={selectedParticipants}
                onAthleteAdd={(participant) => {
                  const maxAthletes = matchType === "doubles" ? 4 : 2;
                  if (selectedParticipants.length >= maxAthletes) return;
                  setSelectedParticipants([...selectedParticipants, participant]);
                }}
                onAthleteRemove={(index) => {
                  setSelectedParticipants(selectedParticipants.filter((_, currentIndex) => currentIndex !== index));
                }}
                participantToneByIndex={(index) => {
                  if (matchType === "doubles") {
                    return index === 2 || index === 3 ? "dark" : "secondary";
                  }

                  return index === 1 ? "dark" : "secondary";
                }}
                selectedDisplayOrder={
                  matchType === "doubles"
                    ? [0, 1, 2, 3]
                    : [0, 1]
                }
                maxAthletes={matchType === "doubles" ? 4 : 2}
                allowGuestParticipants={false}
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Orari disponibili</h2>
            </div>
            <div className="p-4 sm:p-6">
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                  <p className="text-secondary font-semibold">Caricamento slot...</p>
                </div>
              ) : (
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

                    {/* Griglia slot selezionabili (ogni colonna divisa in due slot da 30 min) */}
                    <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                        {/* Prenotazioni esistenti come blocchi sovrapposti */}
                          {existingBookings.filter((booking) => booking.status !== "cancelled").map((booking) => {
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
                              return { background: "var(--color-frozen-lake-900)" };
                            }
                            switch (booking.type) {
                              case "lezione_privata":
                              case "lezione_gruppo":
                                return { background: "#023047" };
                              case "campo":
                                return { background: "var(--secondary)" };
                              case "arena":
                                return { background: "var(--color-frozen-lake-600)" };
                              default:
                                return { background: "var(--secondary-light)" };
                            }
                          };
                          
                          return (
                            <div
                              key={booking.id}
                              onClick={() => openEntryModal(booking)}
                              className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md z-10 cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                ...getBookingStyle(),
                                left: `${(startSlot / 32) * 100}%`,
                                width: `calc(${(duration / 32) * 100}% - 4px)`,
                                top: '4px',
                                bottom: '4px',
                                marginLeft: '2px'
                              }}
                              title="Clicca per vedere i dettagli"
                            />
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
                                onClick={() => handleSlotClick(time1, available1)}
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
                                onClick={() => handleSlotClick(time1, available1)}
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
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
            </div>
            <div className="p-4 sm:p-6">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Eventuali note..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
              />
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
              <span>Conferma Sfida</span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />

      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Seleziona Data</ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese precedente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {getCalendarMonthLabel(calendarViewDate)}
                </p>
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {WEEK_DAYS.map((day) => (
                  <span key={day} className="py-1">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, pendingDate);
                  const isTodayDate = isSameCalendarDay(date, new Date());
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const maxDate = getMaxDate(); maxDate.setHours(23, 59, 59, 999);
                  const normalizedDay = new Date(date); normalizedDay.setHours(12, 0, 0, 0);
                  const isDisabled = normalizedDay < today || normalizedDay > maxDate;

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => !isDisabled && selectCalendarDay(date)}
                      disabled={isDisabled}
                      className={`h-9 rounded-md text-sm transition-colors ${
                        isDisabled
                          ? "text-gray-300 cursor-not-allowed"
                          : isSelected
                          ? "bg-secondary text-white font-semibold"
                          : isCurrentMonth
                          ? "text-gray-800 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && !isDisabled && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={handleDatePickerToday}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={applyDateSelection}
              className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <ModalContent size="md" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-base sm:text-lg">
              {selectedEntry ? getBookingLabel(selectedEntry) : "Dettaglio Prenotazione"}
            </ModalTitle>
          </ModalHeader>

          <ModalBody className="px-0 py-0 bg-white dark:!bg-white">
            {selectedEntry && (
              <div className="text-sm bg-white dark:!bg-white divide-y divide-gray-200">
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Campo</span>
                  <span className="text-xs text-gray-600">{selectedCourt}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Orario</span>
                  <span className="text-xs text-gray-600">{formatEntryTimeRange(selectedEntry)}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Stato</span>
                  <span className="text-xs text-gray-600">{getEntryStatusLabel(selectedEntry)}</span>
                </div>

                {!selectedEntry.isBlock && selectedEntry.user_profile?.full_name && (
                  <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                    <span className="text-xs font-semibold text-gray-900">Partecipante</span>
                    <span className="text-xs text-gray-600">{selectedEntry.user_profile.full_name}</span>
                  </div>
                )}

                {!selectedEntry.isBlock && selectedEntry.coach_profile?.full_name && (
                  <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                    <span className="text-xs font-semibold text-gray-900">Coach</span>
                    <span className="text-xs text-gray-600">{selectedEntry.coach_profile.full_name}</span>
                  </div>
                )}

                {selectedEntry.reason && (
                  <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                    <span className="text-xs font-semibold text-gray-900">Note</span>
                    <span className="text-xs text-gray-600">{selectedEntry.reason}</span>
                  </div>
                )}
              </div>
            )}
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={goToEntryDetails}
              className="w-full py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-b-lg"
            >
              Vai ai dettagli
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
