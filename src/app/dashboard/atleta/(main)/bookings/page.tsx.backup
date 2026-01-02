"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  coach_id: string | null;
  notes: string | null;
  coach?: {
    full_name: string;
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"upcoming" | "history">("upcoming");

  useEffect(() => {
    loadBookings();
  }, [view]);

  async function loadBookings() {
    setLoading(true);
    const now = new Date().toISOString();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("bookings")
      .select(`
        *,
        coach:profiles!bookings_coach_id_fkey(full_name)
      `)
      .eq("user_id", user.id);

    if (view === "upcoming") {
      query = query
        .gte("start_time", now)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true })
        .limit(20);
    } else {
      query = query
        .lt("start_time", now)
        .order("start_time", { ascending: false })
        .limit(50);
    }

    const { data, error } = await query;

    if (!error && data) {
      setBookings(data);
    }
    setLoading(false);
  }

  async function cancelBooking(id: string) {
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (!error) {
      setBookings(bookings.map(b => 
        b.id === id ? { ...b, status: "cancelled" } : b
      ));
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    };
    const labels: Record<string, string> = {
      pending: "In attesa",
      confirmed: "Confermata",
      cancelled: "Annullata",
      completed: "Completata",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  }

  function getTypeBadge(type: string) {
    const styles: Record<string, string> = {
      campo: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
      lezione_privata: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      lezione_gruppo: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    };
    const labels: Record<string, string> = {
      campo: "Campo",
      lezione_privata: "Privata",
      lezione_gruppo: "Gruppo",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[type] || styles.campo}`}>
        {labels[type] || type}
      </span>
    );
  }

  // Generate week days for mini calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() - date.getDay() + i);
    return date;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get bookings for a specific day
  const getBookingsForDay = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return bookings.filter(b => {
      const bookingDate = new Date(b.start_time);
      return bookingDate >= dayStart && bookingDate <= dayEnd;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="h-40 skeleton rounded-xl" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Le Mie Prenotazioni</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Gestisci le tue prenotazioni di campi e lezioni
          </p>
        </div>
        <Link
          href="/dashboard/atleta/bookings/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuova Prenotazione
        </Link>
      </div>

      {/* Week Calendar */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() - 7);
              setCurrentWeek(newDate);
            }}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium text-[var(--foreground)]">
            {weekDays[0].toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() + 7);
              setCurrentWeek(newDate);
            }}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === today.toDateString();
            const dayBookings = getBookingsForDay(day);
            const hasBookings = dayBookings.length > 0;

            return (
              <div
                key={index}
                className={`text-center p-2 rounded-lg transition-colors ${
                  isToday
                    ? "bg-[var(--primary)] text-white"
                    : hasBookings
                    ? "bg-[var(--primary)]/10"
                    : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className={`text-xs ${isToday ? "text-white/80" : "text-[var(--foreground-muted)]"}`}>
                  {day.toLocaleDateString("it-IT", { weekday: "short" })}
                </div>
                <div className={`text-lg font-semibold ${isToday ? "text-white" : "text-[var(--foreground)]"}`}>
                  {day.getDate()}
                </div>
                {hasBookings && (
                  <div className={`text-xs mt-1 ${isToday ? "text-white/80" : "text-[var(--primary)]"}`}>
                    {dayBookings.length} pren.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] w-fit">
        <button
          onClick={() => setView("upcoming")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === "upcoming"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Prossime
        </button>
        <button
          onClick={() => setView("history")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === "history"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Storico
        </button>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Calendar className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            {view === "upcoming" ? "Nessuna prenotazione futura" : "Nessuna prenotazione passata"}
          </h3>
          <p className="text-[var(--foreground-muted)] mb-4">
            {view === "upcoming"
              ? "Prenota il tuo prossimo slot di gioco"
              : "Le tue prenotazioni passate appariranno qui"}
          </p>
          {view === "upcoming" && (
            <Link
              href="/dashboard/atleta/bookings/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Prenota Ora
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 hover:border-[var(--primary)]/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/10 flex flex-col items-center justify-center">
                    <span className="text-xs text-[var(--primary)] font-medium">
                      {new Date(booking.start_time).toLocaleDateString("it-IT", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-bold text-[var(--primary)]">
                      {new Date(booking.start_time).getDate()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(booking.type)}
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {booking.court}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </span>
                    </div>
                    {booking.coach?.full_name && (
                      <p className="text-sm text-[var(--foreground)] mt-1">
                        Maestro: {booking.coach.full_name}
                      </p>
                    )}
                  </div>
                </div>

                {view === "upcoming" && booking.status !== "cancelled" && (
                  <button
                    onClick={() => cancelBooking(booking.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
