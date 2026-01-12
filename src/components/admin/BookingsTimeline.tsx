"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";

type Booking = {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  notes: string | null;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  isBlock?: boolean;
  reason?: string;
};

type BookingsTimelineProps = {
  bookings: Booking[];
  loading: boolean;
};

const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00"
];

type TimeSlotInfo = {
  booking: Booking | null;
  isPartOfBooking: boolean;
  isStart: boolean;
  colspan: number;
};

export default function BookingsTimeline({ bookings: allBookings, loading: parentLoading }: BookingsTimelineProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [courtBlocks, setCourtBlocks] = useState<Booking[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlots, setSelectedSlots] = useState<{ court: string; time: string }[]>([]);
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);

  // Load courts from database on mount
  useEffect(() => {
    loadCourtsFromDB();
  }, []);

  // Load court blocks for the selected date
  useEffect(() => {
    loadCourtBlocks();
  }, [selectedDate]);

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
        manager_confirmed: true,
        coach_confirmed: true,
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
    setSelectedDate(newDate);
    setSelectedSlots([]); // Reset selection when changing date
  }

  function goToToday() {
    setSelectedDate(new Date());
    setSelectedSlots([]);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = new Date(e.target.value + 'T12:00:00');
    setSelectedDate(newDate);
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

    console.log('🚀 Navigazione verso new booking con parametri:', {
      court: firstSlot.court,
      date: dateStr,
      times: allTimes,
      selectedSlots: selectedSlots
    });

    // Navigate to new booking page with pre-filled data
    // Pass all selected times as comma-separated values
    const params = new URLSearchParams({
      court: firstSlot.court,
      date: dateStr,
      times: allTimes.join(',')
    });

    router.push(`/dashboard/admin/bookings/new?${params.toString()}`);
  }

  function openDatePicker() {
    dateInputRef.current?.showPicker();
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
          prevMerged.user_id === booking.user_id &&
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
    // Blocchi campo - rosso/arancione
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
  }

  function getBookingLabel(booking: Booking): string {
    if (booking.isBlock) return booking.reason || "Blocco Campo";
    if (booking.type === "lezione_privata") return "Lezione Privata";
    if (booking.type === "lezione_gruppo") return "Lezione Gruppo";
    if (booking.type === "arena") return "Match Arena";
    return "Campo";
  }

  function formatDateHeader(): string {
    return selectedDate.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function isToday(): boolean {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className={`rounded-lg p-3 sm:p-4 flex items-center justify-between transition-all ${
        isToday() ? 'bg-secondary' : 'bg-white border border-gray-200'
      }`}>
        <button
          onClick={() => changeDate(-1)}
          className={`p-2 rounded-md transition-colors ${
            isToday() ? 'hover:bg-white/10' : 'hover:bg-secondary/10'
          }`}
        >
          <ChevronLeft className={`h-5 w-5 ${isToday() ? 'text-white' : 'text-secondary'}`} />
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={openDatePicker}
            className={`p-2 rounded-md transition-colors ${
              isToday() ? 'hover:bg-white/10' : 'hover:bg-secondary/10'
            }`}
            title="Scegli data"
          >
            <CalendarIcon className={`h-5 w-5 ${isToday() ? 'text-white' : 'text-secondary'}`} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            onChange={handleDateChange}
            value={selectedDate.toISOString().split('T')[0]}
            className="absolute opacity-0 pointer-events-none"
          />
          <h2 className={`text-sm sm:text-base md:text-lg font-bold capitalize ${
            isToday() ? 'text-white' : 'text-secondary'
          }`}>
            {formatDateHeader()}
          </h2>
        </div>

        <button
          onClick={() => changeDate(1)}
          className={`p-2 rounded-md transition-colors ${
            isToday() ? 'hover:bg-white/10' : 'hover:bg-secondary/10'
          }`}
        >
          <ChevronRight className={`h-5 w-5 ${isToday() ? 'text-white' : 'text-secondary'}`} />
        </button>
      </div>

      {/* Timeline Grid */}
      {loading ? (
        <div className="bg-white rounded-lg p-4 sm:p-6 md:p-12 text-center">
          <p className="text-secondary/60">Caricamento timeline...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[800px] md:min-w-[1400px]">
              {/* Header Row with Time Slots */}
              <div className="grid grid-cols-[120px_repeat(16,_minmax(60px,_1fr))] md:grid-cols-[180px_repeat(16,_minmax(80px,_1fr))] bg-secondary border border-secondary rounded-lg mb-3">
                <div className="p-2 sm:p-3 md:p-4 flex items-center justify-center">
                  <span className="font-bold text-white uppercase tracking-wide text-[10px] sm:text-[11px]">Campo</span>
                </div>
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="p-1.5 sm:p-2 md:p-3 text-center font-bold text-white text-[10px] sm:text-xs flex items-center justify-center"
                  >
                    {time}
                  </div>
                ))}
              </div>

              {/* Court Rows */}
              <div className="space-y-3">
              {courts.map((court) => {
                const slots = courtTimeline[court] || [];
                
                return (
                  <div
                    key={court}
                    className="grid grid-cols-[120px_repeat(16,_minmax(60px,_1fr))] md:grid-cols-[180px_repeat(16,_minmax(80px,_1fr))] hover:bg-gray-50/50 transition-colors bg-white border border-gray-200 rounded-lg"
                    style={{ minHeight: "70px" }}
                  >
                    {/* Court Name */}
                    <div className="p-2 sm:p-3 md:p-4 bg-white font-bold text-secondary text-xs sm:text-sm flex items-center justify-center border-r border-gray-200">
                      {court}
                    </div>

                    {/* Time Slots for this Court */}
                    {slots.map((slot, index) => {
                      // If there's a booking starting here
                      if (slot.booking && slot.isStart) {
                        const bookingStyle = getBookingStyle(slot.booking);
                        const isLesson = slot.booking.type === "lezione_privata" || slot.booking.type === "lezione_gruppo";

                        return (
                          <div
                            key={`${court}-${index}`}
                            className="border-r border-gray-200 last:border-r-0 relative"
                            style={{ gridColumn: `span ${slot.colspan}` }}
                          >
                            {/* Half hour markers */}
                            {Array.from({ length: slot.colspan }).map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-px h-4 bg-gray-300 bottom-0"
                                style={{ left: `${(i + 0.5) / slot.colspan * 100}%`, transform: 'translateX(-50%)' }}
                              />
                            ))}
                            {/* Booking block */}
                            <div
                              onClick={() => {
                                if (!slot.booking) return;
                                if (slot.booking.isBlock) {
                                  router.push(`/dashboard/admin/courts/${slot.booking.id}`);
                                } else {
                                  router.push(`/dashboard/admin/bookings/${slot.booking.id}`);
                                }
                              }}
                              className="relative p-1.5 sm:p-2 md:p-2.5 text-white text-[10px] sm:text-xs font-bold flex flex-col justify-center rounded-md mx-0.5 my-1.5 hover:scale-[1.02] transition-all cursor-pointer active:scale-95 z-10"
                              style={bookingStyle}
                              title={`Clicca per vedere i dettagli${slot.booking.isBlock ? '' : ` - ${slot.booking.user_profile?.full_name}`}`}
                            >
                              {slot.booking.isBlock ? (
                                <>
                                  <div className="truncate leading-tight">
                                    {getBookingLabel(slot.booking)}
                                  </div>
                                  <div className="text-white/90 text-[10px] mt-1 uppercase tracking-wide leading-tight">
                                    CAMPO BLOCCATO
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="truncate leading-tight">
                                    {slot.booking.user_profile?.full_name || "Sconosciuto"}
                                  </div>
                                  {isLesson && slot.booking.coach_profile && (
                                    <div className="truncate text-white/95 mt-1 text-[11px] leading-tight">
                                      {slot.booking.coach_profile.full_name}
                                    </div>
                                  )}
                                  <div className="text-white/90 text-[10px] mt-1 uppercase tracking-wide leading-tight">
                                    {getBookingLabel(slot.booking)}
                                  </div>
                                  {!slot.booking.manager_confirmed && slot.booking.status !== "cancelled" && (
                                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full shadow-sm" title="Da approvare" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Empty slot - diviso in due metà da 30 minuti
                      const timeSlot = TIME_SLOTS[index];
                      const [hour] = timeSlot.split(":").map(Number);
                      const time1 = `${hour.toString().padStart(2, '0')}:00`;
                      const time2 = `${hour.toString().padStart(2, '0')}:30`;
                      const isSelected1 = selectedSlots.some(s => s.court === court && s.time === time1);
                      const isSelected2 = selectedSlots.some(s => s.court === court && s.time === time2);

                      return (
                        <div
                          key={`${court}-${index}`}
                          className="border-r border-gray-200 last:border-r-0 relative flex"
                        >
                          {/* Prima metà - :00 */}
                          <div
                            onClick={() => toggleSlotSelection(court, time1)}
                            className={`flex-1 transition-colors cursor-pointer ${
                              isSelected1 ? 'bg-secondary' : 'bg-white hover:bg-emerald-50/40'
                            }`}
                          />
                          {/* Seconda metà - :30 */}
                          <div
                            onClick={() => toggleSlotSelection(court, time2)}
                            className={`flex-1 transition-colors cursor-pointer ${
                              isSelected2 ? 'bg-secondary' : 'bg-white hover:bg-emerald-50/40'
                            }`}
                          />
                          {/* Tacchetta centrale */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Book Button */}
          {selectedSlots.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={handleBookSlots}
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                Prenota Campo ({selectedSlots.length} slot selezionat{selectedSlots.length === 1 ? 'o' : 'i'})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
