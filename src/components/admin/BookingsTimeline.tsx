"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Users, Swords, Lock, GraduationCap } from "lucide-react";
import { useDragScroll } from "./hooks/useDragScroll";
import { useTimelineData, type Booking } from "./hooks/useTimelineData";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

type BookingsTimelineProps = {
  bookings: Booking[];
  loading: boolean;
  basePath?: string; // Optional base path for navigation (default: /dashboard/admin)
  fetchOccupied?: boolean; // When true, fetches ALL bookings via API to show occupied slots from other users
  swapAxes?: boolean; // When true, shows time on Y axis and courts on X axis
  showBlockReason?: boolean;
  showCourtBlocks?: boolean;
  highlightUserId?: string; // When set, bookings where this user is athlete are styled differently
  showBookingContent?: boolean; // When false, shows only colored slot blocks without text labels
  showCourses?: boolean; // When false, hides course lessons from the timeline
  showEntryModal?: boolean; // When false, clicking a booking navigates directly instead of opening the modal
  scrollToCurrentTime?: boolean; // When true, scrolls the timeline to the current time on mount
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

export default function BookingsTimeline({ bookings: allBookings, loading: parentLoading, basePath = "/dashboard/admin", fetchOccupied = false, swapAxes = false, showBlockReason = true, showCourtBlocks = true, highlightUserId, showBookingContent = true, showCourses = true, showEntryModal = true, scrollToCurrentTime = false }: BookingsTimelineProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [selectedSlots, setSelectedSlots] = useState<{ court: string; time: string }[]>([]);
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

  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDragScroll();
  const { courts, courtsLoading, courtBlocks, blocksLoading, courseEntries, allOccupiedBookings } = useTimelineData({
    selectedDate,
    showCourses,
    showCourtBlocks,
    fetchOccupied,
    highlightUserId,
  });

  const getPrimaryParticipant = (booking: Booking) =>
    booking.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const getBookingDisplayName = (booking: Booking) =>
    getPrimaryParticipant(booking)?.full_name || booking.user_profile?.full_name || "Sconosciuto";

  const getCourseInstructorName = (booking: Booking) => {
    if (!booking.isCourse) return null;
    return booking.coach_profile?.full_name || booking.user_profile?.full_name || null;
  };

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

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollToCurrentTime || parentLoading || blocksLoading || courtsLoading) return;
    const raf = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const COLUMN_WIDTH = 205;
      const START_HOUR = 7;
      const hoursFromStart = Math.max(0, hour - START_HOUR) + minutes / 60;
      const scrollPos = Math.max(0, (hoursFromStart - 2) * COLUMN_WIDTH);
      scrollRef.current.scrollLeft = scrollPos;
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollToCurrentTime, parentLoading, blocksLoading, courtsLoading, scrollRef]);

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

    // Merge bookings, blocks and courses
    const allEntries = [...filteredBookings, ...courtBlocks, ...courseEntries].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return allEntries;
  }, [allBookings, selectedDate, courtBlocks, courseEntries]);

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
    if (selectedSlots.length === 0) {
      router.push(`${basePath}/bookings/new`);
      return;
    }

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
    const isArenaBooking =
      booking.type === "arena" || booking.notes?.toLowerCase().includes("sfida arena");

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

      // Corso del maestro — colore corso
      if (booking.isCourse) {
        return { background: "#075985" };
      }

      const isCoach = booking.coach_id === highlightUserId;
      if (isCoach) {
        switch (booking.type) {
          case "lezione_privata":
          case "lezione_gruppo":
            return { background: "#023047" }; // blu scuro — sei il maestro
          case "campo":
            return { background: isArenaBooking ? "#023b52" : "var(--color-frozen-lake-600)" }; // teal medio
          case "arena":
            return { background: "var(--color-frozen-lake-600)" };
          default:
            return { background: "#023047" };
        }
      }
      // sei l'atleta
      switch (booking.type) {
        case "lezione_privata":
        case "lezione_gruppo":
          return { background: "#023047" }; // blu scuro — hai una lezione
        case "campo":
          return { background: isArenaBooking ? "#023b52" : "var(--secondary)" }; // verde — hai prenotato un campo
        case "arena":
          return { background: "var(--color-frozen-lake-600)" };
        default:
          return { background: "var(--secondary-light)" };
      }
    }

    // Colori default (admin/altre dashboard)
    if (booking.isCourse) return { background: "var(--color-frozen-lake-900)" };

    if (booking.isBlock) {
      return { background: "#075985" };
    }

    if (booking.status === "cancelled") {
      return { background: "#6b7280" };
    }

    switch (booking.type) {
      case "lezione_privata":
      case "lezione_gruppo":
        return { background: "#023047" };
      case "campo":
        return { background: isArenaBooking ? "#023b52" : "var(--secondary)" };
      case "arena":
        return { background: "var(--color-frozen-lake-600)" };
      default:
        return { background: "var(--secondary-light)" };
    }
  }

  function getBookingLabel(booking: Booking, asCoach?: boolean): string {
    const isArenaBooking =
      booking.type === "arena" || booking.notes?.toLowerCase().includes("sfida arena");

    if (booking.isCourse) return "Corso";
    if (booking.isBlock) return showBlockReason ? booking.reason || "Blocco Campo" : "Blocco Campo";
    if (booking.type === "lezione_privata") return asCoach ? "Lezione Privata" : "Lezione Privata";
    if (booking.type === "lezione_gruppo") return asCoach ? "Lezione Gruppo" : "Lezione Gruppo";
    if (isArenaBooking) return "Arena";
    return "Campo";
  }

  function getBlockReasonLabel(booking: Booking): { text: string; isAltro: boolean } {
    if (!showBlockReason) return { text: "Blocco impostato", isAltro: false };
    const reason = (booking.reason?.trim() || booking.notes?.trim()) ?? "";
    if (!reason) return { text: "Motivazione non specificata", isAltro: false };
    // "Altro (custom)" or "Altro (custom) - notes"
    const altroParens = reason.match(/^Altro\s*\(([^)]+)\)(?:\s*-\s*(.+))?$/i);
    if (altroParens) {
      const custom = altroParens[1]?.trim() || "";
      const notes = altroParens[2]?.trim() || "";
      return { text: notes ? `${custom} - ${notes}` : custom, isAltro: true };
    }
    // "Altro - notes" or just "Altro"
    const altroSimple = reason.match(/^Altro(?:\s*[-–]\s*(.+))?$/i);
    if (altroSimple) {
      const notes = altroSimple[1]?.trim() || "";
      return { text: notes || "Altro", isAltro: true };
    }
    return { text: reason, isAltro: false };
  }

  function getBookingTypeIcon(booking: Booking) {
    if (booking.isCourse) return <GraduationCap className="h-5 w-5 text-secondary flex-shrink-0" />;
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
    if (booking.isCourse) return `${basePath}/corsi/${booking.id}`;
    return booking.isBlock
      ? `${basePath}/courts/${booking.id}`
      : `${basePath}/bookings/${booking.id}`;
  }

  function canOpenEntry(booking: Booking): boolean {
    // In admin views (no highlighted user), keep existing behavior.
    if (!highlightUserId) return true;

    // In maestro/athlete contextual views, only own bookings are clickable.
    if (booking.isBlock) return false;
    if (booking.isCourse) return booking.coach_id === highlightUserId;
    return booking.user_id === highlightUserId || booking.coach_id === highlightUserId;
  }

  function openEntryModal(booking: Booking) {
    if (!showEntryModal || booking.isCourse) {
      router.push(getEntryDetailsPath(booking));
      return;
    }
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
            <span className="inline-flex items-center justify-center sm:hidden" style={{ gap: "6px" }}>
              <span
                className="font-bold text-white text-xl leading-none text-center whitespace-nowrap"
              >
                {formatDateHeader(true)}
              </span>
            </span>
            <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-2">
              <span
                className="font-bold text-white text-xl leading-none text-left min-w-0 truncate max-w-none capitalize"
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
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
              <div className="min-w-[3280px]">
                {/* Header Row with Time Slots */}
                <div className="flex mb-3">
                  <div className="sticky left-0 z-20 flex-shrink-0 w-[70px] bg-secondary rounded-l-lg shadow-sm" style={{ height: '52px' }} />
                  <div className="bg-secondary rounded-r-lg shadow-sm flex-1">
                    <div className="grid timeline-grid" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                      {TIME_SLOTS.map((time) => (
                        <div
                          key={time}
                          className="p-3 text-center font-bold text-white text-xl whitespace-nowrap flex items-center justify-center"
                        >
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Court Rows */}
                <div className="space-y-3">
                {courts.map((court) => (
                  <div
                    key={court}
                    className="flex"
                  >
                    {/* Sticky court label */}
                    <div className="sticky left-0 z-20 flex-shrink-0 w-[70px] bg-secondary rounded-lg p-3 flex items-center justify-center shadow-sm border border-black/5" style={{ minHeight: '70px' }}>
                      <span className="text-xl font-bold text-white tabular-nums">
                        {court.replace(/^Campo\s+/i, "")}
                      </span>
                    </div>
                    {/* Time Slots Container */}
                    <div className="grid timeline-grid relative bg-white border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-50/50 transition-colors flex-1" style={{ gridTemplateColumns: 'repeat(16, 1fr)', minHeight: '70px' }}>
                      {/* Prenotazioni esistenti come blocchi sovrapposti */}
                      {(() => {
                        const ownIds = new Set(bookingsForSelectedDate.filter(b => b.court === court).map(b => b.id));
                        const foreignBlocks: any[] = fetchOccupied
                          ? allOccupiedBookings.filter(b => b.court === court && !ownIds.has(b.id))
                          : [];
                        const ownBlocks = bookingsForSelectedDate.filter(b => b.court === court);
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
                                className={`absolute p-2 text-white text-[11px] font-bold flex flex-col justify-center rounded-md z-10 transition-[filter] duration-200 ${isClickable ? "hover:brightness-90 cursor-pointer" : "cursor-default"}`}
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
                                {showBookingContent ? (
                                  booking.isCourse ? (
                                    highlightUserId && booking.coach_id !== highlightUserId ? (
                                      <div className="truncate leading-tight text-white/90 uppercase tracking-wide text-[10px]">
                                        Corso
                                      </div>
                                    ) : (
                                      <>
                                        <div className="truncate leading-tight mt-0.5">{booking.notes}</div>
                                        {getCourseInstructorName(booking) && (
                                          <div className="truncate text-white/80 mt-0.5 text-[9px] leading-tight">{getCourseInstructorName(booking)}</div>
                                        )}
                                        <div className="text-white/90 text-[8px] mt-0.5 uppercase tracking-wide leading-tight">Corso</div>
                                      </>
                                    )
                                  ) : booking.isBlock ? (
                                    highlightUserId ? (
                                      <div className="truncate text-white/90 uppercase tracking-wide text-[10px] leading-tight">
                                        Blocco Campo
                                      </div>
                                    ) : (() => {
                                      const { text: blockText } = getBlockReasonLabel(booking);
                                      return (
                                        <>
                                          <div className="truncate leading-tight text-white/95 text-[10px] leading-tight">
                                            {blockText}
                                          </div>
                                          <div className="truncate text-white/75 text-[10px] leading-tight mt-0.5 uppercase tracking-wide">
                                            Blocco Campo
                                          </div>
                                        </>
                                      );
                                    })()
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
                                        <div className="truncate text-white/95 mt-0.5 text-[9px] leading-tight">
                                          {booking.coach_profile.full_name}
                                        </div>
                                      )}
                                      <div className="text-white/90 text-[8px] mt-0.5 uppercase tracking-wide leading-tight">
                                        {getBookingLabel(booking, highlightUserId ? booking.coach_id === highlightUserId : undefined)}
                                      </div>
                                    </>
                                  )
                                ) : null}
                              </div>
                            );
                          }),
                          ...foreignBlocks.map((fb, i) => {
                            const { startSlot, duration } = getBookingSlotRange(fb);
                            if (startSlot < 0 || duration <= 0) return null;
                            const label = fb.isBlock ? 'Blocco Campo' : getBookingLabel(fb);
                            return (
                              <div
                                key={`foreign-${i}`}
                                className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md z-10 cursor-default"
                                style={{
                                  background: '#94a3b8',
                                  left: `${(startSlot / HALF_SLOTS_PER_DAY) * 100}%`,
                                  width: `calc(${(duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`,
                                  top: '4px',
                                  bottom: '4px',
                                  marginLeft: '2px'
                                }}
                                title={label}
                              >
                                <div className="truncate text-white/90 uppercase tracking-wide text-[10px] leading-tight">
                                  {label}
                                </div>
                              </div>
                            );
                          })
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
              ref={scrollRef}
              className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div className="min-w-[1040px]">
                <div className="flex bg-secondary rounded-t-lg border border-secondary overflow-hidden shadow-sm">
                  <div className="w-[90px] flex-shrink-0 p-3 flex items-center justify-center border-r border-white/15">
                    <span className="font-bold text-white uppercase tracking-wide text-[11px]">Ora</span>
                  </div>
                  <div className="flex-1 grid timeline-grid" style={{ gridTemplateColumns: `repeat(${timelineColumnsCount}, minmax(140px, 1fr))` }}>
                    {courts.map((court) => (
                      <div
                        key={`header-${court}`}
                        className="p-3 text-center font-bold text-white text-xs flex items-center justify-center border-r border-white/15 last:border-r-0"
                      >
                        {court.replace(/^Campo\s+/i, "")}
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
                                {showBookingContent ? (
                                  booking.isCourse ? (
                                    highlightUserId && booking.coach_id !== highlightUserId ? (
                                      <div className="truncate leading-tight text-white/90 uppercase tracking-wide text-[10px]">
                                        Corso
                                      </div>
                                    ) : (
                                      <>
                                        <div className="truncate leading-tight mt-0.5">{booking.notes}</div>
                                        {getCourseInstructorName(booking) && (
                                          <div className="truncate text-white/80 mt-0.5 text-[9px] leading-tight">{getCourseInstructorName(booking)}</div>
                                        )}
                                        <div className="text-white/90 text-[8px] mt-0.5 uppercase tracking-wide leading-tight">Corso</div>
                                      </>
                                    )
                                  ) : booking.isBlock ? (
                                    highlightUserId ? (
                                      <div className="truncate text-white/90 uppercase tracking-wide text-[10px] leading-tight">
                                        Blocco Campo
                                      </div>
                                    ) : (() => {
                                      const { text: blockText } = getBlockReasonLabel(booking);
                                      return (
                                        <>
                                          <div className="truncate leading-tight text-white/95 text-[10px] leading-tight">
                                            {blockText}
                                          </div>
                                          <div className="truncate text-white/75 text-[10px] leading-tight mt-0.5 uppercase tracking-wide">
                                            Blocco Campo
                                          </div>
                                        </>
                                      );
                                    })()
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
                                        <div className="truncate text-white/95 mt-0.5 text-[9px] leading-tight">
                                          {booking.coach_profile.full_name}
                                        </div>
                                      )}
                                      <div className="text-white/90 text-[8px] mt-0.5 uppercase tracking-wide leading-tight">
                                        {getBookingLabel(booking, highlightUserId ? booking.coach_id === highlightUserId : undefined)}
                                      </div>
                                    </>
                                  )
                                ) : null}
                              </div>
                            );
                          }),
                          ...foreignBlocks.map((fb, i) => {
                            const { startSlot, duration } = getBookingSlotRange(fb);
                            if (startSlot < 0 || duration <= 0) return null;
                            const label = fb.isBlock ? 'Blocco Campo' : getBookingLabel(fb);
                            return (
                              <div
                                key={`swap-foreign-${court}-${i}`}
                                className="absolute pointer-events-auto px-2 py-1.5 text-white text-xs font-bold flex flex-col justify-center rounded-md z-10 cursor-default"
                                style={{
                                  background: '#94a3b8',
                                  left: `calc(${(courtIndex / timelineColumnsCount) * 100}% + 2px)`,
                                  width: `calc(${(1 / timelineColumnsCount) * 100}% - 4px)`,
                                  top: `calc(${(startSlot / HALF_SLOTS_PER_DAY) * 100}% + 2px)`,
                                  height: `calc(${(duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`
                                }}
                                title={label}
                              >
                                <div className="truncate text-white/90 uppercase tracking-wide text-[10px] leading-tight">
                                  {label}
                                </div>
                              </div>
                            );
                          })
                        ];
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          <div className="mt-6">
              <button
                onClick={handleBookSlots}
                disabled={false}
                className="w-full px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Prenota Campo
                {selectedSlots.length > 0 && (
                  <span className="text-white/70 font-normal text-sm">· {selectedSlots.length} slot selezionat{selectedSlots.length === 1 ? 'o' : 'i'}</span>
                )}
              </button>
            </div>
        </div>
      )}

      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" showBuiltinClose={false} className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200">
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
        <ModalContent size="md" showBuiltinClose={false} className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200">
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="text-white text-base sm:text-lg">
              {selectedEntry?.isBlock
                ? "Blocco Campo"
                : selectedEntry
                ? selectedEntry.type === "campo"
                  ? "Prenotazione Campo"
                  : getBookingLabel(selectedEntry)
                : "Dettaglio Prenotazione"}
            </ModalTitle>
          </ModalHeader>

          <ModalBody className="px-0 py-0 bg-white dark:!bg-white">
            {selectedEntry && (
              <div className="text-sm bg-white dark:!bg-white divide-y divide-gray-200">
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
