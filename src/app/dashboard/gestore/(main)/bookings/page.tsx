"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, User, MapPin, Filter, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Booking = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  status: string;
  user: {
    full_name: string;
    email: string;
  } | null;
};

export default function GestoreBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("today");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadBookings();
  }, [filter]);

  async function loadBookings() {
    setLoading(true);
    
    let query = supabase
      .from("bookings")
      .select(`
        id,
        court_id,
        start_time,
        end_time,
        status,
        user:profiles!bookings_user_id_fkey(full_name, email)
      `)
      .order("start_time", { ascending: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (filter === "today") {
      query = query
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString());
    } else if (filter === "upcoming") {
      query = query.gte("start_time", new Date().toISOString());
    }

    const { data, error } = await query.limit(100);

    if (!error && data) {
      const formattedBookings = data.map(b => ({
        ...b,
        user: Array.isArray(b.user) ? b.user[0] : b.user
      }));
      setBookings(formattedBookings);
    }
    
    setLoading(false);
  }

  const filteredBookings = bookings.filter(b => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      b.user?.full_name?.toLowerCase().includes(search) ||
      b.user?.email?.toLowerCase().includes(search) ||
      b.court_id.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
    return styles[status] || styles.pending;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Prenotazioni</h1>
          <p className="text-[var(--foreground-muted)]">Gestisci le prenotazioni dei campi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Cerca per nome, email o campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)]"
          />
        </div>
        <div className="flex gap-2">
          {(["today", "upcoming", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {f === "today" ? "Oggi" : f === "upcoming" ? "Prossime" : "Tutte"}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-[var(--foreground-muted)]">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna prenotazione trovata</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-[var(--primary)]/10 p-3">
                      <Calendar className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--foreground)]">
                          {booking.user?.full_name || "Utente"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-muted)]">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.court_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(booking.start_time), "HH:mm", { locale: it })} - {format(new Date(booking.end_time), "HH:mm", { locale: it })}
                        </span>
                        <span>
                          {format(new Date(booking.start_time), "d MMMM yyyy", { locale: it })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
