"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
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
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import { isBookableCoachProfile, type UserRole } from "@/lib/roles";
import { getClosingMinutes, getCourtHoursLabel } from "@/lib/bookings/bookingTimeRestrictions";

interface Coach {
  id: string;
  full_name: string;
}

interface Athlete {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
}

type SelectedAthlete = {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
};

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

const BOOKING_TYPES = [
  { value: "campo", label: "Campo", shortLabel: "Campo", icon: "🎾" },
  { value: "lezione_privata", label: "Lezione Privata", shortLabel: "Privata", icon: "👤" },
];

const MATCH_FORMATS = [
  { value: "singolo", label: "Singolo" },
  { value: "doppio", label: "Doppio" },
] as const;

type MatchFormat = (typeof MATCH_FORMATS)[number]["value"];

function NewBookingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/bookings")[0];
  const isMaestroDashboard = dashboardBase.includes("/dashboard/maestro");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);

  // Form state
  const [bookingType, setBookingType] = useState("campo");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("singolo");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [notes, setNotes] = useState("");
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedAthletes, setSelectedAthletes] = useState<SelectedAthlete[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAthlete, setCurrentUserAthlete] = useState<SelectedAthlete | null>(null);

  // Available slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  
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
  const pendingSlotsSelection = useRef<string[]>([]);
  const urlParamsApplied = useRef<boolean>(false);

  const maxAthletesAllowed =
    bookingType === "lezione_privata"
      ? null
      : bookingType === "campo" && matchFormat === "singolo"
        ? 2
        : 4;

  // Validation
  const canSubmit = selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((bookingType === "campo") || (bookingType === "lezione_privata" && selectedCoach));

  useEffect(() => {
    loadCourtsAndCoaches();
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      const fullName = profile?.full_name || user.email || "Atleta";

      setCurrentUserAthlete({
        userId: user.id,
        fullName,
        email: user.email || undefined,
        phone: profile?.phone || undefined,
        isRegistered: true,
      });
    };

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserAthlete?.userId) return;

    const shouldAutoIncludeCurrentUser = !isMaestroDashboard || bookingType !== "lezione_privata";

    setSelectedAthletes((prev) => {
      const hasCurrentUser = prev.some((athlete) => athlete.userId === currentUserAthlete.userId);

      if (shouldAutoIncludeCurrentUser) {
        if (hasCurrentUser) return prev;
        return [currentUserAthlete, ...prev];
      }

      if (!hasCurrentUser) return prev;
      return prev.filter((athlete) => athlete.userId !== currentUserAthlete.userId);
    });
  }, [bookingType, currentUserAthlete, isMaestroDashboard]);

  // Mantiene il numero partecipanti coerente con il tipo prenotazione selezionato.
  useEffect(() => {
    setSelectedAthletes((prev) => {
      if (maxAthletesAllowed === null) {
        return prev;
      }

      if (prev.length <= maxAthletesAllowed) {
        return prev;
      }

      const currentAthlete = currentUserId
        ? prev.find((athlete) => athlete.userId === currentUserId)
        : undefined;
      const otherAthletes = currentAthlete
        ? prev.filter((athlete) => athlete.userId !== currentUserId)
        : prev;

      if (!currentAthlete) {
        return prev.slice(0, maxAthletesAllowed);
      }

      return [currentAthlete, ...otherAthletes.slice(0, maxAthletesAllowed - 1)];
    });
  }, [currentUserId, maxAthletesAllowed]);

  // Apply URL parameters after courts are loaded
  useEffect(() => {
    if (courtsLoading || urlParamsApplied.current) return;

    const courtParam = searchParams.get('court');
    const dateParam = searchParams.get('date');
    const timesParam = searchParams.get('times');

    // Only apply if there are URL parameters to apply
    if (!courtParam && !dateParam && !timesParam) {
      // No URL params, just set default court
      if (courts.length > 0 && !selectedCourt) {
        setSelectedCourt(courts[0]);
      }
      return;
    }

    if (courtParam && courts.includes(courtParam)) {
      setSelectedCourt(courtParam);
    } else if (courts.length > 0 && !selectedCourt) {
      setSelectedCourt(courts[0]);
    }

    if (dateParam) {
      const parsedDate = new Date(dateParam + 'T12:00:00');
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }

    if (timesParam) {
      const times = timesParam.split(',').filter(Boolean);
      pendingSlotsSelection.current = times;
    }

    urlParamsApplied.current = true;
  }, [courtsLoading, courts, searchParams]);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      // Reset selected slots when date or court changes (unless we have pending slots from URL)
      if (pendingSlotsSelection.current.length === 0) {
        setSelectedSlots([]);
      }
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  // Apply pending slots selection after slots are loaded
  useEffect(() => {
    // Only proceed if we have pending slots
    if (pendingSlotsSelection.current.length === 0) return;

    // Wait for slots to finish loading
    if (loadingSlots) return;

    // Must have slots loaded to proceed
    if (slots.length === 0) return;

    // Filter only available slots
    const slotsToSelect = pendingSlotsSelection.current;
    const availableSlots = slotsToSelect.filter(time => {
      const slot = slots.find(s => s.time === time);
      return slot && slot.available;
    });

    // Clear pending slots after attempting selection
    pendingSlotsSelection.current = [];

    if (availableSlots.length > 0) {
      setSelectedSlots(availableSlots);

      // Remove URL parameters after successfully applying the slots
      setTimeout(() => {
        router.replace(`${dashboardBase}/bookings/new`, { scroll: false });
      }, 100);
    }
  }, [slots, loadingSlots, router]);

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
    const d = new Date(date); d.setHours(12, 0, 0, 0); return d;
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function openDatePickerModal() {
    const n = normalizeDate(selectedDate);
    setPendingDate(n);
    setCalendarViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    const n = normalizeDate(day);
    setPendingDate(n);
    setCalendarViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
  }

  function applyDateSelection() {
    setSelectedDate(normalizeDate(pendingDate));
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

  async function loadCourtsAndCoaches() {
    setCourtsLoading(true);
    try {
      // Load courts
      const courtsData = await getCourts();
      setCourts(courtsData);

      // Load coaches
      const { data: coachData } = await supabase
        .from("profiles")
        .select("id, full_name, role, metadata")
        .in("role", ["maestro", "gestore"])
        .order("full_name");

      if (coachData) {
        const eligibleCoaches = coachData
          .filter((coach) => isBookableCoachProfile(coach))
          .map(({ id, full_name }) => ({ id, full_name }));

        setCoaches(eligibleCoaches);
      }

      // Load athletes for participant selection
      const { data: athleteData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role")
        .eq("role", "atleta")
        .order("full_name");

      if (athleteData) setAthletes(athleteData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setCourtsLoading(false);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoadingSlots(true);

    const dateStr = selectedDate.toISOString().split("T")[0];

    // Usa l'API server-side (service role) per ottenere tutte le occupazioni del campo,
    // aggirando la RLS che limiterebbe l'atleta a vedere solo le proprie prenotazioni.
    let allOccupations: any[] = [];
    try {
      const res = await fetch(
        `/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(selectedCourt)}`
      );
      if (res.ok) {
        const data = await res.json();
        allOccupations = data.bookings ?? [];
      }
    } catch (err) {
      console.error("Error fetching availability:", err);
    }

    setExistingBookings(allOccupations);

    // Build occupied half-hour slots set
    const occupiedSlots = new Set<string>();

    allOccupations.forEach(b => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);

      const current = new Date(start);
      while (current < end) {
        const hours = current.getHours().toString().padStart(2, "0");
        const minutes = current.getMinutes().toString().padStart(2, "0");
        occupiedSlots.add(`${hours}:${minutes}`);
        current.setMinutes(current.getMinutes() + 30);
      }
    });

    // Orario di chiusura per il giorno selezionato (atleta/maestro hanno restrizioni)
    const dayOfWeek = selectedDate.getDay();
    const closingMinutes = getClosingMinutes(dayOfWeek);

    // Generate slots every 30 minutes (07:00 - 22:00)
    const generatedSlots: TimeSlot[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 7; hour <= 22; hour++) {
      for (const minute of [0, 30]) {
        if (hour === 22 && minute === 30) break;

        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        let available = !occupiedSlots.has(time);

        // Lo slot deve terminare entro l'orario di chiusura del giorno
        const slotMinutes = hour * 60 + minute;
        if (slotMinutes + 30 > closingMinutes) {
          available = false;
        }

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

  // Gestione selezione multipla di slot consecutivi
  const toggleSlotSelection = (time: string, available: boolean) => {
    if (!available) return;

    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      }

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
          return [time];
        }
      }

      return allSlots;
    });
  };

  const isSlotAvailable = (time: string): boolean => {
    if (!selectedCourt) return true;
    const slot = slots.find(s => s.time === time);
    return slot ? slot.available : false;
  };

  const fullDateLabel = (() => { const s = format(selectedDate, "EEEE dd MMMM yyyy", { locale: it }); return s.charAt(0).toUpperCase() + s.slice(1); })();
  const mobileWeekdayLabel = format(selectedDate, "EEE", { locale: it });
  const mobileDateLabel = (() => { const raw = `${mobileWeekdayLabel.slice(0, 1).toUpperCase()}${mobileWeekdayLabel.slice(1, 3).toLowerCase()} ${format(selectedDate, "dd MMM yyyy", { locale: it })}`; return raw.replace(/(\d{2} )(\w)/, (_, d, c) => d + c.toUpperCase()); })();

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year, month - 1, day);
    setSelectedDate(newDate);
  };

  async function handleSubmit() {
    if (selectedAthletes.length === 0 || !selectedDate || !selectedCourt || selectedSlots.length === 0) {
      setError("Completa tutti i campi obbligatori");
      return;
    }

    if (maxAthletesAllowed !== null && selectedAthletes.length > maxAthletesAllowed) {
      setError(`Massimo ${maxAthletesAllowed} partecipanti per questa prenotazione`);
      return;
    }

    const registeredAthlete = selectedAthletes.find((athlete) => athlete.isRegistered && athlete.userId);
    if (!registeredAthlete || !registeredAthlete.userId) {
      setError("Completa tutti i campi obbligatori");
      return;
    }

    if (bookingType === "lezione_privata" && !selectedCoach) {
      setError("Seleziona un maestro per le lezioni");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta, effettua di nuovo il login.");
      }

      const orderedSlots = [...selectedSlots].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      const durationMinutes = orderedSlots.length * 30;
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);

      const bookingData = {
        user_id: user.id,
        coach_id: selectedCoach || null,
        court: selectedCourt,
        type: bookingType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "confirmed",
        notes: notes || null,
        participants: selectedAthletes.map((athlete) => ({
          user_id: athlete.userId || null,
          full_name: athlete.fullName,
          email: athlete.email || null,
          phone: athlete.phone || null,
          is_registered: athlete.isRegistered,
        })),
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
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      setSuccess("Prenotazione creata con successo!");
      setTimeout(() => {
        router.push(`${dashboardBase}/bookings`);
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
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={`${dashboardBase}/bookings`} className="hover:text-secondary/80 transition-colors">Prenotazioni</Link>
          {" › "}
          <span>Nuova Prenotazione</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Nuova Prenotazione</h1>
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
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
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
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="relative z-10 justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
            >
              <span className="text-lg font-semibold text-white">&gt;</span>
            </button>
          </div>

          {/* Area Principale */}
          <div className="bg-white border border-gray-200 rounded-xl">
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                <p className="text-secondary font-semibold">Caricamento slot...</p>
              </div>
            ) : (
              <>
                {/* Titolo form */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli prenotazione</h2>
                    <p className="text-xs text-secondary/60 sm:text-right">
                      Il Campo 4 ha superficie sintetica
                    </p>
                </div>

                {/* Dettagli prenotazione */}
                <div className="space-y-6 p-4 sm:p-6">
                  {/* Tipo prenotazione */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo prenotazione</label>
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {BOOKING_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setBookingType(type.value)}
                          className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                            bookingType === type.value
                              ? 'bg-secondary text-white border-secondary'
                              : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                          }`}
                        >
                          <span className="sm:hidden">{type.shortLabel}</span>
                          <span className="hidden sm:inline">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modalita campo */}
                  {bookingType === "campo" && (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Modalità</label>
                      <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                        {MATCH_FORMATS.map((formatOption) => (
                          <button
                            key={formatOption.value}
                            type="button"
                            onClick={() => setMatchFormat(formatOption.value)}
                            className={`px-3 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                              matchFormat === formatOption.value
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {formatOption.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Partecipanti — estratto in card separata */}

                  {/* Maestro - solo per lezione privata */}
                  {bookingType === "lezione_privata" && (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                      <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Maestro</label>
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

                  {/* Campo */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
                    <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                      {courtsLoading ? (
                        <div className="flex items-center gap-2 text-secondary/60">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Caricamento campi...</span>
                        </div>
                      ) : (
                        courts.map((court) => (
                          <button
                            key={court}
                            type="button"
                            onClick={() => setSelectedCourt(court)}
                            className={`px-4 sm:px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                              selectedCourt === court
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                            }`}
                          >
                            {court}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Card Partecipanti */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent rounded-t-xl">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
            </div>
            <div className="p-4 sm:p-6">
              <AthletesSelector
                athletes={athletes.filter((a) => a.id !== currentUserId)}
                selectedAthletes={selectedAthletes}
                onAthleteAdd={(athlete) => {
                  if (maxAthletesAllowed === null || selectedAthletes.length < maxAthletesAllowed) {
                    setSelectedAthletes([...selectedAthletes, athlete]);
                  }
                }}
                onAthleteRemove={(index) => {
                  const athlete = selectedAthletes[index];
                  if (athlete?.userId && athlete.userId === currentUserId) {
                    return;
                  }
                  setSelectedAthletes(selectedAthletes.filter((_, i) => i !== index));
                }}
                maxAthletes={maxAthletesAllowed}
              />
              <p className="mt-2 text-xs text-gray-500">
                {maxAthletesAllowed === null
                  ? isMaestroDashboard
                    ? "Seleziona gli atleti partecipanti alla lezione privata."
                    : "Il tuo profilo è incluso automaticamente. Puoi aggiungere altri partecipanti alla lezione privata."
                  : `Il tuo profilo è incluso automaticamente. Puoi aggiungere fino a ${maxAthletesAllowed - 1} ${(maxAthletesAllowed - 1) === 1 ? "partecipante" : "partecipanti"}.`}
              </p>
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
                            onClick={() => toggleSlotSelection(time1, available1)}
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
                            onClick={() => toggleSlotSelection(time1, available1)}
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
                            onClick={() => toggleSlotSelection(time2, available2)}
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

          {/* Card Note */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
            </div>
            <div className="p-4 sm:p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eventuali note..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
              />
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
              <span>Conferma Prenotazione</span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />

      {/* Date Picker Modal */}
      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Seleziona Data</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Scegli il giorno da visualizzare.
            </ModalDescription>
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
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
      </div>
    }>
      <NewBookingPageInner />
    </Suspense>
  );
}
