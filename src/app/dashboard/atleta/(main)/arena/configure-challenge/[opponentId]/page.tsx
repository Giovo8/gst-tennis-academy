"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { getClosingMinutes, getCourtHoursLabel } from "@/lib/bookings/bookingTimeRestrictions";
import {
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
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

interface OpponentProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
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

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];

const MATCH_TYPES = [
  { value: "singolo", label: "Singolo" },
  { value: "doppio", label: "Doppio" },
];

const CHALLENGE_TYPES = [
  { value: "ranked", label: "Classificata" },
  { value: "amichevole", label: "Amichevole" },
];

const MATCH_FORMATS = [
  { value: "best_of_1", label: "Set Singolo" },
  { value: "best_of_3", label: "Best of 3" },
  { value: "best_of_5", label: "Best of 5" },
];

const WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

export default function ConfigureChallengePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/arena")[0];
  const opponentId = params.opponentId as string;
  const editChallengeId = searchParams.get("edit");
  const isCounterProposal = searchParams.get("counter") === "true";

  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [challengeType, setChallengeType] = useState("ranked");
  const [matchFormat, setMatchFormat] = useState("best_of_3");
  const [matchType, setMatchType] = useState("singolo");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState(COURTS[0]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [myPartner, setMyPartner] = useState("");
  const [opponentPartner, setOpponentPartner] = useState("");
  const [message, setMessage] = useState("");

  // Slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Calendar modal
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Booking ID to exclude from occupied slots when editing
  const editingBookingIdRef = useRef<string | null>(null);

  // Drag to scroll
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineScrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - timelineScrollRef.current.offsetLeft;
    scrollLeft.current = timelineScrollRef.current.scrollLeft;
    timelineScrollRef.current.style.cursor = "grabbing";
    timelineScrollRef.current.style.userSelect = "none";
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
      timelineScrollRef.current.style.cursor = "grab";
      timelineScrollRef.current.style.userSelect = "auto";
    }
  };

  const handleMouseLeave = () => {
    if (isDragging.current) handleMouseUp();
  };

  useEffect(() => {
    loadData();
  }, [opponentId]);

  useEffect(() => {
    if (editChallengeId && opponent) {
      loadExistingChallenge();
    }
  }, [editChallengeId, opponent]);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  useEffect(() => {
    if (matchType === "singolo") {
      setMyPartner("");
      setOpponentPartner("");
    }
  }, [matchType]);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setCurrentUserId(session.user.id);

      const [profileRes, playersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", session.user.id).single(),
        fetch("/api/arena/players", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      if (profileRes.data) setCurrentUserProfile(profileRes.data as any);

      const response = playersRes;
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
        const foundOpponent = data.players.find((p: any) => p.id === opponentId);
        if (foundOpponent) setOpponent(foundOpponent);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingChallenge() {
    try {
      const response = await fetch(`/api/arena/challenges?challenge_id=${editChallengeId}`);
      if (response.ok) {
        const data = await response.json();
        const challenge = data.challenge;
        if (challenge) {
          setChallengeType(challenge.challenge_type || "ranked");
          setMatchFormat(challenge.match_format || "best_of_3");
          setMatchType(challenge.match_type || "singolo");
          setMessage(challenge.message || "");
          setMyPartner(challenge.my_partner_id || "");
          setOpponentPartner(challenge.opponent_partner_id || "");
          if (challenge.booking) {
            const bookingId = challenge.booking_id || challenge.booking?.id || null;
            editingBookingIdRef.current = bookingId;
            const bookingDate = new Date(challenge.booking.start_time);
            setSelectedDate(bookingDate);
            setSelectedCourt(challenge.booking.court);
            const startTime = new Date(challenge.booking.start_time);
            const endTime = new Date(challenge.booking.end_time);
            const slotList: string[] = [];
            let current = new Date(startTime);
            while (current < endTime) {
              slotList.push(
                current.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
              );
              current = new Date(current.getTime() + 30 * 60000);
            }
            setSelectedSlots(slotList);
            // Explicitly reload slots to exclude the current booking from occupied set
            await loadAvailableSlots(bookingDate, challenge.booking.court, bookingId);
          }
        }
      }
    } catch (error) {
      console.error("Error loading existing challenge:", error);
    }
  }

  async function loadAvailableSlots(
    overrideDate?: Date,
    overrideCourt?: string,
    excludeBookingId?: string | null
  ) {
    const dateToUse = overrideDate ?? selectedDate;
    const courtToUse = overrideCourt ?? selectedCourt;
    if (!dateToUse || !courtToUse) return;
    setLoadingSlots(true);
    try {
      const dateStr = format(dateToUse, "yyyy-MM-dd");
      const response = await fetch(
        `/api/bookings/availability?date=${encodeURIComponent(dateStr)}&court=${encodeURIComponent(courtToUse)}`
      );

      if (!response.ok) {
        setExistingBookings([]);
        setSlots([]);
        setLoadingSlots(false);
        return;
      }

      const payload = await response.json();
      const allItems = Array.isArray(payload?.bookings) ? payload.bookings : [];
      setExistingBookings(allItems);

      // When editing, exclude the current booking's slots so they appear selectable
      const bookingIdToExclude = excludeBookingId !== undefined ? excludeBookingId : editingBookingIdRef.current;

      const occupiedSlots = new Set<string>();
      allItems.forEach((item: any) => {
        if (bookingIdToExclude && item.id === bookingIdToExclude) return;
        const start = new Date(item.start_time);
        const end = new Date(item.end_time);
        const current = new Date(start);
        while (current < end) {
          const hours = current.getHours().toString().padStart(2, "0");
          const minutes = current.getMinutes().toString().padStart(2, "0");
          occupiedSlots.add(`${hours}:${minutes}`);
          current.setMinutes(current.getMinutes() + 30);
        }
      });

      const generatedSlots: { time: string; available: boolean }[] = [];
      const now = new Date();
      const isToday = dateToUse.toDateString() === now.toDateString();
      const dayOfWeek = dateToUse.getDay();
      const closingMinutes = getClosingMinutes(dayOfWeek);

      for (let hour = 7; hour <= 22; hour++) {
        for (const minute of [0, 30]) {
          if (hour === 22 && minute === 30) break;
          const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          let available = !occupiedSlots.has(time);
          if (hour * 60 + minute + 30 > closingMinutes) available = false;
          if (isToday) {
            const slotTime = new Date(dateToUse);
            slotTime.setHours(hour, minute, 0, 0);
            if (slotTime <= now) available = false;
          }
          generatedSlots.push({ time, available });
        }
      }

      setSlots(generatedSlots);
    } catch (error) {
      console.error("Error loading slots:", error);
      setExistingBookings([]);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleSlotClick(time: string, available: boolean) {
    if (!available) return;
    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      }
      if (prev.length === 0) return [time];
      const allSlots = [...prev, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      for (let i = 1; i < allSlots.length; i++) {
        const [hPrev, mPrev] = allSlots[i - 1].split(":").map(Number);
        const [hCurr, mCurr] = allSlots[i].split(":").map(Number);
        if (hCurr * 60 + mCurr - (hPrev * 60 + mPrev) !== 30) return [time];
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

  // Calendar helpers
  function normalizeDate(date: Date): Date {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
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
    handleDateChange(normalizeDate(pendingDate));
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

  const getMaxDate = (): Date => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d;
  };

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

  async function handleSubmit() {
    if (selectedSlots.length === 0 || !selectedCourt) {
      setError("Seleziona un campo e almeno uno slot orario");
      return;
    }
    if (matchType === "doppio" && (!myPartner || !opponentPartner)) {
      setError("Per il doppio devi selezionare entrambi i compagni");
      return;
    }

    setSending(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Devi essere autenticato");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessione scaduta, effettua di nuovo il login.");

      const firstSlot = selectedSlots[0];
      const lastSlot = selectedSlots[selectedSlots.length - 1];
      const [startHours, startMinutes] = firstSlot.split(":").map(Number);
      const [endHours, endMinutes] = lastSlot.split(":").map(Number);

      const startTime = new Date(selectedDate);
      startTime.setHours(startHours, startMinutes, 0, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(endHours, endMinutes + 30, 0, 0);

      const duration = selectedSlots.length * 30;

      if (editChallengeId) {
        const existingChallengeResponse = await fetch(`/api/arena/challenges?challenge_id=${editChallengeId}`);
        const existingData = await existingChallengeResponse.json();
        const existingChallenge = existingData.challenge;
        let bookingId = existingChallenge?.booking_id;

        if (existingChallenge?.booking_id) {
          await fetch(`/api/bookings/${existingChallenge.booking_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              court: selectedCourt,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              notes: `Sfida Arena: ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singolo" ? "Singolo" : "Doppio"}`,
            }),
          });
        } else {
          const bookingResponse = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              user_id: user.id,
              court: selectedCourt,
              type: "campo",
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              status: "confirmed",
              notes: `Sfida Arena: ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singolo" ? "Singolo" : "Doppio"}`,
            }),
          });
          if (!bookingResponse.ok) {
            const bookingError = await bookingResponse.json();
            throw new Error(bookingError.error || "Errore nella prenotazione del campo");
          }
          const bookingData = await bookingResponse.json();
          bookingId = bookingData.booking?.id;
        }

        const challengeResponse = await fetch("/api/arena/challenges", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge_id: editChallengeId,
            scheduled_date: startTime.toISOString(),
            court: selectedCourt,
            match_format: matchFormat,
            duration_minutes: duration,
            match_type: matchType,
            challenge_type: challengeType,
            my_partner_id: matchType === "doppio" ? myPartner : null,
            opponent_partner_id: matchType === "doppio" ? opponentPartner : null,
            booking_id: bookingId,
            message: message.trim() || null,
            status: isCounterProposal ? "counter_proposal" : undefined,
          }),
        });

        if (!challengeResponse.ok) {
          const challengeError = await challengeResponse.json();
          throw new Error(challengeError.error || "Errore nella modifica della sfida");
        }

        setSuccess("Sfida modificata con successo!");
        setTimeout(() => {
          router.push(`${dashboardBase}/arena/challenge/${editChallengeId}`);
        }, 1500);
      } else {
        const bookingResponse = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            user_id: user.id,
            court: selectedCourt,
            type: "campo",
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: "confirmed",
            notes: `Sfida Arena: ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singolo" ? "Singolo" : "Doppio"}`,
          }),
        });
        if (!bookingResponse.ok) {
          const bookingError = await bookingResponse.json();
          throw new Error(bookingError.error || "Errore nella prenotazione del campo");
        }
        const bookingData = await bookingResponse.json();

        const challengeResponse = await fetch("/api/arena/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenger_id: user.id,
            opponent_id: opponentId,
            scheduled_date: startTime.toISOString(),
            court: selectedCourt,
            match_format: matchFormat,
            duration_minutes: duration,
            match_type: matchType,
            challenge_type: challengeType,
            my_partner_id: matchType === "doppio" ? myPartner : null,
            opponent_partner_id: matchType === "doppio" ? opponentPartner : null,
            booking_id: bookingData.booking?.id,
            message: message.trim() || null,
          }),
        });
        if (!challengeResponse.ok) {
          const challengeError = await challengeResponse.json();
          throw new Error(challengeError.error || "Errore nella creazione della sfida");
        }
        const challengeData = await challengeResponse.json();

        if (message.trim()) {
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient_id: opponentId,
              message: message.trim(),
              challenge_id: challengeData.challenge?.id,
            }),
          });
        }

        setSuccess("Sfida creata con successo!");
        setTimeout(() => {
          router.push(`${dashboardBase}/arena?success=challenge_created`);
        }, 1500);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  }

  const avatarByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    if (currentUserProfile?.avatar_url) map[currentUserProfile.id] = currentUserProfile.avatar_url;
    if (opponent?.avatar_url) map[opponent.id] = opponent.avatar_url;
    players.forEach((p) => { if (p.avatar_url) map[p.id] = p.avatar_url; });
    return map;
  }, [currentUserProfile, opponent, players]);

  const selectedParticipants = useMemo((): SelectedParticipant[] => {
    const me: SelectedParticipant = currentUserProfile
      ? { userId: currentUserProfile.id, fullName: currentUserProfile.full_name, isRegistered: true }
      : { fullName: "Tu", isRegistered: true };
    if (!opponent) return [me];
    const opp: SelectedParticipant = { userId: opponent.id, fullName: opponent.full_name, isRegistered: true };
    if (matchType !== "doppio") return [me, opp];
    const parts: SelectedParticipant[] = [me];
    if (myPartner) {
      const p = players.find((pl) => pl.id === myPartner);
      if (p) parts.push({ userId: p.id, fullName: p.full_name, isRegistered: true });
    }
    parts.push(opp);
    return parts;
    return parts;
  }, [currentUserProfile, opponent, matchType, myPartner, players]);

  const canSubmit =
    selectedDate &&
    selectedCourt &&
    selectedSlots.length > 0 &&
    (matchType === "singolo" || (matchType === "doppio" && myPartner));

  const isSlotAvailable = (time: string): boolean => {
    const slot = slots.find((s) => s.time === time);
    return slot ? slot.available : false;
  };

  const fullDateLabel = (() => {
    const value = format(selectedDate, "EEEE dd MMMM yyyy", { locale: it });
    return value.charAt(0).toUpperCase() + value.slice(1);
  })();

  const mobileWeekdayLabel = format(selectedDate, "EEE", { locale: it });
  const mobileDateLabel = (() => {
    const raw = `${mobileWeekdayLabel.slice(0, 1).toUpperCase()}${mobileWeekdayLabel.slice(1, 3).toLowerCase()} ${format(selectedDate, "dd MMM yyyy", { locale: it })}`;
    return raw.replace(/(\d{2} )(\w)/, (_, day, char) => day + char.toUpperCase());
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!opponent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Avversario non trovato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={`${dashboardBase}/arena`} className="hover:text-secondary/80 transition-colors">
            Arena
          </Link>
          {" › "}
          <span>{editChallengeId ? "Modifica Sfida" : "Configura Sfida"}</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">{editChallengeId ? "Modifica Sfida" : "Configura Sfida"}</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Successo</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Date Selector */}
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

      {/* Dettagli Sfida */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli sfida</h2>
        </div>
        <div className="p-4 sm:p-6">
            <div className="space-y-6">
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
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

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
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
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
                  {MATCH_FORMATS.map((fmt) => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => setMatchFormat(fmt.value)}
                      className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        matchFormat === fmt.value
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  {COURTS.map((court) => (
                    <button
                      key={court}
                      type="button"
                      onClick={() => handleCourtChange(court)}
                      className={`px-4 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        selectedCourt === court
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {court}
                    </button>
                  ))}
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Partecipanti */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        <div className="p-4 sm:p-6">
          <AthletesSelector
            athletes={players as any}
            selectedAthletes={selectedParticipants}
            onAthleteAdd={(participant) => {
              if (matchType !== "doppio") return;
              const uid = participant.userId;
              if (!uid || uid === currentUserId || uid === opponent.id) return;
              if (!myPartner) setMyPartner(uid);
            }}
            onAthleteRemove={(index) => {
              if (index === 0) return;
              if (matchType !== "doppio") return;
              const oppIdx = selectedParticipants.findIndex((p) => p.userId === opponent.id);
              if (index === oppIdx) return;
              if (index < oppIdx) setMyPartner("");
            }}
            participantLabelByIndex={(index) => {
              if (index === 0) return "Tu";
              const oppIdx = selectedParticipants.findIndex((p) => p.userId === opponent.id);
              if (index === oppIdx) return "Avversario";
              return "Il tuo partner";
            }}
            participantToneByIndex={(index) => {
              const oppIdx = selectedParticipants.findIndex((p) => p.userId === opponent.id);
              return index >= oppIdx ? "dark" : "secondary";
            }}
            selectedDisplayOrder={matchType === "doppio" ? [0, 1, 2] : [0, 1]}
            maxAthletes={matchType === "doppio" ? 3 : 2}
            allowGuestParticipants={false}
            avatarByUserId={avatarByUserId}
          />
        </div>
      </div>

      {/* Card Orari disponibili */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Orari disponibili</h2>
          <p className="text-xs text-secondary/60 sm:text-right">
            Apertura: <span className="font-medium">{getCourtHoursLabel(selectedDate.getDay())}</span>
          </p>
        </div>
        <div className="p-4 sm:p-6">
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
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Messaggio (opzionale)</h2>
        </div>
        <div className="p-4 sm:p-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Aggiungi un messaggio alla tua sfida..."
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
          />
          <p className="text-xs text-secondary/50 mt-2">{message.length}/500 caratteri</p>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={sending || !canSubmit}
        className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
      >
        {sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Invio in corso...</span>
          </>
        ) : (
          <span>{editChallengeId ? "Salva Modifiche" : "Invia Sfida"}</span>
        )}
      </button>

      <div className="h-8" />

      {/* Calendar Modal */}
      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent
          size="sm"
          showBuiltinClose={false}
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="font-semibold text-white">Seleziona Data</ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
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
    </div>
  );
}
