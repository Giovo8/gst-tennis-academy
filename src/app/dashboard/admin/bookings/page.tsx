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
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  User,
  MapPin,
  RefreshCw,
  Shield,
  List,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Trophy,
  Circle,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
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
type BookingsPageProps = {
  mode?: "default" | "history";
  basePath?: string;
};

export default function BookingsPage({ mode = "default", basePath = "/dashboard/admin" }: BookingsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVisibility, setFilterVisibility] = useState<"active" | "today" | "archived" | "cancelled" | "past">("active");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterCoach, setFilterCoach] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCourt, setFilterCourt] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [sortBy, setSortBy] = useState<"date" | "court" | "type" | "status" | "athlete" | "coach" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
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

  const getParticipantIdentityKey = (booking: Booking) => {
    if (booking.participants && booking.participants.length > 0) {
      return booking.participants
        .map((participant) => participant.user_id || `guest:${participant.full_name.trim().toLowerCase()}`)
        .join("|");
    }

    return booking.user_id;
  };

  useEffect(() => {
    loadBookings();
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
      
      const { data: roleData } = await supabase.rpc('get_my_role');
      
      // Prima query: prendi le ultime prenotazioni
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(200);

      if (bookingsError) {
        console.error("❌ Errore Supabase:", bookingsError);
        alert(`Errore nel caricamento: ${bookingsError.message}\n\nVerifica di avere il ruolo admin/gestore nel database.`);
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
      alert(`Errore: ${error}`);
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
      alert(error instanceof Error ? error.message : "Errore durante l'eliminazione");
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
    const isTimelineMode = mode !== "history" && viewMode === "timeline";
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

    const matchesVisibility = isTimelineMode
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
  });

  // Sorting logic
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortBy) return 0;

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
    const menuHeight = 100; // 2 items + paddings
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {mode === "history" && (
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
          )}
          <h1 className="text-4xl font-bold text-secondary">
            {mode === "history" ? "Storico prenotazioni" : "Gestione Prenotazioni"}
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {mode !== "history" && (
            <>
              <Link
                href={`${basePath}/bookings/new`}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crea Prenotazione
              </Link>
            </>
          )}
          {mode !== "history" && (
            <Link
              href={`${basePath}/courts`}
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
              title="Blocco Campi"
            >
              <Shield className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search field - solo in modalità storico non mostrare timeline */}
        {mode === "history" ? (
          renderSearchWithFilter()
        ) : (
          <>
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 px-4 py-3 sm:px-3 sm:py-2.5 rounded text-sm sm:text-xs font-semibold transition-all flex items-center justify-center gap-2 sm:gap-1.5 ${
                  viewMode === "list"
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
                  viewMode === "timeline"
                    ? "bg-secondary text-white"
                    : "text-secondary/60 hover:text-secondary border border-gray-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                Timeline
              </button>
            </div>
            {viewMode === "list" && (
              renderSearchWithFilter()
            )}
          </>
        )}
      </div>

      {/* Bookings List or Timeline */}
      {mode !== "history" && viewMode === "timeline" ? (
        <BookingsTimeline bookings={sortedBookings} loading={loading} basePath={basePath} />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento prenotazioni...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Calendar className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna prenotazione trovata</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[1040px]">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="grid grid-cols-[40px_80px_56px_80px_220px_120px_1fr_60px_64px] items-center gap-4">
              <div className="text-xs font-bold text-white/80 uppercase text-center">
                <button
                  onClick={() => handleSort("type")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
                >
                  #
                  {sortBy === "type" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="text-xs font-bold text-white/80 uppercase">
                <button
                  onClick={() => handleSort("date")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Data
                  {sortBy === "date" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
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
                  {sortBy === "court" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="text-xs font-bold text-white/80 uppercase">
                <button
                  onClick={() => handleSort("athlete")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Atleta
                  {sortBy === "athlete" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="text-xs font-bold text-white/80 uppercase">
                <button
                  onClick={() => handleSort("coach")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Maestro
                  {sortBy === "coach" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div></div>
              <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
              <div></div>
            </div>
          </div>

          {/* Data Rows */}
          {sortedBookings.map((booking) => {
            const status = statusConfig[booking.status] || {
              label: getStatusLabel(booking.status),
              color: "bg-secondary text-white",
              icon: Circle,
            };
            const StatusIcon = status.icon;
            const bookingType = typeConfig[booking.type] || typeConfig.campo;
            const isCancelledBooking =
              booking.status === "cancelled" || booking.status === "cancellation_requested";
            const isPastBooking = new Date(booking.end_time) < new Date();
            
            // Determina il colore del bordo in base allo stato (palette frozen-lake)
            let borderStyle = {};
            let statusColor = "";
            if (isCancelledBooking) {
              borderStyle = { borderLeftColor: "#6b7280" };
              statusColor = "#6b7280";
            } else if (isPastBooking) {
              borderStyle = { borderLeftColor: "#9ca3af" };
              statusColor = "#9ca3af";
            } else {
              // Colore dinamico in base al tipo (stesso schema timeline)
              if (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") {
                borderStyle = { borderLeftColor: "#023047" };
                statusColor = "#023047";
              } else if (booking.type === "arena") {
                borderStyle = { borderLeftColor: "var(--color-frozen-lake-600)" };
                statusColor = "var(--color-frozen-lake-600)";
              } else {
                borderStyle = { borderLeftColor: "var(--secondary)" };
                statusColor = "var(--secondary)";
              }
            }

            return (
              <div
                key={booking.id}
                className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                style={borderStyle}
              >
                <div
                  onClick={() => router.push(`${basePath}/bookings/${booking.id}`)}
                  className="grid grid-cols-[40px_80px_56px_80px_220px_220px_1fr_60px_64px] items-center gap-4 no-underline"
                >
                    {/* Simbolo Tipo */}
                    <div className="flex items-center justify-center">
                      {booking.type === "lezione_privata" && (
                        <Users className="h-5 w-5" strokeWidth={2} style={{ color: isCancelledBooking || isPastBooking ? "#9ca3af" : "#023047" }} />
                      )}
                      {booking.type === "lezione_gruppo" && (
                        <Users className="h-5 w-5" strokeWidth={2} style={{ color: isCancelledBooking || isPastBooking ? "#9ca3af" : "#023047" }} />
                      )}
                      {booking.type === "campo" && (
                        <CalendarClock className="h-5 w-5" strokeWidth={2} style={{ color: isCancelledBooking || isPastBooking ? "#9ca3af" : "var(--secondary)" }} />
                      )}
                      {booking.type === "arena" && (
                        <Trophy className="h-5 w-5" strokeWidth={2} style={{ color: isCancelledBooking || isPastBooking ? "#9ca3af" : "var(--color-frozen-lake-600)" }} />
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
                    <div className="font-bold text-secondary">{booking.court}</div>

                    {/* Atleta */}
                    <div className="font-semibold text-secondary text-sm whitespace-nowrap">
                      {getAthleteDisplayName(booking)}
                    </div>

                    {/* Maestro */}
                    <div>
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-secondary text-sm whitespace-nowrap">
                          {booking.coach_profile?.full_name || "N/A"}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

                    {/* Spazio flessibile */}
                    <div></div>

                    {/* Stato */}
                    <div className="flex items-center justify-center gap-1">
                      {booking.status === "cancelled" ? (
                        <XCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : booking.status === "cancellation_requested" ? (
                        <AlertCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : isPastBooking ? (
                        <Clock className="h-4 w-4" style={{ color: statusColor }} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                      )}
                    </div>

                    {/* Azioni - 3 puntini */}
                    <div className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (openMenuId === booking.id) {
                            closeActionMenu();
                            return;
                          }

                          openActionMenu(booking.id, e.currentTarget.getBoundingClientRect());
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === booking.id && menuPosition && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                          <div
                            className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                          >
                            <Link
                              href={`${basePath}/bookings/modifica?id=${booking.id}`}
                              onClick={(e) => { e.stopPropagation(); closeActionMenu(); }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Modifica
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                closeActionMenu();
                                if (confirm("Sei sicuro di voler eliminare questa prenotazione?")) {
                                  deleteBooking(booking.id);
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Elimina
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Modale di modifica rimosso: ora la modifica avviene su pagina dedicata */}

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
                onChange={(e) => setFilterVisibility(e.target.value as "active" | "today" | "archived" | "cancelled" | "past")}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
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

// Modale di modifica rimosso: ora la modifica avviene su pagina dedicata
