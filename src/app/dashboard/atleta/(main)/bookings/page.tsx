"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  User,
  Users,
  Trophy,
  List,
  LayoutGrid,
  Pencil,
  Trash2,
  AlertCircle,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import BookingsTimeline from "@/components/admin/BookingsTimeline";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

interface Booking {
  id: string;
  court: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  coach_id: string | null;
  notes: string | null;
  coach?: {
    full_name: string;
  };
  // For BookingsTimeline compatibility
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
}

type BookingsPageProps = {
  mode?: "default" | "history";
};

type ProfileLite = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

export default function BookingsPage({ mode = "default" }: BookingsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/bookings")[0];
  const isMaestroDashboard = dashboardBase.includes("/dashboard/maestro");
  const isHistoryMode = mode === "history";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timelineBookings, setTimelineBookings] = useState<Booking[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState<"all" | "active" | "today" | "archived" | "cancelled" | "past">("active");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterCoach, setFilterCoach] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCourt, setFilterCourt] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [sortField, setSortField] = useState<string>("start_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const getPrimaryParticipant = (booking: Booking) =>
    booking.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const getAthleteDisplayName = (booking: Booking) =>
    getPrimaryParticipant(booking)?.full_name || booking.user_profile?.full_name || "N/A";

  const getAthleteDisplayEmail = (booking: Booking) => {
    if ((booking.participants?.length || 0) > 0) {
      return getPrimaryParticipant(booking)?.email || "";
    }

    return booking.user_profile?.email || "";
  };

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  async function loadBookings() {
    setLoading(true);
    console.log("🔍 Caricamento prenotazioni atleta...");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("❌ Nessun utente loggato");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    console.log("👤 User ID:", user.id);

    if (isMaestroDashboard) {
      const now = new Date();
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
      const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString();

      const { data: allBookingsData, error: allBookingsError } = await supabase
        .from("bookings")
        .select("*")
        .neq("status", "cancelled")
        .gte("start_time", rangeStart)
        .lte("start_time", rangeEnd)
        .order("start_time", { ascending: false })
        .limit(2000);

      if (allBookingsError) {
        console.error("❌ Errore caricamento prenotazioni maestro:", allBookingsError);
        setLoading(false);
        return;
      }

      const allData = allBookingsData ?? [];
      const ownBookingIds = new Set(
        allData
          .filter((b) => b.coach_id === user.id || b.user_id === user.id)
          .map((b) => b.id)
      );

      const ownBookingsData = allData.filter((b) => ownBookingIds.has(b.id));
      const allUserIds = [
        ...new Set([
          ...ownBookingsData.map((b) => b.user_id),
          ...ownBookingsData.map((b) => b.coach_id).filter(Boolean),
        ]),
      ];

      const profilesPromise = allUserIds.length > 0
        ? supabase.from("profiles").select("id, full_name, email, phone").in("id", allUserIds)
        : Promise.resolve({ data: [] as any[] });

      const ownBookingIdsList = ownBookingsData.map((b) => b.id);
      const participantsPromise = ownBookingIdsList.length > 0
        ? supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
            .in("booking_id", ownBookingIdsList)
            .order("booking_id", { ascending: true })
            .order("order_index", { ascending: true })
        : Promise.resolve({ data: [], error: null });

      const [{ data: allProfiles }, participantsQuery] = await Promise.all([
        profilesPromise,
        participantsPromise,
      ]);

      const allProfilesMap = new Map<string, ProfileLite>(
        ((allProfiles ?? []) as ProfileLite[]).map((p) => [p.id, p])
      );

      let participantsData: Booking["participants"] | null = null;
      if ((participantsQuery as any).error?.message?.toLowerCase().includes("phone")) {
        const fallbackQuery = await supabase
          .from("booking_participants")
          .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
          .in("booking_id", ownBookingIdsList);
        if (!fallbackQuery.error) participantsData = fallbackQuery.data || [];
      } else if (!(participantsQuery as any).error) {
        participantsData = (participantsQuery as any).data || [];
      }

      const enrichedBookings = allData.map((booking) => {
        const isOwn = ownBookingIds.has(booking.id);
        const coachData = isOwn && booking.coach_id ? allProfilesMap.get(booking.coach_id) : null;

        return {
          ...booking,
          coach: coachData ? { full_name: coachData.full_name } : undefined,
          user_profile: isOwn ? (allProfilesMap.get(booking.user_id) || null) : null,
          coach_profile: coachData
            ? {
                full_name: coachData.full_name,
                email: coachData.email,
                phone: coachData.phone,
              }
            : null,
          participants: isOwn
            ? (participantsData?.filter((p) => p.booking_id === booking.id) || [])
            : [],
        };
      });

      // Keep timeline identical to dashboard/maestro behavior (all bookings in range).
      setTimelineBookings(enrichedBookings);

      // For list mode in maestro dashboard, always load all bookings where the maestro is involved
      // (as coach OR as athlete), even outside the timeline date range.
      const { data: involvedBookingsData, error: involvedBookingsError } = await supabase
        .from("bookings")
        .select("*")
        .neq("status", "cancelled")
        .or(`coach_id.eq.${user.id},user_id.eq.${user.id}`)
        .order("start_time", { ascending: false })
        .limit(2000);

      if (involvedBookingsError) {
        console.error("❌ Errore caricamento prenotazioni coinvolte maestro:", involvedBookingsError);
        setLoading(false);
        return;
      }

      const involvedData = involvedBookingsData ?? [];
      const involvedUserIds = [
        ...new Set([
          ...involvedData.map((b) => b.user_id),
          ...involvedData.map((b) => b.coach_id).filter(Boolean),
        ]),
      ];

      const { data: involvedProfiles } = involvedUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", involvedUserIds)
        : { data: [] as any[] };

      const involvedProfilesMap = new Map<string, ProfileLite>(
        ((involvedProfiles ?? []) as ProfileLite[]).map((p) => [p.id, p])
      );

      const involvedBookingIds = involvedData.map((b) => b.id);
      let involvedParticipantsData: Booking["participants"] | null = null;

      if (involvedBookingIds.length > 0) {
        const participantsQuery = await supabase
          .from("booking_participants")
          .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
          .in("booking_id", involvedBookingIds)
          .order("booking_id", { ascending: true })
          .order("order_index", { ascending: true });

        if (participantsQuery.error?.message?.toLowerCase().includes("phone")) {
          const fallbackQuery = await supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
            .in("booking_id", involvedBookingIds);
          if (!fallbackQuery.error) involvedParticipantsData = fallbackQuery.data || [];
        } else if (!participantsQuery.error) {
          involvedParticipantsData = participantsQuery.data || [];
        }
      }

      const involvedEnrichedBookings = involvedData.map((booking) => {
        const coachData = booking.coach_id ? involvedProfilesMap.get(booking.coach_id) : null;

        return {
          ...booking,
          coach: coachData ? { full_name: coachData.full_name } : undefined,
          user_profile: involvedProfilesMap.get(booking.user_id) || null,
          coach_profile: coachData
            ? {
                full_name: coachData.full_name,
                email: coachData.email,
                phone: coachData.phone,
              }
            : null,
          participants: involvedParticipantsData?.filter((p) => p.booking_id === booking.id) || [],
        };
      });

      // In dashboard maestro, show all bookings where the maestro is involved,
      // regardless of default/history page mode.
      setBookings(involvedEnrichedBookings);
      setLoading(false);
      return;
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user.id)
      .single();

    // Query base
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "cancelled");

    // In modalità default mostra solo dal giorno corrente in avanti
    // In modalità history mostra solo prenotazioni passate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (mode === "default") {
      query = query.gte("start_time", today.toISOString());
    } else if (mode === "history") {
      query = query.lt("start_time", today.toISOString());
    }

    const { data: bookingsData, error: bookingsError } = await query
      .order("start_time", { ascending: false })
      .limit(100);

    if (bookingsError) {
      console.error("❌ Errore caricamento prenotazioni:", bookingsError);
      setLoading(false);
      return;
    }

    console.log("✅ Prenotazioni caricate:", bookingsData?.length || 0);

    if (!bookingsData || bookingsData.length === 0) {
      console.log("⚠️ Nessuna prenotazione trovata");
      setBookings([]);
      setLoading(false);
      return;
    }

    // Seconda query: prendi i profili dei coach se esistono
    const coachIds = [...new Set(bookingsData.map(b => b.coach_id).filter(Boolean))];

    let coachesMap = new Map<string, ProfileLite>();
    if (coachIds.length > 0) {
      const { data: coachesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", coachIds);

      if (coachesData) {
        coachesMap = new Map<string, ProfileLite>(
          (coachesData as ProfileLite[]).map((c) => [c.id, c])
        );
      }
    }

    // Combina i dati con struttura compatibile con BookingsTimeline
    const enrichedBookings = bookingsData.map(booking => {
      const coachData = booking.coach_id ? coachesMap.get(booking.coach_id) : null;
      return {
        ...booking,
        coach: coachData,
        user_profile: userProfile || null,
        coach_profile: coachData ? {
          full_name: coachData.full_name,
          email: coachData.email,
          phone: coachData.phone
        } : null
      };
    });

    console.log("📋 Dati arricchiti:", enrichedBookings);
    setBookings(enrichedBookings);
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (filterType !== "lezione_privata" && filterCoach !== "all") {
      setFilterCoach("all");
    }
  }, [filterType, filterCoach]);

  async function cancelBooking(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione?")) return;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const response = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Errore durante l'eliminazione");
      }

      await loadBookings();
    } catch (error) {
      console.error("Errore durante l'eliminazione della prenotazione:", error);
      alert(error instanceof Error ? error.message : "Errore durante l'eliminazione");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString("it-IT", { weekday: "short" });
    const day = date.getDate();
    const month = date.toLocaleDateString("it-IT", { month: "short" });

    // Capitalizza prima lettera di giorno e mese
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${capitalizedWeekday} ${day} ${capitalizedMonth}`;
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-secondary text-white" },
    lezione_privata: { label: "Lezione Privata", color: "bg-secondary text-white" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-secondary text-white" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Confermata", color: "bg-secondary text-white", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-secondary text-white", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-secondary text-white", icon: XCircle },
    cancellation_requested: { label: "Richiesta cancellazione", color: "bg-secondary text-white", icon: AlertCircle },
  };

  const getLocalDateInputValue = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toTitleCaseWords = (value: string) =>
    value
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const typeOptions = Array.from(
    new Set(bookings.map((booking) => booking.type).filter(Boolean))
  ).sort((a, b) => {
    const aLabel = typeConfig[a]?.label || toTitleCaseWords(a);
    const bLabel = typeConfig[b]?.label || toTitleCaseWords(b);
    return aLabel.localeCompare(bLabel, "it");
  });

  const courtOptions = Array.from(
    new Set(bookings.map((booking) => booking.court).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "it"));

  const userOptions = Array.from(
    new Set(
      bookings
        .map((booking) => getAthleteDisplayName(booking))
        .filter((name) => name && name !== "N/A")
    )
  ).sort((a, b) => a.localeCompare(b, "it"));

  const coachOptions = Array.from(
    new Set(
      bookings
        .map((booking) => booking.coach_profile?.full_name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).sort((a, b) => a.localeCompare(b, "it"));

  const hasActiveFilters =
    filterVisibility !== "active" ||
    filterUser !== "all" ||
    filterCoach !== "all" ||
    filterType !== "all" ||
    filterCourt !== "all" ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo);

  const effectiveViewMode = isHistoryMode ? "list" : viewMode;
  const now = new Date();

  const filteredBookings = bookings
    .filter((booking) => {
      const isTimelineMode = !isHistoryMode && effectiveViewMode === "timeline";
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

      const matchesVisibility = isTimelineMode
        ? true
        : filterVisibility === "all"
        ? true
        : filterVisibility === "active"
        ? isPresentOrFuture
        : filterVisibility === "today"
        ? isTodayBooking && !isCancelled
        : filterVisibility === "archived"
        ? (isPast && isSuccessful) || isCancelled
        : filterVisibility === "cancelled"
        ? isCancelled
        : isPast && isSuccessful && !isCancelled;

      const matchesType = filterType === "all" || booking.type === filterType;
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
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "start_time":
          aValue = new Date(a.start_time).getTime();
          bValue = new Date(b.start_time).getTime();
          break;
        case "court":
          aValue = a.court;
          bValue = b.court;
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "coach":
          aValue = a.coach?.full_name || "";
          bValue = b.coach?.full_name || "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {isHistoryMode && (
            <p className="breadcrumb text-secondary/60">
              <Link
                href={`${dashboardBase}/bookings`}
                className="hover:text-secondary/80 transition-colors"
              >
                Prenotazioni
              </Link>
              {" › "}
              <span>Storico</span>
            </p>
          )}
          <h1 className="text-4xl font-bold text-secondary mb-2">{isHistoryMode ? "Storico prenotazioni" : "Le mie Prenotazioni"}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {!isHistoryMode && (
            <Link
              href={`${dashboardBase}/bookings/new`}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuova Prenotazione
            </Link>
          )}
          {!isHistoryMode && !isMaestroDashboard && (
            <Link
              href={`${dashboardBase}/bookings/storico`}
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all flex-shrink-0"
              title="Storico"
            >
              <Clock className="h-5 w-5" />
            </Link>
          )}
          {!isMaestroDashboard && (
            <button
              onClick={() => loadBookings()}
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all flex-shrink-0"
              title="Ricarica"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* View Mode Toggle */}
        {!isHistoryMode && (
          <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 w-full sm:w-auto">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 px-4 py-3 sm:px-3 sm:py-2.5 rounded text-sm sm:text-xs font-semibold transition-all flex items-center justify-center gap-2 sm:gap-1.5 ${
              effectiveViewMode === "list"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            <List className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Lista
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex-1 px-4 py-3 sm:px-3 sm:py-2.5 rounded text-sm sm:text-xs font-semibold transition-all flex items-center justify-center gap-2 sm:gap-1.5 ${
              effectiveViewMode === "timeline"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Timeline
          </button>
          </div>
        )}
        {effectiveViewMode === "list" && (
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
              <input
                type="text"
                placeholder="Cerca per nome atleta, maestro, email o campo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
                hasActiveFilters
                  ? "border-secondary bg-secondary text-white hover:opacity-90"
                  : "border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
              }`}
              aria-label="Apri filtri prenotazioni"
              title="Filtri"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Bookings List or Timeline */}
      {effectiveViewMode === "timeline" ? (
        <BookingsTimeline
          bookings={isMaestroDashboard ? timelineBookings : filteredBookings}
          loading={loading}
          basePath={dashboardBase}
          fetchOccupied={!isMaestroDashboard}
          swapAxes={!isMaestroDashboard}
          showBlockReason={isMaestroDashboard ? true : false}
          showCourtBlocks={isMaestroDashboard ? true : false}
          highlightUserId={isMaestroDashboard ? currentUserId : undefined}
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento prenotazioni...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center py-8 text-secondary/40">
          <Calendar className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">
            {search || hasActiveFilters
              ? "Nessuna prenotazione corrisponde ai filtri"
              : "Nessuna prenotazione trovata"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[900px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-4 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[40px_80px_56px_80px_1fr_56px_64px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">
                  <button
                    onClick={() => handleSort("type")}
                    className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
                  >
                    #
                    {sortField === "type" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase">
                  <button
                    onClick={() => handleSort("start_time")}
                    className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                  >
                    Data
                    {sortField === "start_time" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
                <div className="text-xs font-bold text-white/80 uppercase">
                  <button
                    onClick={() => handleSort("court")}
                    className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                  >
                    Campo
                    {sortField === "court" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase">
                  <button
                    onClick={() => handleSort("coach")}
                    className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                  >
                    Maestro
                    {sortField === "coach" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Azioni</div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredBookings.map((booking) => {
              const isPast = new Date(booking.start_time) < new Date();
              const isPastLesson =
                (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") &&
                new Date(booking.end_time) < new Date() &&
                booking.status !== "cancelled" &&
                booking.status !== "cancellation_requested";
              const isCancelled = booking.status === "cancelled";
              const isCancellationRequested = booking.status === "cancellation_requested";
              const canCancel = !isCancelled && !isCancellationRequested && !isPast;
              const canEdit = false;

              // Determina il colore del bordo in base allo stato (palette frozen-lake)
              let borderStyle = {};
              let statusColor = "";
              if (booking.status === "cancelled" || booking.status === "cancellation_requested") {
                borderStyle = { borderLeftColor: "#022431" }; // frozen-900 - annullata/richiesta cancellazione
                statusColor = "#022431";
              } else if (isPastLesson) {
                borderStyle = { borderLeftColor: "#6b7280" };
                statusColor = "#6b7280";
              } else {
                borderStyle = { borderLeftColor: "var(--secondary)" }; // secondary - stato positivo
                statusColor = "var(--secondary)";
              }

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                  style={borderStyle}
                >
                  <div
                    onClick={() => router.push(`${dashboardBase}/bookings/${booking.id}`)}
                    className="grid grid-cols-[40px_80px_56px_80px_1fr_56px_64px] items-center gap-4 no-underline"
                  >
                    {/* Simbolo Tipo */}
                    <div className="flex items-center justify-center">
                      {booking.type === "lezione_privata" && (
                        <User className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "lezione_gruppo" && (
                        <Users className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "campo" && (
                        <Calendar className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "arena" && (
                        <Trophy className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                    </div>

                    {/* Data */}
                    <div className="font-bold text-secondary text-sm whitespace-nowrap">
                      {formatDate(booking.start_time)}
                    </div>

                    {/* Orario */}
                    <div className="text-sm font-semibold text-secondary">
                      {formatTime(booking.start_time)}
                    </div>

                    {/* Campo */}
                    <div className="font-bold text-secondary text-sm">{booking.court}</div>

                    {/* Maestro */}
                    <div>
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-secondary truncate text-sm">
                          {booking.coach?.full_name || "N/A"}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

                    {/* Stato */}
                    <div className="flex items-center justify-center gap-1">
                      {booking.status === "cancelled" ? (
                        <XCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : booking.status === "cancellation_requested" ? (
                        <AlertCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : isPastLesson ? (
                        <Clock className="h-4 w-4" style={{ color: statusColor }} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                      )}
                    </div>

                    {/* Azioni - 3 puntini */}
                    <div className="relative flex items-center justify-center">
                      {(canEdit || canCancel) ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (openMenuId === booking.id) {
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                                setOpenMenuId(booking.id);
                              }
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === booking.id && menuPosition && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); }} />
                              <div
                                className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                              >
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                      router.push(`${dashboardBase}/bookings/${booking.id}/edit`);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Modifica
                                  </button>
                                )}
                                {canCancel && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                      cancelBooking(booking.id);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Annulla
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : isCancellationRequested ? (
                        <span className="inline-flex items-center justify-center p-1.5 text-[#056c94]" title="Cancellazione in attesa di approvazione">
                          <Clock className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Prenotazioni</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Seleziona i criteri per visualizzare le prenotazioni.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            <div className="space-y-1">
              <label htmlFor="bookings-visibility-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Stato
              </label>
              <select
                id="bookings-visibility-filter"
                value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value as "all" | "active" | "today" | "archived" | "cancelled" | "past")}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                  <option value="all">Tutte</option>
                <option value="active">Attivo (default)</option>
                <option value="today">Oggi</option>
                <option value="archived">Archiviate</option>
                <option value="cancelled">Annullate</option>
                <option value="past">Passate</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="bookings-type-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Tipo
              </label>
              <select
                id="bookings-type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i tipi</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {typeConfig[type]?.label || toTitleCaseWords(type)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="bookings-user-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Utente
              </label>
              <select
                id="bookings-user-filter"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti gli utenti</option>
                {userOptions.map((userName) => (
                  <option key={userName} value={userName}>
                    {userName}
                  </option>
                ))}
              </select>
            </div>

            {filterType === "lezione_privata" && (
              <div className="space-y-1">
                <label htmlFor="bookings-coach-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  Maestro
                </label>
                <select
                  id="bookings-coach-filter"
                  value={filterCoach}
                  onChange={(e) => setFilterCoach(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="all">Tutti i maestri</option>
                  {coachOptions.map((coachName) => (
                    <option key={coachName} value={coachName}>
                      {coachName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="bookings-court-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Campo
              </label>
              <select
                id="bookings-court-filter"
                value={filterCourt}
                onChange={(e) => setFilterCourt(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i campi</option>
                {courtOptions.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="bookings-date-from-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  Data da
                </label>
                <input
                  id="bookings-date-from-filter"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="bookings-date-to-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  Data a
                </label>
                <input
                  id="bookings-date-to-filter"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => {
                setFilterVisibility("active");
                setFilterUser("all");
                setFilterCoach("all");
                setFilterType("all");
                setFilterCourt("all");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
              className="w-1/2 py-3 border-r border-gray-200 text-secondary font-semibold hover:bg-gray-50 transition-colors"
            >
              Rimuovi filtri
            </button>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-1/2 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-br-lg"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
