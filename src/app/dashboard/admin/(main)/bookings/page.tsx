"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface Booking {
  id: string;
  user_id: string;
  court_id: number;
  coach_id: string | null;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
  confirmation_status: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  coach?: {
    full_name: string;
  };
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    loadBookings();
  }, [selectedDate, filterStatus, filterType]);

  async function loadBookings() {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from("bookings")
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(full_name, email),
        coach:profiles!bookings_coach_id_fkey(full_name)
      `)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: true });

    if (filterStatus !== "all") {
      query = query.eq("confirmation_status", filterStatus);
    }

    if (filterType !== "all") {
      query = query.eq("type", filterType);
    }

    const { data } = await query;

    if (data) {
      const processed = data.map(b => ({
        ...b,
        user: Array.isArray(b.user) ? b.user[0] : b.user,
        coach: Array.isArray(b.coach) ? b.coach[0] : b.coach,
      }));
      setBookings(processed);
    }

    setLoading(false);
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ confirmation_status: status })
      .eq("id", bookingId);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      loadBookings();
    }
  }

  async function cancelBooking(bookingId: string) {
    if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      loadBookings();
    }
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      libero: "Libero",
      lezione_privata: "Lezione Privata",
      lezione_gruppo: "Lezione Gruppo",
      torneo: "Torneo",
    };
    return labels[type] || type;
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      confirmed: "bg-[var(--accent-green)]/10 text-[var(--accent-green)]",
      pending: "bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]",
      cancelled: "bg-red-500/10 text-red-500",
    };
    const labels: Record<string, string> = {
      confirmed: "Confermato",
      pending: "In attesa",
      cancelled: "Cancellato",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ""}`}>
        {labels[status] || status}
      </span>
    );
  }

  function navigateDate(direction: "prev" | "next") {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  }

  const filteredBookings = bookings.filter(booking =>
    booking.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.confirmation_status === "confirmed").length,
    pending: bookings.filter(b => b.confirmation_status === "pending").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="h-12 skeleton rounded-lg" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Gestione Prenotazioni</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            {stats.total} prenotazioni per {selectedDate.toLocaleDateString("it-IT", { 
              weekday: "long", 
              day: "numeric", 
              month: "long" 
            })}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
        >
          <Download className="h-4 w-4" />
          Esporta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Totale</p>
        </div>
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-[var(--accent-green)]">{stats.confirmed}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Confermati</p>
        </div>
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-[var(--accent-yellow)]">{stats.pending}</p>
          <p className="text-sm text-[var(--foreground-muted)]">In attesa</p>
        </div>
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Cancellati</p>
        </div>
      </div>

      {/* Date Navigation & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Date Picker */}
        <div className="flex items-center gap-2 card rounded-lg p-2">
          <button
            onClick={() => navigateDate("prev")}
            className="p-2 hover:bg-[var(--surface-hover)] rounded-lg"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--foreground-muted)]" />
          </button>
          <input
            type="date"
            value={selectedDate.toISOString().split("T")[0]}
            onChange={e => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-1.5 bg-transparent text-[var(--foreground)] border-0 focus:ring-0"
          />
          <button
            onClick={() => navigateDate("next")}
            className="p-2 hover:bg-[var(--surface-hover)] rounded-lg"
          >
            <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Cerca utente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />
        </div>

        {/* Filters */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          <option value="all">Tutti gli stati</option>
          <option value="confirmed">Confermati</option>
          <option value="pending">In attesa</option>
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          <option value="all">Tutti i tipi</option>
          <option value="libero">Libero</option>
          <option value="lezione_privata">Lezione Privata</option>
          <option value="lezione_gruppo">Lezione Gruppo</option>
        </select>
      </div>

      {/* Bookings List */}
      <div className="card rounded-xl overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-[var(--foreground-muted)]" />
            <p className="text-[var(--foreground-muted)] mt-4">
              Nessuna prenotazione per questa data
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">Orario</th>
                <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">Utente</th>
                <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">Campo</th>
                <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">Tipo</th>
                <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">Stato</th>
                <th className="text-right p-4 text-sm font-medium text-[var(--foreground-muted)]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(booking => (
                <tr key={booking.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--foreground-muted)]" />
                      <span className="text-[var(--foreground)]">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {booking.user?.full_name || "N/A"}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {booking.user?.email}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-[var(--surface)] rounded text-sm text-[var(--foreground)]">
                      Campo {booking.court_id}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-[var(--foreground)]">{getTypeLabel(booking.type)}</span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(booking.confirmation_status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {booking.confirmation_status === "pending" && (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, "confirmed")}
                            className="p-2 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 rounded-lg"
                            title="Conferma"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                            title="Cancella"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        className="p-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] rounded-lg"
                        title="Dettagli"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
