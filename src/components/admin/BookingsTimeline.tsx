"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Users, Swords, Lock } from "lucide-react";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

type Booking = {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  notes: string | null;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
  isBlock?: boolean;
  reason?: string;
};

type BookingsTimelineProps = {
  bookings: Booking[];
  loading: boolean;
  basePath?: string; // Optional base path for navigation (default: /dashboard/admin)
  fetchOccupied?: boolean; // When true, fetches ALL bookings via API to show occupied slots from other users
  swapAxes?: boolean; // When true, shows time on Y axis and courts on X axis
  showBlockReason?: boolean;
  showCourtBlocks?: boolean;
  highlightUserId?: string; // When set, bookings where this user is athlete are styled differently
};

const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00"
];

const WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

const HALF_SLOTS_PER_DAY = TIME_SLOTS.length * 2;
const TIMELINE_ROW_HEIGHT = 92;

type TimeSlotInfo = {
  booking: Booking | null;
  isPartOfBooking: boolean;
  isStart: boolean;
  colspan: number;
};

export default function BookingsTimeline({ bookings: allBookings, loading: parentLoading, basePath = "/dashboard/admin", fetchOccupied = false, swapAxes = false, showBlockReason = true, showCourtBlocks = true, highlightUserId }: BookingsTimelineProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [courtBlocks, setCourtBlocks] = useState<Booking[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [allOccupiedBookings, setAllOccupiedBookings] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<{ court: string; time: string }[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<Booking | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  
  // Drag to scroll
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const getPrimaryParticipant = (booking: Booking) =>
    booking.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const getBookingDisplayName = (booking: Booking) =>
    getPrimaryParticipant(booking)?.full_name || booking.user_profile?.full_name || "Sconosciuto";

  const getParticipantNames = (booking: Booking): string[] => {
    const names =
      booking.participants
        ?.map((participant) => participant.full_name?.trim())
        .filter((name): name is string => Boolean(name && name.length > 0)) || [];

    if (names.length > 0) return names;
    if (booking.user_profile?.full_name?.trim()) return [booking.user_profile.full_name.trim()];
    return [];
  };

  const getParticipantIdentityKey = (booking: Booking) => {
    if (booking.participants && booking.participants.length > 0) {
      return booking.participants
        .map((participant) => participant.user_id || `guest:${participant.full_name.trim().toLowerCase()}`)
        .join("|");
    }

    return booking.user_id;
  };

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

  // Load courts from database on mount
  useEffect(() => {
    loadCourtsFromDB();
  }, []);

  // Load court blocks for the selected date
  useEffect(() => {
    if (!showCourtBlocks) {
      setCourtBlocks([]);
      setBlocksLoading(false);
      return;
    }

    loadCourtBlocks();
  }, [selectedDate, showCourtBlocks]);

  // When fetchOccupied is enabled, fetch all bookings via API (bypasses RLS)
  useEffect(() => {
    if (!fetchOccupied) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          courts.map(court =>
            fetch(`/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(court)}`)
              .then(r => r.ok ? r.json() : { bookings: [] })
              .then(d => (d.bookings ?? []) as any[])
          )
        );
        setAllOccupiedBookings(results.flat());
      } catch (err) {
        console.error('Error fetching occupied bookings:', err);
      }
    };
    void fetchAll();
  }, [selectedDate, courts, fetchOccupied]);

  async function loadCourtsFromDB() {
    setCourtsLoading(true);
    try {
      const courtsData = await getCourts();
      setCourts(courtsData);
    } catch (error) {
      console.error("Error loading courts:", error);
      // Keep default fallback courts
    } finally {
      setCourtsLoading(false);
    }
  }

  async function loadCourtBlocks() {
    if (!showCourtBlocks) {
      setCourtBlocks([]);
      setBlocksLoading(false);
      return;
    }

    setBlocksLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch court blocks for the selected date
      const { data: blocksData } = await supabase
        .from("court_blocks")
        .select("*")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      // Convert blocks to booking-like format for timeline display
      const blockEntries: Booking[] = blocksData?.map(block => ({
        id: block.id,
        court: block.court_id,
        user_id: "",
        coach_id: null,
        start_time: block.start_time,
        end_time: block.end_time,
        status: "blocked",
        type: "blocco",
        notes: block.reason,
        reason: block.reason,
        isBlock: true,
        user_profile: null,
        coach_profile: null
      })) || [];

      setCourtBlocks(blockEntries);
    } catch (error) {
      console.error("Error loading court blocks:", error);
    } finally {
      setBlocksLoading(false);
    }
  }

  // Filter bookings for the selected date and merge with court blocks
  const bookingsForSelectedDate = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filteredBookings = allBookings.filter(booking => {
      if (booking.status === "cancelled") {
        return false;
      }

      const bookingDate = new Date(booking.start_time);
      return bookingDate >= startOfDay && bookingDate <= endOfDay;
    });

    // Merge bookings and blocks
    const allEntries = [...filteredBookings, ...courtBlocks].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return allEntries;
  }, [allBookings, selectedDate, courtBlocks]);

  const loading = parentLoading || blocksLoading || courtsLoading;

  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(12, 0, 0, 0);
    setSelectedDate(newDate);
    setSelectedSlots([]); // Reset selection when changing date
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }

  function openDatePickerModal() {
    const normalizedSelected = normalizeDate(selectedDate);
    setPendingDate(normalizedSelected);
    setCalendarViewDate(new Date(normalizedSelected.getFullYear(), normalizedSelected.getMonth(), 1));
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
    const label = date.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric"
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function goToToday() {
    setSelectedDate(normalizeDate(new Date()));
    setSelectedSlots([]);
  }

  function toggleSlotSelection(court: string, time: string) {
    setSelectedSlots(prev => {
      const key = `${court}-${time}`;
      const exists = prev.find(s => `${s.court}-${s.time}` === key);
      if (exists) {
        return prev.filter(s => `${s.court}-${s.time}` !== key);
      } else {
        return [...prev, { court, time }];
      }
    });
  }

  function handleBookSlots() {
    if (selectedSlots.length === 0) return;

    // Sort slots by time to get the earliest
    const sortedSlots = [...selectedSlots].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    const firstSlot = sortedSlots[0];
    const dateStr = selectedDate.toISOString().split('T')[0];

    // Get all selected times for the same court as the first slot
    const allTimes = sortedSlots
      .filter(s => s.court === firstSlot.court)
      .map(s => s.time);



    // Navigate to new booking page with pre-filled data
    // Pass all selected times as comma-separated values
    const params = new URLSearchParams({
      court: firstSlot.court,
      date: dateStr,
      times: allTimes.join(',')
    });

    router.push(`${basePath}/bookings/new?${params.toString()}`);
  }

  // Build a map of time slots for each court
  const courtTimeline = useMemo(() => {
    const timeline: Record<string, TimeSlotInfo[]> = {};

    courts.forEach(court => {
      // Get bookings for this court and sort by start time
      const courtBookings = bookingsForSelectedDate
        .filter(b => b.court === court)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      
      // Merge consecutive bookings for the same user
      const mergedBookings: Booking[] = [];
      courtBookings.forEach((booking, idx) => {
        if (idx === 0) {
          mergedBookings.push({ ...booking });
          return;
        }
        
        const prevMerged = mergedBookings[mergedBookings.length - 1];
        const prevEnd = new Date(prevMerged.end_time).getTime();
        const currentStart = new Date(booking.start_time).getTime();
        
        // Check if consecutive and same user/type
        if (
          prevEnd === currentStart &&
          getParticipantIdentityKey(prevMerged) === getParticipantIdentityKey(booking) &&
          prevMerged.type === booking.type &&
          prevMerged.coach_id === booking.coach_id
        ) {
          // Merge by extending end time
          prevMerged.end_time = booking.end_time;
        } else {
          mergedBookings.push({ ...booking });
        }
      });
      
      const slots: TimeSlotInfo[] = [];
      let skipUntilIndex = -1;
      
      TIME_SLOTS.forEach((timeSlot, index) => {
        // Skip if we're in the middle of a booking
        if (index <= skipUntilIndex) {
          return;
        }
        
        const [hour] = timeSlot.split(":").map(Number);
        
        // Find if there's a booking starting within this hour (00-59 minutes)
        const bookingAtSlot = mergedBookings.find(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingHour = bookingStart.getHours();
          // Check if booking starts in this hour slot (any minute from 00 to 59)
          return bookingHour === hour;
        });
        
        if (bookingAtSlot) {
          // Calculate duration in hours (round up to include partial hours)
          const start = new Date(bookingAtSlot.start_time);
          const end = new Date(bookingAtSlot.end_time);
          const durationMs = end.getTime() - start.getTime();
          const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
          
          slots.push({
            booking: bookingAtSlot,
            isPartOfBooking: true,
            isStart: true,
            colspan: durationHours
          });
          
          // Skip the next slots that are part of this booking
          skipUntilIndex = index + durationHours - 1;
        } else {
          // Empty slot
          slots.push({
            booking: null,
            isPartOfBooking: false,
            isStart: false,
            colspan: 1
          });
        }
      });
      
      timeline[court] = slots;
    });
    
    return timeline;
  }, [bookingsForSelectedDate, courts]);

  function getBookingColor(booking: Booking): string {
    if (booking.status === "cancelled") {
      return "";
    }
    
    return "";
  }
  
  function getBookingStyle(booking: Booking) {
    // Colori specifici per timeline maestro
    if (highlightUserId) {
      if (booking.isBlock) {
        return { background: "#94a3b8" };
      }

      if (booking.status === "cancelled") {
        return { background: "#94a3b8" };
      }

      // Prenotazione di un altro utente (anonima)
      if (booking.user_id !== highlightUserId && booking.coach_id !== highlightUserId) {
        return { background: "#94a3b8" };
      }

      switch (booking.type) {
        case "lezione_privata":
        case "lezione_gruppo":
          return { background: "var(--secondary)" };
        case "campo":
          // Mantieni il colore storico dei blocchi prima del passaggio al grigio.
          return { background: "var(--color-frozen-lake-900)" };
        case "arena":
          return { background: "var(--color-frozen-lake-600)" };
        default:
          return { background: "var(--secondary-light)" };
      }
    }

    // Colori default (admin/altre dashboard)
    if (booking.isBlock) {
      return { background: "var(--color-frozen-lake-900)" };
    }

    if (booking.status === "cancelled") {
      return { background: "#6b7280" };
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
  }

  function getBookingLabel(booking: Booking): string {
    if (booking.isBlock) return showBlockReason ? booking.reason || "Blocco Campo" : "Blocco Campo";
    if (booking.type === "lezione_privata") return "Lezione Privata";
    if (booking.type === "lezione_gruppo") return "Lezione Gruppo";
    if (booking.type === "arena") return "Match Arena";
    return "Campo";
  }

  function getBlockReasonLabel(booking: Booking): string {
    if (!showBlockReason) return "Blocco impostato";
    const reason = booking.reason?.trim() || booking.notes?.trim();
    return reason || "Motivazione non specificata";
  }

  function getBookingTypeIcon(booking: Booking) {
    if (booking.isBlock) return <Lock className="h-5 w-5 text-secondary flex-shrink-0" />;
    if (booking.type === "lezione_privata") return <User className="h-5 w-5 text-secondary flex-shrink-0" />;
    if (booking.type === "lezione_gruppo") return <Users className="h-5 w-5 text-secondary flex-shrink-0" />;
    if (booking.type === "arena") return <Swords className="h-5 w-5 text-secondary flex-shrink-0" />;
    return <CalendarIcon className="h-5 w-5 text-secondary flex-shrink-0" />;
  }

  function formatEntryTimeRange(booking: Booking): string {
    const start = new Date(booking.start_time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const end = new Date(booking.end_time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${start} - ${end}`;
  }

  function getEntryStatusLabel(booking: Booking): string {
    if (booking.isBlock) return "Campo bloccato";
    if (booking.status === "confirmed") return "Confermata";
    if (booking.status === "pending") return "In attesa";
    if (booking.status === "cancelled") return "Annullata";
    return booking.status;
  }

  function getEntryDetailsPath(booking: Booking): string {
    return booking.isBlock
      ? `${basePath}/courts/${booking.id}`
      : `${basePath}/bookings/${booking.id}`;
  }

  function canOpenEntry(booking: Booking): boolean {
    // In admin views (no highlighted user), keep existing behavior.
    if (!highlightUserId) return true;

    // In maestro/athlete contextual views, only own bookings are clickable.
    if (booking.isBlock) return false;
    return booking.user_id === highlightUserId || booking.coach_id === highlightUserId;
  }

  function openEntryModal(booking: Booking) {
    setSelectedEntry(booking);
    setEntryModalOpen(true);
  }

  function goToEntryDetails() {
    if (!selectedEntry) return;
    setEntryModalOpen(false);
    router.push(getEntryDetailsPath(selectedEntry));
  }

  function formatDateHeader(short: boolean = false): string {
    if (short) {
      const formatted = selectedDate.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      return formatted.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    const formatted = selectedDate.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return formatted.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function isToday(): boolean {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }

  function getBookingSlotRange(booking: Booking) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();

    const startSlot = (startHour - 7) * 2 + (startMinute >= 30 ? 1 : 0);
    const endSlot = (endHour - 7) * 2 + (endMinute > 0 ? (endMinute > 30 ? 2 : 1) : 0);
    const duration = endSlot - startSlot;

    return { startSlot, duration };
  }

  function mergeForeignSlotRanges(bookings: any[]): { startSlot: number; duration: number }[] {
    const ranges = bookings
      .map(b => getBookingSlotRange(b))
      .filter(r => r.startSlot >= 0 && r.duration > 0)
      .sort((a, b) => a.startSlot - b.startSlot);
    if (ranges.length === 0) return [];
    const merged: { startSlot: number; duration: number }[] = [];
    let current = { ...ranges[0] };
    for (let i = 1; i < ranges.length; i++) {
      const next = ranges[i];
      if (next.startSlot <= current.startSlot + current.duration) {
        const end = Math.max(current.startSlot + current.duration, next.startSlot + next.duration);
        current = { startSlot: current.startSlot, duration: end - current.startSlot };
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  const occupiedSource = fetchOccupied && allOccupiedBookings.length > 0
    ? allOccupiedBookings
    : bookingsForSelectedDate;
  const timelineColumnsCount = Math.max(courts.length, 1);
  const selectedEntryParticipants = useMemo(
    () => (selectedEntry ? getParticipantNames(selectedEntry) : []),
    [selectedEntry]
  );
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return {
        date,
        isCurrentMonth: date.getMonth() === calendarViewDate.getMonth(),
      };
    });
  }, [calendarViewDate]);

  return (
    <div className="space-y-4 font-sans">
      {/* Date Navigation */}
      <div className="rounded-lg p-3 sm:p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center transition-all bg-secondary">
        <button
          onClick={() => changeDate(-1)}
          className="justify-self-start h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
        >
          <span className="text-lg font-semibold text-white">&lt;</span>
        </button>
        
        <div className="min-w-0 flex justify-center">
          <button
            type="button"
            className="relative inline-flex items-center justify-center rounded-md px-1.5 sm:px-2 py-1 transition-colors hover:bg-white/10"
            title="Scegli data"
            onClick={openDatePickerModal}
          >
            <span className="inline-flex items-center justify-center sm:hidden" style={{ gap: "6px", transform: "translateX(-18px)" }}>
              <CalendarIcon className="h-5 w-5 text-white shrink-0" />
              <span
                className="font-bold text-white text-lg leading-none text-center whitespace-nowrap"
              >
                {formatDateHeader(true)}
              </span>
            </span>
            <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-2">
              <CalendarIcon className="h-5 w-5 text-white shrink-0" />
              <span
                className="font-bold text-white text-lg leading-none text-left min-w-0 truncate max-w-none capitalize"
              >
                {formatDateHeader()}
              </span>
            </span>
          </button>
        </div>

        <button
          onClick={() => changeDate(1)}
          className="justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-md transition-colors hover:bg-white/10 inline-flex items-center justify-center"
        >
          <span className="text-lg font-semibold text-white">&gt;</span>
        </button>
      </div>

      {/* Timeline Grid */}
      {loading ? (
        <div className="bg-white rounded-lg p-4 sm:p-6 md:p-12 text-center">
          <p className="text-secondary/60">Caricamento timeline...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {!swapAxes ? (
            <div
              ref={timelineScrollRef}
              className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div className="min-w-[3400px]">
                {/* Header Row with Time Slots */}
                <div className="flex bg-secondary rounded-lg mb-3">
                  <div className="w-[120px] flex-shrink-0 p-3 flex items-center justify-center">
                    <span className="font-bold text-white uppercase tracking-wide text-[11px]">Campo</span>
                  </div>
                  <div className="flex-1 grid timeline-grid" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                    {TIME_SLOTS.map((time) => (
                      <div
                        key={time}
                        className="p-3 text-center font-bold text-white text-sm flex items-center justify-center"
                      >
                        {time}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Court Rows */}
                <div className="space-y-3">
                {courts.map((court) => (
                  <div
                    key={court}
                    className="flex hover:bg-gray-50/50 transition-colors bg-white border border-gray-200 rounded-lg"
                  >
                    {/* Court Name */}
                    <div className="w-[120px] flex-shrink-0 p-3 bg-white font-bold text-secondary text-sm flex items-center justify-center border-r border-gray-200 rounded-l-lg">
                      {court}
                    </div>

                    {/* Time Slots Container */}
                    <div className="flex-1 grid timeline-grid relative" style={{ gridTemplateColumns: 'repeat(16, 1fr)', minHeight: '100px' }}>
                      {/* Prenotazioni esistenti come blocchi sovrapposti */}
                      {(() => {
                        const ownIds = new Set(bookingsForSelectedDate.filter(b => b.court === court).map(b => b.id));
                        const foreignBlocks: any[] = fetchOccupied
                          ? allOccupiedBookings.filter(b => b.court === court && !ownIds.has(b.id))
                          : [];
                        const ownBlocks = bookingsForSelectedDate.filter(b => b.court === court);
                        const mergedForeign = mergeForeignSlotRanges(foreignBlocks);
                        return [
                          ...ownBlocks.map((booking) => {
                            const { startSlot, duration } = getBookingSlotRange(booking);
                            if (startSlot < 0 || duration <= 0) return null;
                            const isLesson = booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
                            const isClickable = canOpenEntry(booking);
                            return (
                              <div
                                key={booking.id}
                                onClick={isClickable ? () => openEntryModal(booking) : undefined}
                                className={`absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md z-10 transition-[filter] duration-200 ${isClickable ? "hover:brightness-90 cursor-pointer" : "cursor-default"}`}
                                style={{
                                  ...getBookingStyle(booking),
                                  left: `${(startSlot / HALF_SLOTS_PER_DAY) * 100}%`,
                                  width: `calc(${(duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`,
                                  top: '4px',
                                  bottom: '4px',
                                  marginLeft: '2px'
                                }}
                                title={isClickable
                                  ? `Clicca per vedere i dettagli${booking.isBlock ? '' : ` - ${getBookingDisplayName(booking)}`}`
                                  : "Prenotazione non apribile"}
                              >
                                {booking.isBlock ? (
                                  <div className="truncate leading-tight text-white/95 uppercase tracking-wide text-[10px]">
                                    Blocco Campo
                                  </div>
                                ) : highlightUserId && booking.user_id !== highlightUserId && booking.coach_id !== highlightUserId ? (
                                  <div className="truncate leading-tight text-white/90 uppercase tracking-wide text-[10px]">
                                    {getBookingLabel(booking)}
                                  </div>
                                ) : (
                                  <>
                                    <div className="truncate leading-tight mt-0.5">
                                      {getBookingDisplayName(booking)}
                                    </div>
                                    {isLesson && booking.coach_profile && (
                                      <div className="truncate text-white/95 mt-0.5 text-[11px] leading-tight">
                                        {booking.coach_profile.full_name}
                                      </div>
                                    )}
                                    <div className="text-white/90 text-[10px] mt-0.5 uppercase tracking-wide leading-tight">
                                      {getBookingLabel(booking)}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          }),
                          ...mergedForeign.map((interval, i) => (
                            <div
                              key={`foreign-${i}`}
                              className="absolute rounded-md z-10 cursor-default"
                              style={{
                                background: '#d1d5db',
                                left: `${(interval.startSlot / HALF_SLOTS_PER_DAY) * 100}%`,
                                width: `calc(${(interval.duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`,
                                top: '4px',
                                bottom: '4px',
                                marginLeft: '2px'
                              }}
                              title="Slot occupato"
                            />
                          ))
                        ];
                      })()}

                      {/* Slot cliccabili - sempre 16 */}
                      {Array.from({ length: 16 }, (_, hourIndex) => {
                        const hour = 7 + hourIndex;
                        const time1 = `${hour.toString().padStart(2, '0')}:00`;
                        const time2 = `${hour.toString().padStart(2, '0')}:30`;
                        const isSelected1 = selectedSlots.some(s => s.court === court && s.time === time1);
                        const isSelected2 = selectedSlots.some(s => s.court === court && s.time === time2);

                        const isOccupied1 = occupiedSource.some(b => {
                          if (b.court !== court) return false;
                          const bookingStart = new Date(b.start_time);
                          const bookingEnd = new Date(b.end_time);
                          const slotTime = new Date(selectedDate);
                          slotTime.setHours(hour, 0, 0, 0);
                          return slotTime >= bookingStart && slotTime < bookingEnd;
                        });

                        const isOccupied2 = occupiedSource.some(b => {
                          if (b.court !== court) return false;
                          const bookingStart = new Date(b.start_time);
                          const bookingEnd = new Date(b.end_time);
                          const slotTime = new Date(selectedDate);
                          slotTime.setHours(hour, 30, 0, 0);
                          return slotTime >= bookingStart && slotTime < bookingEnd;
                        });

                        return (
                          <div
                            key={`${court}-${hour}`}
                            className="border-r border-gray-200 last:border-r-0 relative flex"
                          >
                            {/* Prima metà - :00 */}
                            <div
                              onClick={() => !isOccupied1 && toggleSlotSelection(court, time1)}
                              className={`flex-1 transition-colors ${
                                isOccupied1
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : isSelected1
                                  ? 'bg-secondary cursor-pointer'
                                  : 'bg-white hover:bg-emerald-50/40 cursor-pointer'
                              }`}
                            />
                            {/* Seconda metà - :30 */}
                            <div
                              onClick={() => !isOccupied2 && toggleSlotSelection(court, time2)}
                              className={`flex-1 transition-colors ${
                                isOccupied2
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : isSelected2
                                  ? 'bg-secondary cursor-pointer'
                                  : 'bg-white hover:bg-emerald-50/40 cursor-pointer'
                              }`}
                            />
                            {/* Tacchetta centrale */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                </div>
              </div>
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
              <div className="min-w-[1040px]">
                <div className="flex bg-secondary rounded-t-lg border border-secondary overflow-hidden">
                  <div className="w-[90px] flex-shrink-0 p-3 flex items-center justify-center border-r border-white/15">
                    <span className="font-bold text-white uppercase tracking-wide text-[11px]">Ora</span>
                  </div>
                  <div className="flex-1 grid timeline-grid" style={{ gridTemplateColumns: `repeat(${timelineColumnsCount}, minmax(140px, 1fr))` }}>
                    {courts.map((court) => (
                      <div
                        key={`header-${court}`}
                        className="p-3 text-center font-bold text-white text-xs flex items-center justify-center border-r border-white/15 last:border-r-0"
                      >
                        {court}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex bg-white border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <div className="w-[90px] flex-shrink-0 bg-white border-r border-gray-200">
                    {TIME_SLOTS.map((time, hourIndex) => (
                      <div
                        key={`time-row-${time}`}
                        className={`font-bold text-secondary text-xs flex items-center justify-center ${hourIndex === TIME_SLOTS.length - 1 ? '' : 'border-b border-gray-200'}`}
                        style={{ height: `${TIMELINE_ROW_HEIGHT}px` }}
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative">
                    <div className="grid timeline-grid" style={{ gridTemplateColumns: `repeat(${timelineColumnsCount}, minmax(140px, 1fr))` }}>
                      {TIME_SLOTS.map((_, hourIndex) => {
                        const hour = 7 + hourIndex;

                        return courts.map((court, courtIndex) => {
                          const time1 = `${hour.toString().padStart(2, '0')}:00`;
                          const time2 = `${hour.toString().padStart(2, '0')}:30`;
                          const isSelected1 = selectedSlots.some(s => s.court === court && s.time === time1);
                          const isSelected2 = selectedSlots.some(s => s.court === court && s.time === time2);

                          const isOccupied1 = occupiedSource.some(b => {
                            if (b.court !== court) return false;
                            const bookingStart = new Date(b.start_time);
                            const bookingEnd = new Date(b.end_time);
                            const slotTime = new Date(selectedDate);
                            slotTime.setHours(hour, 0, 0, 0);
                            return slotTime >= bookingStart && slotTime < bookingEnd;
                          });

                          const isOccupied2 = occupiedSource.some(b => {
                            if (b.court !== court) return false;
                            const bookingStart = new Date(b.start_time);
                            const bookingEnd = new Date(b.end_time);
                            const slotTime = new Date(selectedDate);
                            slotTime.setHours(hour, 30, 0, 0);
                            return slotTime >= bookingStart && slotTime < bookingEnd;
                          });

                          return (
                            <div
                              key={`${court}-${hour}-swap`}
                              className={`relative flex flex-col border-r border-gray-200 ${courtIndex === courts.length - 1 ? 'border-r-0' : ''} ${hourIndex === TIME_SLOTS.length - 1 ? '' : 'border-b border-gray-200'}`}
                              style={{ height: `${TIMELINE_ROW_HEIGHT}px` }}
                            >
                              <div
                                onClick={() => !isOccupied1 && toggleSlotSelection(court, time1)}
                                className={`flex-1 transition-colors ${
                                  isOccupied1
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : isSelected1
                                    ? 'bg-secondary cursor-pointer'
                                    : 'bg-white hover:bg-emerald-50/40 cursor-pointer'
                                }`}
                              />
                              <div
                                onClick={() => !isOccupied2 && toggleSlotSelection(court, time2)}
                                className={`flex-1 transition-colors border-t border-gray-200/70 ${
                                  isOccupied2
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : isSelected2
                                    ? 'bg-secondary cursor-pointer'
                                    : 'bg-white hover:bg-emerald-50/40 cursor-pointer'
                                }`}
                              />
                              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px bg-gray-300" />
                            </div>
                          );
                        });
                      })}
                    </div>

                    <div className="absolute inset-0 pointer-events-none">
                      {courts.flatMap((court, courtIndex) => {
                        const ownIds = new Set(bookingsForSelectedDate.filter(b => b.court === court).map(b => b.id));
                        const foreignBlocks: any[] = fetchOccupied
                          ? allOccupiedBookings.filter(b => b.court === court && !ownIds.has(b.id))
                          : [];
                        const ownBlocks = bookingsForSelectedDate.filter(b => b.court === court);
                        const mergedForeign = mergeForeignSlotRanges(foreignBlocks);
                        return [
                          ...ownBlocks.map((booking) => {
                            const { startSlot, duration } = getBookingSlotRange(booking);
                            if (startSlot < 0 || duration <= 0) return null;
                            const isLesson = booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
                            const isClickable = canOpenEntry(booking);
                            return (
                              <div
                                key={`swap-${court}-${booking.id}`}
                                onClick={isClickable ? () => openEntryModal(booking) : undefined}
                                className={`absolute pointer-events-auto px-2 py-1.5 text-white text-xs font-bold flex flex-col justify-center rounded-md z-10 transition-[filter] duration-200 ${isClickable ? "hover:brightness-90 cursor-pointer" : "cursor-default"}`}
                                style={{
                                  ...getBookingStyle(booking),
                                  left: `calc(${(courtIndex / timelineColumnsCount) * 100}% + 2px)`,
                                  width: `calc(${(1 / timelineColumnsCount) * 100}% - 4px)`,
                                  top: `calc(${(startSlot / HALF_SLOTS_PER_DAY) * 100}% + 2px)`,
                                  height: `calc(${(duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`
                                }}
                                title={isClickable
                                  ? `Clicca per vedere i dettagli${booking.isBlock ? '' : ` - ${getBookingDisplayName(booking)}`}`
                                  : "Prenotazione non apribile"}
                              >
                                {booking.isBlock ? (
                                  <div className="truncate leading-tight text-white/95 uppercase tracking-wide text-[10px]">
                                    Blocco Campo
                                  </div>
                                ) : highlightUserId && booking.user_id !== highlightUserId && booking.coach_id !== highlightUserId ? (
                                  <div className="truncate leading-tight text-white/90 uppercase tracking-wide text-[10px]">
                                    {getBookingLabel(booking)}
                                  </div>
                                ) : (
                                  <>
                                    <div className="truncate leading-tight mt-0.5">
                                      {getBookingDisplayName(booking)}
                                    </div>
                                    {isLesson && booking.coach_profile && (
                                      <div className="truncate text-white/95 mt-0.5 text-[11px] leading-tight">
                                        {booking.coach_profile.full_name}
                                      </div>
                                    )}
                                    <div className="text-white/90 text-[10px] mt-0.5 uppercase tracking-wide leading-tight">
                                      {getBookingLabel(booking)}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          }),
                          ...mergedForeign.map((interval, i) => (
                            <div
                              key={`swap-foreign-${court}-${i}`}
                              className="absolute pointer-events-auto rounded-md z-10 cursor-default"
                              style={{
                                background: '#d1d5db',
                                left: `calc(${(courtIndex / timelineColumnsCount) * 100}% + 2px)`,
                                width: `calc(${(1 / timelineColumnsCount) * 100}% - 4px)`,
                                top: `calc(${(interval.startSlot / HALF_SLOTS_PER_DAY) * 100}% + 2px)`,
                                height: `calc(${(interval.duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`
                              }}
                              title="Slot occupato"
                            />
                          ))
                        ];
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          {selectedSlots.length > 0 && (
            <div className="mt-6">
              <button
                onClick={handleBookSlots}
                className="w-full px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <CalendarIcon className="h-5 w-5" />
                Prenota Campo ({selectedSlots.length} slot selezionat{selectedSlots.length === 1 ? 'o' : 'i'})
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Seleziona Data</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Scegli il giorno da visualizzare nella timeline.
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

      <Modal open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <ModalContent size="md" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">
              {selectedEntry?.isBlock ? "Dettaglio Blocco Campo" : "Dettaglio Prenotazione"}
            </ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Informazioni complete dello slot selezionato.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="px-0 py-0 bg-white dark:!bg-white">
            {selectedEntry && (
              <div className="text-sm bg-white dark:!bg-white divide-y divide-gray-200">
                <div className="px-4 py-3 bg-white">
                  <div className="flex gap-3 items-center">
                    {getBookingTypeIcon(selectedEntry)}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedEntry.isBlock ? "Blocco campo" : getBookingLabel(selectedEntry)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Campo</span>
                  <span className="text-xs text-gray-600">{selectedEntry.court}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Orario</span>
                  <span className="text-xs text-gray-600">{formatEntryTimeRange(selectedEntry)}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Stato</span>
                  <span className="text-xs text-gray-600">{getEntryStatusLabel(selectedEntry)}</span>
                </div>

                {!selectedEntry.isBlock && selectedEntryParticipants.length > 0 && (
                  <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                    <span className="text-xs font-semibold text-gray-900">
                      {selectedEntryParticipants.length > 1 ? "Partecipanti" : "Partecipante"}
                    </span>
                    <div className="text-xs text-gray-600 space-y-1">
                      {selectedEntryParticipants.map((name, idx) => (
                        <p key={`${selectedEntry.id}-participant-${idx}`}>{name}</p>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedEntry.isBlock && selectedEntry.coach_profile?.full_name && (
                  <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                    <span className="text-xs font-semibold text-gray-900">Coach</span>
                    <span className="text-xs text-gray-600">{selectedEntry.coach_profile.full_name}</span>
                  </div>
                )}

                {(selectedEntry.notes || selectedEntry.reason) && (
                  <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                    <span className="text-xs font-semibold text-gray-900">Note</span>
                    <span className="text-xs text-gray-600">{selectedEntry.notes || selectedEntry.reason}</span>
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
