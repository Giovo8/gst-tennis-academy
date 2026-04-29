"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import { type UserRole } from "@/lib/roles";

interface Player {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string;
  role: UserRole;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface SelectedParticipant {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
}

interface BookingEntry {
  id: string;
  user_id?: string | null;
  coach_id?: string | null;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  user_profile?: {
    id: string;
    full_name: string;
    email?: string;
  } | null;
  coach_profile?: {
    id: string;
    full_name: string;
    email?: string;
  } | null;
  reason?: string;
  isBlock?: boolean;
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
  { value: "best_of_2", label: "Best of 2" },
  { value: "single_set", label: "Set Singolo" },
];

function normalizeMatchType(matchType?: string) {
  const normalized = (matchType || "").toLowerCase();
  if (normalized === "doppio" || normalized === "doubles") return "doubles";
  return "singles";
}

export default function AdminEditChallengePage() {
  const router = useRouter();
  const params = useParams();
  const challengeId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [matchType, setMatchType] = useState("singles");
  const [challengeType, setChallengeType] = useState("ranked");
  const [matchFormat, setMatchFormat] = useState("best_of_3");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState("Campo 1");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<BookingEntry[]>([]);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BookingEntry | null>(null);
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
    loadChallenge();
  }, [challengeId]);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  useEffect(() => {
    if (matchType === "singles" && selectedParticipants.length > 2) {
      setSelectedParticipants((previous) => previous.slice(0, 2));
    }
  }, [matchType, selectedParticipants]);

  async function loadPlayers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role")
        .in("role", ["atleta", "maestro"])
        .order("full_name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading players:", error);
    }
  }

  async function loadChallenge() {
    if (!challengeId) return;

    try {
      const response = await fetch(`/api/arena/challenges?challenge_id=${challengeId}`);
      if (response.ok) {
        const data = await response.json();
        const challenge = data.challenge;

        if (challenge) {
          const normalizedMatchType = normalizeMatchType(challenge.match_type);
          setSelectedParticipants([
            challenge.challenger
              ? {
                  userId: challenge.challenger.id,
                  fullName: challenge.challenger.full_name,
                  email: challenge.challenger.email,
                  phone: challenge.challenger.phone,
                  isRegistered: true,
                }
              : null,
            normalizedMatchType === "doubles" && challenge.my_partner
              ? {
                  userId: challenge.my_partner.id,
                  fullName: challenge.my_partner.full_name,
                  email: challenge.my_partner.email,
                  phone: challenge.my_partner.phone,
                  isRegistered: true,
                }
              : null,
            challenge.opponent
              ? {
                  userId: challenge.opponent.id,
                  fullName: challenge.opponent.full_name,
                  email: challenge.opponent.email,
                  phone: challenge.opponent.phone,
                  isRegistered: true,
                }
              : null,
            normalizedMatchType === "doubles" && challenge.opponent_partner
              ? {
                  userId: challenge.opponent_partner.id,
                  fullName: challenge.opponent_partner.full_name,
                  email: challenge.opponent_partner.email,
                  phone: challenge.opponent_partner.phone,
                  isRegistered: true,
                }
              : null,
          ].filter(Boolean) as SelectedParticipant[]);
          setMatchType(normalizedMatchType);
          setChallengeType(challenge.challenge_type || "ranked");
          setMatchFormat(challenge.match_format || "best_of_3");

          if (challenge.scheduled_date) {
            setSelectedDate(new Date(challenge.scheduled_date));
          }

          if (challenge.court) {
            setSelectedCourt(challenge.court);
          }

          // Salva l'ID della prenotazione associata
          if (challenge.booking_id) {
            setCurrentBookingId(challenge.booking_id);
          }

          // Calcola gli slot dalla prenotazione
          if (challenge.booking) {
            const start = new Date(challenge.booking.start_time);
            const end = new Date(challenge.booking.end_time);
            const initialSlots: string[] = [];
            const current = new Date(start);
            while (current < end) {
              const hours = current.getHours().toString().padStart(2, "0");
              const minutes = current.getMinutes().toString().padStart(2, "0");
              initialSlots.push(`${hours}:${minutes}`);
              current.setMinutes(current.getMinutes() + 30);
            }
            setSelectedSlots(initialSlots);
          }
        }
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
      setError("Errore nel caricamento della sfida");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableSlots() {
    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(selectedCourt)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      } else {
        generateDefaultSlots();
      }

      await loadExistingBookings();
    } catch (error) {
      console.error("Error loading slots:", error);
      generateDefaultSlots();
    } finally {
      setLoadingSlots(false);
    }
  }

  async function loadExistingBookings() {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, user_id, coach_id, start_time, end_time, type, status")
        .eq("court", selectedCourt)
        .neq("status", "cancelled")
        .gte("start_time", `${dateStr}T00:00:00`)
        .lte("start_time", `${dateStr}T23:59:59`);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: courtBlocks } = await supabase
        .from("court_blocks")
        .select("id, start_time, end_time, reason")
        .eq("court_id", selectedCourt)
        .eq("is_disabled", false)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

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

      // Filtra la prenotazione della sfida che si sta modificando
      const allBookings = [...enrichedBookings, ...blocksAsBookings].filter(
        booking => booking.id !== currentBookingId
      );

      setExistingBookings(allBookings);

      // Marca gli slot occupati come non disponibili
      setSlots(prevSlots => prevSlots.map(slot => {
        const isOccupied = allBookings.some(booking => {
          const start = new Date(booking.start_time);
          const end = new Date(booking.end_time);
          const [slotHour, slotMinute] = slot.time.split(':').map(Number);
          const slotDate = new Date(selectedDate);
          slotDate.setHours(slotHour, slotMinute, 0, 0);
          
          return slotDate >= start && slotDate < end;
        });
        
        return {
          ...slot,
          available: !isOccupied && slot.available
        };
      }));
    } catch (error) {
      console.error("Error loading existing bookings:", error);
      setExistingBookings([]);
    }
  }

  function generateDefaultSlots() {
    const timeSlots = [];
    for (let hour = 7; hour <= 21; hour++) {
      timeSlots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        available: true,
      });
      timeSlots.push({
        time: `${hour.toString().padStart(2, "0")}:30`,
        available: true,
      });
    }
    timeSlots.push({ time: "22:00", available: true });
    setSlots(timeSlots);
  }

  function handleSlotClick(time: string, available: boolean) {
    if (!available) return;

    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      }

      if (prev.length === 0) {
        return [time];
      }

      const allSlots = [...prev, time].sort((left, right) => {
        const [hoursLeft, minutesLeft] = left.split(":").map(Number);
        const [hoursRight, minutesRight] = right.split(":").map(Number);
        return hoursLeft * 60 + minutesLeft - (hoursRight * 60 + minutesRight);
      });

      for (let index = 1; index < allSlots.length; index += 1) {
        const [previousHours, previousMinutes] = allSlots[index - 1].split(":").map(Number);
        const [currentHours, currentMinutes] = allSlots[index].split(":").map(Number);
        const previousTotal = previousHours * 60 + previousMinutes;
        const currentTotal = currentHours * 60 + currentMinutes;

        if (currentTotal - previousTotal !== 30) {
          return [time];
        }
      }

      return allSlots;
    });
  }

  const handleCourtChange = (court: string) => {
    setSelectedCourt(court);
    setSelectedSlots([]);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlots([]);
  };

  async function handleSubmit() {
    setError("");
    setSuccess("");

    const challenger = selectedParticipants[0]?.userId || "";
    const myPartner = selectedParticipants[1]?.userId || "";
    const opponent = selectedParticipants[2]?.userId || "";
    const opponentPartner = selectedParticipants[3]?.userId || "";

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

    const unavailableSlots = selectedSlots.filter(slot => {
      const slotData = slots.find(s => s.time === slot);
      return !slotData || !slotData.available;
    });

    if (unavailableSlots.length > 0) {
      setError(`Gli slot selezionati non sono disponibili: ${unavailableSlots.join(", ")}`);
      return;
    }

    try {
      setSaving(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta");
      }

      // Calcola start e end time
      const firstSlot = selectedSlots[0];
      const lastSlot = selectedSlots[selectedSlots.length - 1];
      
      const [startHours, startMinutes] = firstSlot.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(startHours, startMinutes, 0, 0);

      const [endHours, endMinutes] = lastSlot.split(":").map(Number);
      const endTime = new Date(selectedDate);
      endTime.setHours(endHours, endMinutes + 30, 0, 0);

      const duration = selectedSlots.length * 30;

      // Aggiorna la sfida
      const response = await fetch(`/api/arena/challenges?challenge_id=${challengeId}`, {
        method: "PUT",
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'aggiornamento");
      }

      setSuccess("Sfida aggiornata con successo!");
      setTimeout(() => {
        router.push(`/dashboard/admin/arena/challenge/${challengeId}`);
      }, 1500);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Errore nell'aggiornamento");
    } finally {
      setSaving(false);
    }
  }

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

  function isSameCalendarDay(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getFullYear() === secondDate.getFullYear() && firstDate.getMonth() === secondDate.getMonth() && firstDate.getDate() === secondDate.getDate();
  }

  function openDatePickerModal() {
    const normalized = normalizeDate(selectedDate);
    setPendingDate(normalized);
    setCalendarViewDate(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((previous) => new Date(previous.getFullYear(), previous.getMonth() + delta, 1));
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

  function getBookingLabel(booking: BookingEntry): string {
    if (booking.isBlock) return "Blocco Campo";
    if (booking.type === "lezione_privata") return "Lezione Privata";
    if (booking.type === "lezione_gruppo") return "Lezione Gruppo";
    if (booking.type === "arena") return "Match Arena";
    return "Prenotazione Campo";
  }

  function formatEntryTimeRange(booking: BookingEntry): string {
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

  function getEntryStatusLabel(booking: BookingEntry): string {
    if (booking.isBlock) return "Campo bloccato";
    if (booking.status === "confirmed") return "Confermata";
    if (booking.status === "pending") return "In attesa";
    if (booking.status === "cancelled") return "Annullata";
    return booking.status;
  }

  function getEntryDetailsPath(booking: BookingEntry): string {
    return booking.isBlock
      ? `/dashboard/admin/courts/${booking.id}`
      : `/dashboard/admin/bookings/${booking.id}`;
  }

  function openEntryModal(booking: BookingEntry) {
    setSelectedEntry(booking);
    setEntryModalOpen(true);
  }

  function goToEntryDetails() {
    if (!selectedEntry) return;
    setEntryModalOpen(false);
    router.push(getEntryDetailsPath(selectedEntry));
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

  const challenger = selectedParticipants[0]?.userId || "";
  const opponent = selectedParticipants[2]?.userId || selectedParticipants[1]?.userId || "";

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
            <Link
              href={`/dashboard/admin/arena/challenge/${challengeId}`}
              className="hover:text-secondary/80 transition-colors"
            >
              Dettagli Sfida
            </Link>
            {" › "}
            <span>Modifica</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">Modifica Sfida</h1>
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
                  <span className="font-bold text-white text-lg leading-none text-center whitespace-nowrap">
                    {mobileDateLabel}
                  </span>
                </span>
                <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-2">
                  <Calendar className="h-5 w-5 text-white shrink-0" />
                  <span className="font-bold text-white text-lg leading-none text-left min-w-0 truncate max-w-none capitalize">
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
                    <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                      {Array.from({ length: 16 }, (_, index) => {
                        const hour = 7 + index;
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

                    <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                      {existingBookings.filter((booking) => booking.status !== "cancelled").map((booking) => {
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

                      {Array.from({ length: 16 }, (_, hourIndex) => {
                        const hour = 7 + hourIndex;
                        const time1 = `${hour.toString().padStart(2, '0')}:00`;
                        const time2 = hour < 22 ? `${hour.toString().padStart(2, '0')}:30` : null;
                        const slot1 = slots.find((slot) => slot.time === time1);
                        const slot2 = time2 ? slots.find((slot) => slot.time === time2) : null;
                        const available1 = slot1 ? slot1.available : false;
                        const available2 = slot2 ? slot2.available : false;
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

          {/* Bottone Salva */}
          <button
            onClick={handleSubmit}
            disabled={saving || !challenger || !opponent || selectedSlots.length === 0}
            className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
          >
            {saving ? (
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

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => selectCalendarDay(date)}
                      className={`h-9 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-secondary text-white font-semibold"
                          : isCurrentMonth
                          ? "text-gray-800 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
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
