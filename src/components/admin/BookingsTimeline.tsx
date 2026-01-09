"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

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
  user_profile?: { full_name: string; email: string } | null;
  coach_profile?: { full_name: string; email: string } | null;
  isBlock?: boolean;
  reason?: string;
};

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];
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

export default function BookingsTimeline() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBookingsForDate();
  }, [selectedDate]);

  async function loadBookingsForDate() {
    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch bookings for the selected date
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError);
        setLoading(false);
        return;
      }

      // Fetch court blocks for the selected date
      const { data: blocksData } = await supabase
        .from("court_blocks")
        .select("*")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      if (!bookingsData && !blocksData) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = [...new Set([
        ...(bookingsData?.map(b => b.user_id) || []),
        ...(bookingsData?.map(b => b.coach_id).filter(Boolean) || [])
      ])];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const enrichedBookings = bookingsData?.map(booking => ({
        ...booking,
        user_profile: profilesMap.get(booking.user_id) || null,
        coach_profile: booking.coach_id ? profilesMap.get(booking.coach_id) || null : null,
        isBlock: false
      })) || [];

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

      // Merge bookings and blocks
      const allEntries = [...enrichedBookings, ...blockEntries].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setBookings(allEntries);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  }

  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = new Date(e.target.value + 'T12:00:00');
    setSelectedDate(newDate);
  }

  function openDatePicker() {
    dateInputRef.current?.showPicker();
  }

  // Build a map of time slots for each court
  const courtTimeline = useMemo(() => {
    const timeline: Record<string, TimeSlotInfo[]> = {};
    
    COURTS.forEach(court => {
      // Get bookings for this court and sort by start time
      const courtBookings = bookings
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
  }, [bookings]);

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
      <div className={`rounded-lg p-4 flex items-center justify-between transition-all ${
        isToday() ? 'bg-secondary' : 'bg-white'
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
          <h2 className={`text-lg font-bold capitalize ${
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
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-secondary/60">Caricamento timeline...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[1400px]">
              {/* Header Row with Time Slots */}
              <div className="grid grid-cols-[180px_repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg mb-3">
                <div className="p-4 flex items-center justify-center">
                  <span className="font-bold text-secondary uppercase tracking-wide text-[11px]">Campo</span>
                </div>
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="p-3 text-center font-bold text-secondary text-xs flex items-center justify-center"
                  >
                    {time}
                  </div>
                ))}
              </div>

              {/* Court Rows */}
              <div className="space-y-3">
              {COURTS.map((court) => {
                const slots = courtTimeline[court] || [];
                
                return (
                  <div
                    key={court}
                    className="grid grid-cols-[180px_repeat(16,_minmax(80px,_1fr))] hover:bg-gray-50/50 transition-colors bg-white rounded-lg"
                    style={{ minHeight: "70px" }}
                  >
                    {/* Court Name */}
                    <div className="p-4 bg-white font-bold text-secondary text-sm flex items-center justify-center border-r border-gray-200">
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
                              className="relative p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md mx-0.5 my-1.5 hover:scale-[1.02] transition-all cursor-pointer active:scale-95 z-10"
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

                      // Empty slot
                      return (
                        <div
                          key={`${court}-${index}`}
                          className="bg-white hover:bg-emerald-50/40 transition-colors cursor-pointer border-r border-gray-200 last:border-r-0 relative"
                        >
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
        </div>
      )}
    </div>
  );
}
