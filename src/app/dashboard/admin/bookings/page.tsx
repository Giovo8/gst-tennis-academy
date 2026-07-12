"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { 
  Calendar, 
  CalendarClock,
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Download,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  User,
  MapPin,
  RefreshCw,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Trophy,
  Circle,
  MoreVertical,
  SlidersHorizontal,
  Plus,
} from "lucide-react";

import { toast } from 'sonner';

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
  created_at: string;
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
};
type CourseData = {
  id: string;
  name: string;
  schedule_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
  cancelled_dates: string[] | null;
  extra_dates: string[] | null;
  lesson_overrides: Record<string, string> | null;
  lesson_time_overrides: Record<string, string> | null;
  schedule_periods: { days: string[]; time: string | null; court: string | null }[] | null;
  court_name: string | null;
  schedule_time: string | null;
  instructor_name: string | null;
};

type CourseLesson = {
  courseId: string;
  courseName: string;
  instructorName: string | null;
  dateStr: string;
  court: string | null;
  time: string | null;
};

const COURSE_DAY_INDEX: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6,
};
const COURSE_DAY_CODE: Record<number, string> = { 0: "dom", 1: "lun", 2: "mar", 3: "mer", 4: "gio", 5: "ven", 6: "sab" };

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNextCourseLessonDate(course: CourseData, fromDateStr: string): string | null {
  const { start_date, end_date, schedule_days, cancelled_dates, extra_dates } = course;
  if (!start_date || !end_date || !schedule_days?.length) return null;
  const allowed = new Set(schedule_days.map((d) => COURSE_DAY_INDEX[d] ?? -1));
  const cancelled = new Set(cancelled_dates ?? []);
  const startStr = fromDateStr > start_date ? fromDateStr : start_date;
  const cur = new Date(startStr + "T12:00:00");
  const endD = new Date(end_date + "T12:00:00");
  while (cur <= endD) {
    const dateStr = cur.toISOString().split("T")[0];
    if (allowed.has(cur.getDay()) && !cancelled.has(dateStr)) return dateStr;
    cur.setDate(cur.getDate() + 1);
  }
  const futureExtras = (extra_dates ?? []).filter((d) => d >= fromDateStr).sort();
  return futureExtras[0] ?? null;
}

function getCourseCourtForDate(course: CourseData, dateStr: string): string | null {
  if (course.lesson_overrides?.[dateStr]) return course.lesson_overrides[dateStr];
  if (course.schedule_periods?.length) {
    const dayCode = COURSE_DAY_CODE[new Date(dateStr + "T12:00:00").getDay()];
    const period = course.schedule_periods.find((p) => p.days?.includes(dayCode));
    if (period?.court) return period.court;
  }
  return course.court_name;
}

function getCourseTimeForDate(course: CourseData, dateStr: string): string | null {
  if (course.lesson_time_overrides?.[dateStr]) return course.lesson_time_overrides[dateStr];
  if (course.schedule_periods?.length) {
    const dayCode = COURSE_DAY_CODE[new Date(dateStr + "T12:00:00").getDay()];
    const period = course.schedule_periods.find((p) => p.days?.includes(dayCode));
    if (period?.time) return period.time;
  }
  return course.schedule_time;
}

type BookingsPageProps = {
  mode?: "default" | "history";
  basePath?: string;
};

