"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Users, Swords, Lock, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useDragScroll } from "./hooks/useDragScroll";
import { useBookingDrag, type DragTarget } from "./hooks/useBookingDrag";
import { useTimelineData, type Booking } from "./hooks/useTimelineData";
import DateNavigator from "@/components/bookings/DateNavigator";
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
  enableDragEdit?: boolean; // When true, bookings can be moved/resized via drag & drop (admin, or maestro on own bookings)
  onBookingsChanged?: () => void; // Called after a successful move/resize so the parent can refetch
};

const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00"
];

const HALF_SLOTS_PER_DAY = TIME_SLOTS.length * 2;
const TIMELINE_ROW_HEIGHT = 92;

export default function BookingsTimeline({ bookings: allBookings, loading: parentLoading, basePath = "/dashboard/admin", fetchOccupied = false, swapAxes = false, showBlockReason = true, showCourtBlocks = true, highlightUserId, showBookingContent = true, showCourses = true, showEntryModal = true, scrollToCurrentTime = false, enableDragEdit = false, onBookingsChanged }: BookingsTimelineProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [selectedSlots, setSelectedSlots] = useState<{ court: string; time: string }[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Booking | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  // Spostamenti/resize in sospeso: applicati solo visivamente finché l'utente
  // non preme "Salva modifiche" (che li invia) o "Annulla" (che li scarta).
  const [pendingMoves, setPendingMoves] = useState<Record<string, { court: string; start_time: string; end_time: string }>>({});
  const [savingMoves, setSavingMoves] = useState(false);
  const pendingMovesCount = Object.keys(pendingMoves).length;
  const hasPendingMoves = enableDragEdit && pendingMovesCount > 0;

  // Modifiche già salvate ma non ancora riflesse nei dati del parent: le teniamo
  // applicate finché il refetch non arriva, così i blocchi non "tornano indietro".
  const [savedOverrides, setSavedOverrides] = useState<Record<string, { court: string; start_time: string; end_time: string }>>({});

  useEffect(() => {
    setSavedOverrides({});
  }, [allBookings]);

  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDragScroll();
  const { courts, courtsLoading, courtBlocks, blocksLoading, courseEntries, allOccupiedBookings } = useTimelineData({
    selectedDate,
    showCourses,
    showCourtBlocks,
    fetchOccupied,
    highlightUserId,
  });

  const { dragState, startDrag, consumeClickSuppression } = useBookingDrag({
    enabled: enableDragEdit,
    halfSlotsPerDay: HALF_SLOTS_PER_DAY,
    isRangeFree,
    onCommit: stagePendingMove,
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

    const filteredBookings = allBookings
      .map((booking) => {
        const override = pendingMoves[booking.id] || savedOverrides[booking.id];
        return override ? { ...booking, ...override } : booking;
      })
      .filter((booking) => {
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
  }, [allBookings, selectedDate, courtBlocks, courseEntries, pendingMoves, savedOverrides]);

  const loading = parentLoading || blocksLoading || courtsLoading;

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    setSelectedSlots([]); // Reset selection when changing date
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

  // Converte un mezzo-slot (indice 0..31, ognuno 30 min a partire dalle 07:00)
  // nelle date ISO di inizio/fine sulla data selezionata.
  function slotToTimes(startSlot: number, duration: number) {
    const start = new Date(selectedDate);
    start.setHours(7 + Math.floor(startSlot / 2), (startSlot % 2) * 30, 0, 0);
    const end = new Date(start.getTime() + duration * 30 * 60 * 1000);
    return { start, end };
  }

  function slotRangeLabel(startSlot: number, duration: number): string {
    const { start, end } = slotToTimes(startSlot, duration);
    const fmt = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(start)} - ${fmt(end)}`;
  }

  // Vero se sul campo il range [startSlot, startSlot+duration) è libero,
  // ignorando la prenotazione con id = excludeId. Usato durante il drag.
  function isRangeFree(court: string, startSlot: number, duration: number, excludeId: string): boolean {
    if (startSlot < 0 || duration <= 0 || startSlot + duration > HALF_SLOTS_PER_DAY) return false;
    const entries =
      fetchOccupied && allOccupiedBookings.length > 0
        ? [...bookingsForSelectedDate, ...(allOccupiedBookings as Booking[])]
        : bookingsForSelectedDate;
    for (const b of entries) {
      if (b.court !== court || b.id === excludeId) continue;
      if (b.status === "cancelled") continue;
      const range = getBookingSlotRange(b);
      if (range.startSlot < 0 || range.duration <= 0) continue;
      if (startSlot < range.startSlot + range.duration && startSlot + duration > range.startSlot) {
        return false;
      }
    }
    return true;
  }

  // Un blocco è trascinabile solo se il drag è abilitato, non è un corso/blocco/
  // annullata, e (per maestro/atleta) appartiene all'utente evidenziato.
  function canDragBooking(booking: Booking): boolean {
    if (!enableDragEdit) return false;
    if (booking.isBlock || booking.isCourse) return false;
    if (booking.status === "cancelled") return false;
    if (!highlightUserId) return true; // contesto admin/gestore
    return booking.user_id === highlightUserId || booking.coach_id === highlightUserId;
  }

  // Spostamento/resize: registra la modifica in sospeso, senza salvarla.
  // Se il blocco torna dov'era già salvato la modifica viene rimossa.
  function stagePendingMove(bookingId: string, target: DragTarget) {
    const original = allBookings.find((b) => b.id === bookingId);
    if (!original) return;

    // Riferimento = ultimo stato persistito: l'override salvato se il parent non
    // ha ancora ricaricato, altrimenti il dato originale.
    const persisted = savedOverrides[bookingId] || original;

    const { start, end } = slotToTimes(target.startSlot, target.duration);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const isBackToPersisted =
      persisted.court === target.court &&
      new Date(persisted.start_time).getTime() === start.getTime() &&
      new Date(persisted.end_time).getTime() === end.getTime();

    setPendingMoves((prev) => {
      const next = { ...prev };
      if (isBackToPersisted) {
        delete next[bookingId];
      } else {
        next[bookingId] = { court: target.court, start_time: startISO, end_time: endISO };
      }
      return next;
    });
  }

  function resetPendingMoves() {
    if (pendingMovesCount === 0) return;
    setPendingMoves({});
    toast.info("Modifiche annullate");
  }

  // Invia le modifiche in sospeso passando dal PUT (stesso workflow della pagina
  // di modifica: email ai destinatari, notifica all'atleta, activity log).
  //
  // Le PUT vanno una alla volta: il vincolo anti-overlap valuta lo stato reale
  // del DB, non quello mostrato a schermo. Con più passate le catene di
  // spostamenti (A→slot libero, B→slot di A) si risolvono da sole; restano
  // fuori solo gli scambi circolari veri e propri, che segnaliamo.
  async function savePendingMoves() {
    if (pendingMovesCount === 0 || savingMoves) return;

    setSavingMoves(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      let remaining = Object.entries(pendingMoves);
      const saved: Record<string, { court: string; start_time: string; end_time: string }> = {};
      let savedCount = 0;
      let lastError: string | null = null;

      while (remaining.length > 0) {
        const stillPending: typeof remaining = [];

        for (const [bookingId, move] of remaining) {
          try {
            const res = await fetch(`/api/bookings?id=${bookingId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(move),
            });

            if (res.ok) {
              saved[bookingId] = move;
              savedCount++;
            } else {
              const payload = await res.json().catch(() => ({}));
              lastError = payload?.error || "Impossibile salvare la modifica";
              stillPending.push([bookingId, move]);
            }
          } catch {
            lastError = "Errore di rete durante il salvataggio";
            stillPending.push([bookingId, move]);
          }
        }

        // Nessun progresso in questa passata: le rimanenti sono in conflitto
        // reciproco, inutile insistere.
        if (stillPending.length === remaining.length) {
          remaining = stillPending;
          break;
        }
        remaining = stillPending;
      }

      // Restano in sospeso solo le modifiche non salvate, così l'utente può
      // correggerle senza rifare tutto. Quelle salvate restano applicate come
      // override finché il parent non ricarica i dati.
      setPendingMoves(Object.fromEntries(remaining));
      setSavedOverrides((prev) => ({ ...prev, ...saved }));

      if (remaining.length === 0) {
        toast.success(
          savedCount === 1 ? "Prenotazione aggiornata" : `${savedCount} prenotazioni aggiornate`
        );
      } else if (savedCount > 0) {
        toast.warning(
          `${savedCount} salvate, ${remaining.length} non salvate. ${lastError || ""}`.trim()
        );
      } else {
        toast.error(lastError || "Impossibile salvare le modifiche");
      }

      if (savedCount > 0) onBookingsChanged?.();
    } finally {
      setSavingMoves(false);
    }
  }

  const occupiedSource = fetchOccupied && allOccupiedBookings.length > 0
    ? allOccupiedBookings
    : bookingsForSelectedDate;
  const timelineColumnsCount = Math.max(courts.length, 1);

  // Set di mezzi-slot occupati (chiave "campo|indice"), precalcolato una volta
  // per non ripetere il parsing delle date in ogni cella a ogni render/frame.
  const occupiedSlotSet = useMemo(() => {
    const set = new Set<string>();
    for (const b of occupiedSource as Booking[]) {
      const start = new Date(b.start_time).getTime();
      const end = new Date(b.end_time).getTime();
      for (let idx = 0; idx < HALF_SLOTS_PER_DAY; idx++) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(7 + Math.floor(idx / 2), (idx % 2) * 30, 0, 0);
        const t = slotTime.getTime();
        if (t >= start && t < end) set.add(`${b.court}|${idx}`);
      }
    }
    return set;
  }, [occupiedSource, selectedDate]);
  const selectedEntryParticipants = useMemo(
    () => (selectedEntry ? getParticipantNames(selectedEntry) : []),
    [selectedEntry]
  );

  return (
    <div className="space-y-4 font-sans">
      {/* Date Navigation */}
      <DateNavigator selectedDate={selectedDate} onSelectDate={handleSelectDate} />

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
                  <div className="flex-shrink-0 w-[70px] bg-secondary rounded-l-lg shadow-sm" style={{ height: '52px' }} />
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
                    <div className="sticky left-0 z-20 flex-shrink-0 w-[70px] bg-[color-mix(in_srgb,var(--secondary)_90%,white_10%)] rounded-lg p-3 flex items-center justify-center shadow-sm border border-white/10" style={{ minHeight: '70px' }}>
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
                            const draggable = canDragBooking(booking);
                            const drag = dragState?.bookingId === booking.id ? dragState : null;
                            const isMoving = drag?.mode === "move";
                            const isResizing = drag?.mode === "resize";
                            const effDuration = isResizing && drag?.ghost ? drag.ghost.duration : duration;
                            const resizeInvalid = isResizing && drag?.ghost?.invalid;
                            const isPending = Boolean(pendingMoves[booking.id]);
                            return (
                              <div
                                key={booking.id}
                                data-booking-block
                                onClick={isClickable ? () => { if (consumeClickSuppression()) return; openEntryModal(booking); } : undefined}
                                onMouseDown={draggable ? (e) => e.stopPropagation() : undefined}
                                onPointerDown={draggable ? (e) => startDrag(e, { bookingId: booking.id, court, startSlot, duration, mode: "move" }) : undefined}
                                className={`absolute p-2 text-white text-[11px] font-bold flex flex-col justify-center rounded-lg z-10 transition-[filter] duration-200 ${isClickable ? "hover:brightness-90" : ""} ${draggable ? "cursor-grab active:cursor-grabbing touch-none select-none" : isClickable ? "cursor-pointer" : "cursor-default"} ${resizeInvalid ? "ring-2 ring-white" : ""}`}
                                style={{
                                  ...getBookingStyle(booking),
                                  left: `${(startSlot / HALF_SLOTS_PER_DAY) * 100}%`,
                                  width: `calc(${(effDuration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`,
                                  top: '4px',
                                  bottom: '4px',
                                  marginLeft: '2px',
                                  opacity: isMoving ? 0.35 : 1,
                                  pointerEvents: dragState ? 'none' : undefined,
                                  // Modifica non ancora salvata: bordo bianco
                                  // dentro il blocco (fuori sparirebbe sul fondo
                                  // bianco della timeline) + alone scuro esterno
                                  // che lo stacca dallo sfondo.
                                  boxShadow: isPending
                                    ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px rgba(2, 48, 71, 0.55)'
                                    : undefined,
                                }}
                                title={isClickable
                                  ? `Clicca per vedere i dettagli${booking.isBlock ? '' : ` - ${getBookingDisplayName(booking)}`}${draggable ? " · trascina per spostare" : ""}`
                                  : "Prenotazione non apribile"}
                              >
                                {draggable && (
                                  <div
                                    onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { bookingId: booking.id, court, startSlot, duration, mode: "resize" }); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize rounded-r-lg hover:bg-white/25"
                                    title="Trascina per cambiare la durata"
                                  />
                                )}
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
                                className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-lg z-10 cursor-default"
                                style={{
                                  background: '#94a3b8',
                                  left: `${(startSlot / HALF_SLOTS_PER_DAY) * 100}%`,
                                  width: `calc(${(duration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`,
                                  top: '4px',
                                  bottom: '4px',
                                  marginLeft: '2px',
                                  pointerEvents: dragState ? 'none' : undefined,
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

                        const isOccupied1 = occupiedSlotSet.has(`${court}|${hourIndex * 2}`);
                        const isOccupied2 = occupiedSlotSet.has(`${court}|${hourIndex * 2 + 1}`);

                        return (
                          <div
                            key={`${court}-${hour}`}
                            className="border-r border-gray-200 last:border-r-0 relative flex"
                          >
                            {/* Prima metà - :00 */}
                            <div
                              data-slot-cell
                              data-court={court}
                              data-slot-index={hourIndex * 2}
                              onClick={() => !isOccupied1 && toggleSlotSelection(court, time1)}
                              className={`flex-1 transition-colors ${
                                isOccupied1
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : isSelected1
                                  ? 'bg-secondary cursor-pointer'
                                  : 'bg-white hover:bg-frozen-800/10 cursor-pointer'
                              }`}
                            />
                            {/* Seconda metà - :30 */}
                            <div
                              data-slot-cell
                              data-court={court}
                              data-slot-index={hourIndex * 2 + 1}
                              onClick={() => !isOccupied2 && toggleSlotSelection(court, time2)}
                              className={`flex-1 transition-colors ${
                                isOccupied2
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : isSelected2
                                  ? 'bg-secondary cursor-pointer'
                                  : 'bg-white hover:bg-frozen-800/10 cursor-pointer'
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

                          const isOccupied1 = occupiedSlotSet.has(`${court}|${hourIndex * 2}`);
                          const isOccupied2 = occupiedSlotSet.has(`${court}|${hourIndex * 2 + 1}`);

                          return (
                            <div
                              key={`${court}-${hour}-swap`}
                              className={`relative flex flex-col border-r border-gray-200 ${courtIndex === courts.length - 1 ? 'border-r-0' : ''} ${hourIndex === TIME_SLOTS.length - 1 ? '' : 'border-b border-gray-200'}`}
                              style={{ height: `${TIMELINE_ROW_HEIGHT}px` }}
                            >
                              <div
                                data-slot-cell
                                data-court={court}
                                data-slot-index={hourIndex * 2}
                                onClick={() => !isOccupied1 && toggleSlotSelection(court, time1)}
                                className={`flex-1 transition-colors ${
                                  isOccupied1
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : isSelected1
                                    ? 'bg-secondary cursor-pointer'
                                    : 'bg-white hover:bg-frozen-800/10 cursor-pointer'
                                }`}
                              />
                              <div
                                data-slot-cell
                                data-court={court}
                                data-slot-index={hourIndex * 2 + 1}
                                onClick={() => !isOccupied2 && toggleSlotSelection(court, time2)}
                                className={`flex-1 transition-colors border-t border-gray-200/70 ${
                                  isOccupied2
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : isSelected2
                                    ? 'bg-secondary cursor-pointer'
                                    : 'bg-white hover:bg-frozen-800/10 cursor-pointer'
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
                            const draggable = canDragBooking(booking);
                            const drag = dragState?.bookingId === booking.id ? dragState : null;
                            const isMoving = drag?.mode === "move";
                            const isResizing = drag?.mode === "resize";
                            const effDuration = isResizing && drag?.ghost ? drag.ghost.duration : duration;
                            const resizeInvalid = isResizing && drag?.ghost?.invalid;
                            const isPending = Boolean(pendingMoves[booking.id]);
                            return (
                              <div
                                key={`swap-${court}-${booking.id}`}
                                data-booking-block
                                onClick={isClickable ? () => { if (consumeClickSuppression()) return; openEntryModal(booking); } : undefined}
                                onMouseDown={draggable ? (e) => e.stopPropagation() : undefined}
                                onPointerDown={draggable ? (e) => startDrag(e, { bookingId: booking.id, court, startSlot, duration, mode: "move" }) : undefined}
                                className={`absolute px-2 py-1.5 text-white text-xs font-bold flex flex-col justify-center rounded-lg z-10 transition-[filter] duration-200 ${dragState ? "" : "pointer-events-auto"} ${isClickable ? "hover:brightness-90" : ""} ${draggable ? "cursor-grab active:cursor-grabbing touch-none select-none" : isClickable ? "cursor-pointer" : "cursor-default"} ${resizeInvalid ? "ring-2 ring-white" : ""}`}
                                style={{
                                  ...getBookingStyle(booking),
                                  left: `calc(${(courtIndex / timelineColumnsCount) * 100}% + 2px)`,
                                  width: `calc(${(1 / timelineColumnsCount) * 100}% - 4px)`,
                                  top: `calc(${(startSlot / HALF_SLOTS_PER_DAY) * 100}% + 2px)`,
                                  height: `calc(${(effDuration / HALF_SLOTS_PER_DAY) * 100}% - 4px)`,
                                  opacity: isMoving ? 0.35 : 1,
                                  pointerEvents: dragState ? 'none' : undefined,
                                  // Modifica non ancora salvata: bordo bianco
                                  // dentro il blocco (fuori sparirebbe sul fondo
                                  // bianco della timeline) + alone scuro esterno
                                  // che lo stacca dallo sfondo.
                                  boxShadow: isPending
                                    ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px rgba(2, 48, 71, 0.55)'
                                    : undefined,
                                }}
                                title={isClickable
                                  ? `Clicca per vedere i dettagli${booking.isBlock ? '' : ` - ${getBookingDisplayName(booking)}`}${draggable ? " · trascina per spostare" : ""}`
                                  : "Prenotazione non apribile"}
                              >
                                {draggable && (
                                  <div
                                    onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { bookingId: booking.id, court, startSlot, duration, mode: "resize" }); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-0 right-0 bottom-0 h-2.5 cursor-ns-resize rounded-b-lg hover:bg-white/25"
                                    title="Trascina per cambiare la durata"
                                  />
                                )}
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
                                className={`absolute px-2 py-1.5 text-white text-xs font-bold flex flex-col justify-center rounded-lg z-10 cursor-default ${dragState ? "" : "pointer-events-auto"}`}
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

          {/* Azioni: con spostamenti in sospeso "Prenota Campo" lascia il posto
              a salva/annulla, così è chiaro che c'è del lavoro da confermare. */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {hasPendingMoves ? (
              <>
                <button
                  onClick={savePendingMoves}
                  disabled={savingMoves}
                  title="Salva gli spostamenti e invia le notifiche"
                  className="flex-1 px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingMoves ? "Salvataggio..." : "Salva modifiche"}
                </button>

                <button
                  onClick={resetPendingMoves}
                  disabled={savingMoves}
                  title="Riporta le prenotazioni alla posizione originale"
                  // Colore delle lezioni private (vedi getBookingStyle): niente
                  // classe Tailwind, è un hex della palette prenotazioni.
                  style={{ background: "#023047" }}
                  className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Annulla
                </button>
              </>
            ) : (
              <button
                onClick={handleBookSlots}
                className="flex-1 px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Prenota Campo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Anteprima a grandezza piena durante lo spostamento (colore della prenotazione) */}
      {dragState?.mode === "move" && dragState.pointer && dragState.preview && dragState.ghost && (() => {
        const dragBooking = bookingsForSelectedDate.find((b) => b.id === dragState.bookingId);
        if (!dragBooking) return null;
        return (
          <div
            className={`fixed z-[60] pointer-events-none rounded-lg p-2 text-white text-[11px] font-bold flex flex-col justify-center shadow-2xl overflow-hidden ${dragState.ghost.invalid ? "ring-2 ring-white" : ""}`}
            style={{
              left: dragState.pointer.x - dragState.preview.offsetX,
              top: dragState.pointer.y - dragState.preview.offsetY,
              width: dragState.preview.width,
              height: dragState.preview.height,
              ...getBookingStyle(dragBooking),
              opacity: 0.92,
            }}
          >
            <div className="truncate">{dragState.ghost.court.replace(/^Campo\s+/i, "Campo ")}</div>
            <div className="truncate text-white/90 text-[10px]">{slotRangeLabel(dragState.ghost.startSlot, dragState.ghost.duration)}</div>
            {dragState.ghost.invalid && <div className="truncate text-white text-[10px]">Slot non disponibile</div>}
          </div>
        );
      })()}

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
