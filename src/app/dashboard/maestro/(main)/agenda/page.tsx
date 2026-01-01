"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Booking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  coach_confirmed: boolean;
  notes: string | null;
  user: {
    full_name: string;
    email: string;
  };
}

interface DayBookings {
  date: Date;
  bookings: Booking[];
}

export default function AgendaPage() {
  const [weekBookings, setWeekBookings] = useState<DayBookings[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadWeekBookings();
  }, [currentWeek]);

  async function loadWeekBookings() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Calculate week start and end
    const weekStart = new Date(currentWeek);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(full_name, email)
      `)
      .eq("coach_id", user.id)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (!error && data) {
      // Group by day
      const days: DayBookings[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        
        const dayBookings = data.filter(b => {
          const bookingDate = new Date(b.start_time);
          return bookingDate.toDateString() === date.toDateString();
        });

        days.push({ date, bookings: dayBookings });
      }
      setWeekBookings(days);
    }

    setLoading(false);
  }

  async function updateBookingConfirmation(id: string, confirmed: boolean) {
    setUpdatingId(id);

    const { error } = await supabase
      .from("bookings")
      .update({ 
        coach_confirmed: confirmed,
        status: confirmed ? "confirmed" : "pending"
      })
      .eq("id", id);

    if (!error) {
      setWeekBookings(prev => 
        prev.map(day => ({
          ...day,
          bookings: day.bookings.map(b => 
            b.id === id ? { ...b, coach_confirmed: confirmed, status: confirmed ? "confirmed" : "pending" } : b
          )
        }))
      );
    }

    setUpdatingId(null);
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTypeBadge(type: string) {
    const styles: Record<string, string> = {
      lezione_privata: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      lezione_gruppo: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    };
    const labels: Record<string, string> = {
      lezione_privata: "Privata",
      lezione_gruppo: "Gruppo",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[type] || "bg-gray-100 text-gray-700"}`}>
        {labels[type] || type}
      </span>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  // Stats for the week
  const totalLessons = weekBookings.reduce((sum, day) => sum + day.bookings.length, 0);
  const confirmedLessons = weekBookings.reduce(
    (sum, day) => sum + day.bookings.filter(b => b.coach_confirmed).length,
    0
  );
  const pendingLessons = totalLessons - confirmedLessons;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-96 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Agenda</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          Gestisci le tue lezioni settimanali
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--foreground-muted)]">Totale Lezioni</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{totalLessons}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--foreground-muted)]">Confermate</p>
          <p className="text-2xl font-bold text-green-600">{confirmedLessons}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--foreground-muted)]">Da Confermare</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingLessons}</p>
        </div>
      </div>

      {/* Week Navigation */}
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
          <div className="text-center">
            <span className="font-semibold text-[var(--foreground)]">
              {weekStart.toLocaleDateString("it-IT", { day: "numeric", month: "long" })} - {" "}
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
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

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekBookings.map((day, index) => {
            const isToday = day.date.toDateString() === today.toDateString();
            const isPast = day.date < today;

            return (
              <div key={index} className="min-h-[200px]">
                {/* Day Header */}
                <div className={`text-center py-2 rounded-t-lg ${
                  isToday 
                    ? "bg-[var(--primary)] text-white" 
                    : "bg-[var(--surface-hover)]"
                }`}>
                  <div className={`text-xs ${isToday ? "text-white/80" : "text-[var(--foreground-muted)]"}`}>
                    {day.date.toLocaleDateString("it-IT", { weekday: "short" })}
                  </div>
                  <div className={`text-lg font-semibold ${isToday ? "text-white" : "text-[var(--foreground)]"}`}>
                    {day.date.getDate()}
                  </div>
                </div>

                {/* Day Content */}
                <div className={`border border-t-0 border-[var(--border)] rounded-b-lg p-2 space-y-2 min-h-[160px] ${
                  isPast ? "bg-[var(--surface-hover)]/50" : ""
                }`}>
                  {day.bookings.length === 0 ? (
                    <p className="text-xs text-center text-[var(--foreground-subtle)] py-4">
                      Nessuna lezione
                    </p>
                  ) : (
                    day.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={`p-2 rounded-lg text-xs ${
                          booking.coach_confirmed
                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                            : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-[var(--foreground)]">
                            {formatTime(booking.start_time)}
                          </span>
                          {getTypeBadge(booking.type)}
                        </div>
                        <p className="text-[var(--foreground-muted)] truncate">
                          {booking.user?.full_name || "Atleta"}
                        </p>
                        <p className="text-[var(--foreground-subtle)] flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.court}
                        </p>
                        
                        {!isPast && !booking.coach_confirmed && (
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => updateBookingConfirmation(booking.id, true)}
                              disabled={updatingId === booking.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                            >
                              {updatingId === booking.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={() => updateBookingConfirmation(booking.id, false)}
                              disabled={updatingId === booking.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Detail View */}
      {weekBookings.find(d => d.date.toDateString() === today.toDateString())?.bookings.length ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--primary)]" />
            Lezioni di Oggi
          </h2>
          <div className="space-y-3">
            {weekBookings
              .find(d => d.date.toDateString() === today.toDateString())
              ?.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {booking.user?.full_name || "Atleta"}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.court}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(booking.type)}
                    {booking.coach_confirmed ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <Check className="h-4 w-4" />
                        Confermata
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Da confermare
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