export default function BookingsPage({ mode = "default", basePath = "/dashboard/admin" }: BookingsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState<"active" | "today" | "archived" | "cancelled" | "past" | "all">("active");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterCoach, setFilterCoach] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCourt, setFilterCourt] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "court" | "type" | "status" | "athlete" | "coach" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [courseNextLessons, setCourseNextLessons] = useState<CourseLesson[]>([]);

  const getPrimaryParticipant = (booking: Booking) =>
    booking.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const getAthleteDisplayName = (booking: Booking) => {
    const validParticipants = (booking.participants || [])
      .map((participant) => participant.full_name?.trim())
      .filter((fullName): fullName is string => Boolean(fullName));

    if (validParticipants.length === 2) {
      return validParticipants.join(", ");
    }

    return getPrimaryParticipant(booking)?.full_name || booking.user_profile?.full_name || "N/A";
  };

  const getAthleteDisplayEmail = (booking: Booking) => {
    if ((booking.participants?.length || 0) > 0) {
      return getPrimaryParticipant(booking)?.email || "";
    }

    return booking.user_profile?.email || "";
  };

  const getParticipantIdentityKey = (booking: Booking) => {
    if (booking.participants && booking.participants.length > 0) {
      return booking.participants
        .map((participant) => participant.user_id || `guest:${participant.full_name.trim().toLowerCase()}`)
        .join("|");
    }

    return booking.user_id;
  };

  async function loadCourseNextLessons() {
    const now = new Date();
    const todayStr = localDateStr(now);
    const tomorrowStr = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const { data } = await supabase
      .from("courses")
      .select("id, name, instructor_name, schedule_days, start_date, end_date, cancelled_dates, extra_dates, lesson_overrides, lesson_time_overrides, schedule_periods, court_name, schedule_time")
      .eq("is_active", true);
    if (!data) return;
    const lessons: CourseLesson[] = [];
    for (const course of data as CourseData[]) {
      let dateStr = getNextCourseLessonDate(course, todayStr);
      if (!dateStr) continue;
      if (dateStr === todayStr) {
        const time = getCourseTimeForDate(course, dateStr);
        if (time) {
          const endMatch = time.match(/(\d{1,2}):(\d{2})\s*$/);
          if (endMatch) {
            const lessonEnd = new Date();
            lessonEnd.setHours(parseInt(endMatch[1]), parseInt(endMatch[2]), 0, 0);
            if (now > lessonEnd) {
              dateStr = getNextCourseLessonDate(course, tomorrowStr);
            }
          }
        }
      }
      if (!dateStr) continue;
      lessons.push({
        courseId: course.id,
        courseName: course.name,
        instructorName: course.instructor_name,
        dateStr,
        court: getCourseCourtForDate(course, dateStr),
        time: getCourseTimeForDate(course, dateStr),
      });
    }
    setCourseNextLessons(lessons);
  }

  useEffect(() => {
    loadBookings();
    if (mode !== "history") {
      void loadCourseNextLessons();
    }
  }, []);

  useEffect(() => {
    const initialSearch = searchParams.get("search");
    if (initialSearch) {
      setSearch(initialSearch);
    }
    const initialFilter = searchParams.get("filter");
    if (initialFilter === "today") {
      setFilterVisibility("today");
    }
  }, [searchParams]);

  useEffect(() => {
    if (filterType !== "lezione_privata" && filterCoach !== "all") {
      setFilterCoach("all");
    }
  }, [filterType, filterCoach]);

  async function loadBookings() {
    try {
      // Prima verifica il ruolo dell'utente
      const { data: { user } } = await supabase.auth.getUser();
      
      // Prima query: prendi le ultime prenotazioni
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(200);

      if (bookingsError) {
        console.error("❌ Errore Supabase:", bookingsError);
        toast.error(`Errore nel caricamento: ${bookingsError.message}\n\nVerifica di avere il ruolo admin/gestore nel database.`);
        setLoading(false);
        return;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Seconda query: prendi tutti i profili necessari
      const userIds = [...new Set([
        ...bookingsData.map(b => b.user_id),
        ...bookingsData.map(b => b.coach_id).filter(Boolean)
      ])];

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const bookingIds = bookingsData.map((booking) => booking.id);
      let participantsData:
        | Array<{
            id?: string;
            booking_id?: string;
            full_name: string;
            email?: string;
            phone?: string;
            is_registered: boolean;
            user_id?: string | null;
            order_index?: number;
          }>
        | null = null;

      if (bookingIds.length > 0) {
        let bookingParticipantsData = null;
        let participantsError = null;

        const participantsQuery = await supabase
          .from("booking_participants")
          .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
          .in("booking_id", bookingIds)
          .order("booking_id", { ascending: true })
          .order("order_index", { ascending: true });

        bookingParticipantsData = participantsQuery.data;
        participantsError = participantsQuery.error;

        if (participantsError?.message?.toLowerCase().includes('phone')) {
          const fallbackQuery = await supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
            .in("booking_id", bookingIds)
            .order("booking_id", { ascending: true })
            .order("order_index", { ascending: true });

          bookingParticipantsData = fallbackQuery.data;
          participantsError = fallbackQuery.error;
        }

        if (participantsError) {
          console.warn("⚠️ Errore caricamento partecipanti prenotazioni:", participantsError);
        } else {
          participantsData = bookingParticipantsData;
        }
      }

      if (profilesError) {
        console.warn("⚠️ Errore caricamento profili:", profilesError);
      }

      // Mappa i profili per ID
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      // Combina bookings con i profili
      const enrichedBookings = bookingsData.map(booking => ({
        ...booking,
        user_profile: profilesMap.get(booking.user_id) || null,
        coach_profile: booking.coach_id ? profilesMap.get(booking.coach_id) || null : null,
        participants: participantsData?.filter((participant) => participant.booking_id === booking.id) || []
      }));

      setBookings(enrichedBookings);
    } catch (error) {
      console.error("❌ Errore nel caricamento prenotazioni:", error);
      toast.error(`Errore: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBooking(bookingId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione?")) return;
    
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const response = await fetch(`/api/bookings?id=${encodeURIComponent(bookingId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Errore durante l'eliminazione");
      }

      loadBookings();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error(error instanceof Error ? error.message : "Errore durante l'eliminazione");
    }
  }

  async function cancelBooking(bookingId: string) {
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) {
        throw new Error(error.message || "Errore durante l'annullamento");
      }

      loadBookings();
    } catch (error) {
      console.error("Errore durante l'annullamento:", error);
      toast.error(error instanceof Error ? error.message : "Errore durante l'annullamento");
    }
  }

  function exportToCSV() {
    const csv = [
      ["Data", "Ora Inizio", "Ora Fine", "Campo", "Atleta", "Maestro", "Tipo", "Status"].join(","),
      ...filteredBookings.map((b) => [
        formatDate(b.start_time),
        formatTime(b.start_time),
        formatTime(b.end_time),
        b.court,
        getAthleteDisplayName(b),
        b.coach_profile?.full_name || "N/A",
        typeConfig[b.type]?.label || b.type,
        statusConfig[b.status]?.label || b.status,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prenotazioni-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-secondary text-white" },
    lezione_privata: { label: "Lezione Privata", color: "bg-secondary text-white" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-secondary text-white" },
    arena: { label: "Match Arena", color: "bg-secondary text-white" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Confermata", color: "bg-secondary text-white", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-secondary text-white", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-secondary text-white", icon: XCircle },
  };

  const hasActiveFilters =
    filterVisibility !== "active" ||
    filterUser !== "all" ||
    filterCoach !== "all" ||
    filterType !== "all" ||
    filterCourt !== "all" ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo);
  const secondaryCardClassName = "bg-white rounded-lg border border-black/10 overflow-hidden";

  const statusLabelMap: Record<string, string> = {
    confirmed: "Confermata",
    pending: "In attesa",
    cancelled: "Annullata",
    cancellation_requested: "Richiesta annullamento",
  };

  const toTitleCaseWords = (value: string) =>
    value
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const getStatusLabel = (status: string) => statusLabelMap[status] || toTitleCaseWords(status);

  const getLocalDateInputValue = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const baseBookings = bookings;

  // Merge consecutive bookings of the same user on the same court
  const mergeConsecutiveBookings = (bookings: Booking[]): Booking[] => {
    if (bookings.length === 0) return [];
    
    // Sort by start time, court, and user
    const sorted = [...bookings].sort((a, b) => {
      const courtCompare = a.court.localeCompare(b.court);
      if (courtCompare !== 0) return courtCompare;
      
      const userCompare = a.user_id.localeCompare(b.user_id);
      if (userCompare !== 0) return userCompare;
      
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
    
    const merged: Booking[] = [];
    let current = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      // Check if same user, same court, same type, and consecutive times
      const currentEnd = new Date(current.end_time);
      const nextStart = new Date(next.start_time);
      const sameParticipant = getParticipantIdentityKey(current) === getParticipantIdentityKey(next);
      const sameCourt = current.court === next.court;
      const sameType = current.type === next.type;
      const sameCoach = current.coach_id === next.coach_id;
      const sameStatus = current.status === next.status;
      const consecutive = currentEnd.getTime() === nextStart.getTime();
      
      if (sameParticipant && sameCourt && sameType && sameCoach && sameStatus && consecutive) {
        // Merge: extend current end time, keep first booking ID
        current = {
          ...current,
          end_time: next.end_time
        };
      } else {
        // Not mergeable, push current and move to next
        merged.push(current);
        current = next;
      }
    }
    
    // Push the last one
    merged.push(current);
    return merged;
  };

  const mergedBaseBookings = mergeConsecutiveBookings(baseBookings);

  const typeOptions = Array.from(
    new Set(mergedBaseBookings.map((booking) => booking.type).filter(Boolean))
  ).sort((a, b) => {
    const aLabel = typeConfig[a]?.label || toTitleCaseWords(a);
    const bLabel = typeConfig[b]?.label || toTitleCaseWords(b);
    return aLabel.localeCompare(bLabel, "it");
  });

  const courtOptions = Array.from(
    new Set(mergedBaseBookings.map((booking) => booking.court).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "it"));

  const userOptions = Array.from(
    new Set(
      mergedBaseBookings
        .map((booking) => getAthleteDisplayName(booking))
        .filter((name) => name && name !== "N/A")
    )
  ).sort((a, b) => a.localeCompare(b, "it"));

  const coachOptions = Array.from(
    new Set(
      mergedBaseBookings
        .map((booking) => booking.coach_profile?.full_name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).sort((a, b) => a.localeCompare(b, "it"));

  const filteredBookings = mergedBaseBookings.filter((booking) => {
    const now = new Date();
    const bookingStartDateObj = new Date(booking.start_time);
    const bookingEndDateObj = new Date(booking.end_time);
    const isPast = bookingEndDateObj < now;
    const isPresentOrFuture = bookingEndDateObj >= now;
    const isTodayBooking =
      bookingStartDateObj.getDate() === now.getDate() &&
      bookingStartDateObj.getMonth() === now.getMonth() &&
      bookingStartDateObj.getFullYear() === now.getFullYear();
    const isCancelled =
      booking.status === "cancelled" || booking.status === "cancellation_requested";
    const isSuccessful =
      booking.status === "confirmed" ||
      booking.status === "completed" ||
      booking.status === "confirmed_by_coach";

    const matchesVisibility = filterVisibility === "active"
      ? isPresentOrFuture && !isCancelled
      : filterVisibility === "today"
      ? isTodayBooking && !isCancelled
      : filterVisibility === "archived"
      ? (isPast && isSuccessful) || isCancelled
      : filterVisibility === "cancelled"
      ? isCancelled
      : filterVisibility === "all"
      ? true
      : isPast && isSuccessful && !isCancelled;

    const matchesType = filterType === "corso" ? false : filterType === "all" || booking.type === filterType;
    const matchesCourt = filterCourt === "all" || booking.court === filterCourt;
    const matchesUser = filterUser === "all" || getAthleteDisplayName(booking) === filterUser;
    const shouldFilterByCoach = filterType === "lezione_privata";
    const matchesCoach =
      !shouldFilterByCoach ||
      filterCoach === "all" ||
      (booking.coach_profile?.full_name || "") === filterCoach;
    const bookingDate = getLocalDateInputValue(booking.start_time);
    const matchesDateFrom = !filterDateFrom || bookingDate >= filterDateFrom;
    const matchesDateTo = !filterDateTo || bookingDate <= filterDateTo;
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      !search ||
      getAthleteDisplayName(booking).toLowerCase().includes(normalizedSearch) ||
      getAthleteDisplayEmail(booking).toLowerCase().includes(normalizedSearch) ||
      booking.participants?.some(
        (participant) =>
          participant.full_name?.toLowerCase().includes(normalizedSearch) ||
          participant.email?.toLowerCase().includes(normalizedSearch)
      ) ||
      booking.coach_profile?.full_name?.toLowerCase().includes(normalizedSearch) ||
      booking.court?.toLowerCase().includes(normalizedSearch);
    return (
      matchesVisibility &&
      matchesUser &&
      matchesCoach &&
      matchesType &&
      matchesCourt &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesSearch
    );
  });

  // Course lessons filtered
  const filteredCourseNextLessons: CourseLesson[] = mode !== "history"
    ? courseNextLessons.filter((lesson) => {
        const q = search.toLowerCase();
        const matchesSearch = !search || lesson.courseName.toLowerCase().includes(q) || (lesson.instructorName?.toLowerCase().includes(q) ?? false);
        const matchesType = filterType === "all" || filterType === "corso";
        const isToday = lesson.dateStr === localDateStr(new Date());
        const matchesDateFrom = !filterDateFrom || lesson.dateStr >= filterDateFrom;
        const matchesDateTo = !filterDateTo || lesson.dateStr <= filterDateTo;
        if (filterVisibility === "today") return matchesSearch && matchesType && isToday && matchesDateFrom && matchesDateTo;
        const matchesVisibility = filterVisibility === "active" || filterVisibility === "all";
        return matchesSearch && matchesType && matchesVisibility && matchesDateFrom && matchesDateTo;
      })
    : [];

  // Sorting logic
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortBy) {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    }

    let comparison = 0;
    switch (sortBy) {
      case "date":
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        break;
      case "court":
        comparison = a.court.localeCompare(b.court);
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "athlete":
        const athleteA = getAthleteDisplayName(a);
        const athleteB = getAthleteDisplayName(b);
        comparison = athleteA.localeCompare(athleteB);
        break;
      case "coach":
        const coachA = a.coach_profile?.full_name || "";
        const coachB = b.coach_profile?.full_name || "";
        comparison = coachA.localeCompare(coachB);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Merge bookings + course lessons
  type MergedItem = { kind: "booking"; data: Booking } | { kind: "corso"; data: CourseLesson };
  const getCourseItemTime = (lesson: CourseLesson): number => {
    const timeMatch = lesson.time?.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return new Date(`${lesson.dateStr}T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:00`).getTime();
    }
    return new Date(lesson.dateStr + "T12:00:00").getTime();
  };
  const mergedItems: MergedItem[] = [
    ...sortedBookings.map((b) => ({ kind: "booking" as const, data: b })),
    ...filteredCourseNextLessons.map((c) => ({ kind: "corso" as const, data: c })),
  ].sort((a, b) => {
    const aTime = a.kind === "booking" ? new Date(a.data.start_time).getTime() : getCourseItemTime(a.data);
    const bTime = b.kind === "booking" ? new Date(b.data.start_time).getTime() : getCourseItemTime(b.data);
    if (!sortBy) return aTime - bTime;
    return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
  });

  const handleSort = (column: "date" | "court" | "type" | "status" | "athlete" | "coach") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const openActionMenu = (bookingId: string, buttonRect: DOMRect) => {
    const menuWidth = 176; // w-44
    const menuHeight = 140; // 3 items + paddings
    const viewportPadding = 8;

    let left = buttonRect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    let top = buttonRect.bottom + 6;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, buttonRect.top - menuHeight - 6);
    }

    setOpenMenuId(bookingId);
    setMenuPosition({ top, left });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    // Capitalize first letter of weekday and month
    return formatted.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const renderSearchWithFilter = () => (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome atleta, maestro, email o campo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
            hasActiveFilters || isFilterPanelOpen
              ? "border-secondary bg-secondary text-white hover:opacity-90"
              : "border-black/10 bg-white text-secondary hover:bg-gray-50"
          }`}
          aria-label="Mostra o nascondi chips filtri"
          title="Filtri"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {isFilterPanelOpen && (
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:w-full">
          <button
            type="button"
            onClick={() => {
              if (sortBy !== "date") {
                setSortBy("date");
                setSortOrder("desc");
                return;
              }
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              sortBy === "date" && sortOrder === "desc"
                ? "border-[#023047] bg-[#023047] text-white hover:opacity-90"
                : "border-black/10 bg-white text-secondary hover:bg-gray-50"
            }`}
            aria-label="Inverti ordinamento"
            title="Inverti ordinamento"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
            {[
              { value: "active", label: "Attive" },
              { value: "today", label: "Oggi" },
              { value: "all", label: "Tutte" },
              { value: "archived", label: "Archiviate" },
            ].map((option) => {
              const isSelected = filterVisibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterVisibility(option.value as "active" | "today" | "archived" | "cancelled" | "past" | "all")}
                  className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
                    isSelected
                      ? "border-secondary bg-secondary text-white"
                      : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterVisibility("active");
              setFilterUser("all");
              setFilterCoach("all");
              setFilterType("all");
              setFilterCourt("all");
              setFilterDateFrom("");
              setFilterDateTo("");
              setSortBy("date");
              setSortOrder("desc");
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
            aria-label="Reset filtri"
            title="Reset filtri"
          >
            <X className="h-4 w-4" />
          </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      {mode === "history" && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
              <Link
                href={`${basePath}/bookings`}
                className="hover:text-secondary/80 transition-colors"
              >
                Prenotazioni
              </Link>
              <span className="mx-2">›</span>
              <span>Storico</span>
            </div>
            <h1 className="text-4xl font-bold text-secondary">Storico prenotazioni</h1>
          </div>
        </div>
      )}

      {mode !== "history" && (
        <div className="w-full">
          <Link
            href={`${basePath}/bookings/new`}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuova Prenotazione</span>
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {renderSearchWithFilter()}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento prenotazioni...</p>
        </div>
      ) : mergedItems.length === 0 ? (
        <div className={`${secondaryCardClassName} flex flex-col items-center justify-center py-8 text-secondary/40`}>
          <Calendar className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">
            {search || hasActiveFilters
              ? "Nessuna prenotazione corrisponde ai filtri"
              : "Nessuna prenotazione trovata"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Data Rows */}
          {mergedItems.map((item) => {
            if (item.kind === "corso") {
              const lesson = item.data;
              const start = new Date(lesson.dateStr + "T12:00:00");
              return (
                <Link key={`corso-${lesson.courseId}`} href={`${basePath}/bookings/${lesson.courseId}?type=corso&date=${lesson.dateStr}`} className="block">
                  <div className="rounded-lg overflow-visible hover:opacity-95 transition-opacity" style={{ background: "var(--color-frozen-lake-900)" }}>
                    <div className="flex items-center gap-4 py-3 px-3">
                      <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                          {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                          {start.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{lesson.courseName}</p>
                        <p className="text-xs text-white/70 mt-0.5">
                          {[lesson.time, lesson.court, lesson.instructorName].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                        Corso
                      </span>
                    </div>
                  </div>
                </Link>
              );
            }
            const booking = item.data;
            const isCancelledBooking =
              booking.status === "cancelled" || booking.status === "cancellation_requested";
            const isPastBooking = new Date(booking.end_time) < new Date();
            const start = new Date(booking.start_time);
            const isArenaBooking =
              booking.type === "arena" || booking.notes?.toLowerCase().includes("sfida arena");

            let typeBg = "";
            if (isCancelledBooking || isPastBooking) {
              typeBg = "#9ca3af";
            } else if (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") {
              typeBg = "#023047";
            } else if (isArenaBooking) {
              typeBg = "#023b52";
            } else {
              typeBg = "var(--secondary)";
            }

            const typeLabel =
              booking.type === "lezione_privata" ? "Lezione Priv."
              : booking.type === "lezione_gruppo" ? "Lezione Gruppo"
              : isArenaBooking ? "Arena"
              : "Campo";

            return (
              <div
                key={booking.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: typeBg }}
              >
                <div
                  className="flex items-center gap-4 py-3 px-3"
                  onClick={() => router.push(`${basePath}/bookings/${booking.id}`)}
                >
                  {/* Date box */}
                  <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                      {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                    </span>
                    <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                      {start.getDate()}
                    </span>
                  </div>

                  {/* Info principale */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {getAthleteDisplayName(booking)}
                    </p>
                    <p className="text-xs text-white/70 mt-0.5">
                      {formatTime(booking.start_time)}–{formatTime(booking.end_time)} · {booking.court}
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") && booking.coach_profile?.full_name && (
                        <span> · {booking.coach_profile.full_name}</span>
                      )}
                    </p>
                  </div>

                  {/* Type label */}
                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {typeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// Modale di modifica rimosso: ora la modifica avviene su pagina dedicata

