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
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Sparkles,
  Search,
  Download,
  TrendingUp,
  Users,
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
  const [viewMode, setViewMode] = useState<"week" | "list">("week");
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function exportToCSV() {
    const allBookings = weekBookings.flatMap(day => 
      day.bookings.map(b => ({...b, date: day.date}))
    );
    
    const csv = [
      ["Data", "Ora Inizio", "Ora Fine", "Campo", "Atleta", "Email", "Tipo", "Stato Conferma"].join(","),
      ...allBookings.map((b) => [
        formatDate(b.start_time),
        formatTime(b.start_time),
        formatTime(b.end_time),
        b.court,
        b.user?.full_name || "N/A",
        b.user?.email || "N/A",
        typeConfig[b.type]?.label || b.type,
        b.coach_confirmed ? "Confermata" : "Da confermare",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  // All bookings flattened for filtering
  const allBookings = weekBookings.flatMap(day => 
    day.bookings.map(b => ({...b, date: day.date}))
  );

  // Apply filters
  const filteredAllBookings = allBookings.filter(booking => {
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "confirmed" && booking.coach_confirmed) ||
      (filterStatus === "pending" && !booking.coach_confirmed);
    
    const matchesSearch = 
      !searchQuery ||
      booking.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.court?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Stats for the week
  const totalLessons = allBookings.length;
  const confirmedLessons = allBookings.filter(b => b.coach_confirmed).length;
  const pendingLessons = totalLessons - confirmedLessons;
  const todayLessons = allBookings.filter(b => 
    b.date.toDateString() === today.toDateString()
  ).length;

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-blue-100 text-blue-700 border-blue-200" },
    lezione_privata: { label: "Lezione Privata", color: "bg-purple-100 text-purple-700 border-purple-200" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-frozen-600" />
        <p className="mt-4 text-gray-600 font-medium">Caricamento agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-frozen-300 bg-frozen-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-frozen-700 mb-2">
            <Calendar className="h-3.5 w-3.5" />
            Agenda
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Lezioni</h1>
          <p className="text-gray-600 font-medium">
            Visualizza e conferma le tue lezioni settimanali
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadWeekBookings()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 border border-gray-200 transition-all flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Ricarica
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 border border-gray-200 transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Esporta CSV
          </button>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-2 text-sm font-medium rounded transition-all ${
                viewMode === "week"
                  ? "text-white bg-frozen-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Settimana
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm font-medium rounded transition-all ${
                viewMode === "list"
                  ? "text-white bg-frozen-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome atleta, email o campo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-frozen-500/20 focus:border-frozen-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
              filterStatus === "all"
                ? "text-white bg-frozen-600 hover:bg-frozen-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setFilterStatus("confirmed")}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
              filterStatus === "confirmed"
                ? "text-white bg-green-600 hover:bg-green-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Confermate
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
              filterStatus === "pending"
                ? "text-white bg-yellow-600 hover:bg-yellow-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Da Confermare
          </button>
        </div>
      </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-frozen-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-frozen-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Totale Lezioni</p>
          <p className="text-3xl font-bold text-gray-900">{totalLessons}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Oggi</p>
          <p className="text-3xl font-bold text-blue-600">{todayLessons}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Confermate</p>
          <p className="text-3xl font-bold text-green-600">{confirmedLessons}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Da Confermare</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingLessons}</p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() - 7);
              setCurrentWeek(newDate);
            }}
            className="p-2.5 rounded-lg hover:bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <span className="font-bold text-lg text-gray-900">
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
            className="p-2.5 rounded-lg hover:bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {viewMode === "week" ? (
          /* Week Grid */
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {weekBookings.map((day, index) => {
              const isToday = day.date.toDateString() === today.toDateString();
              const isPast = day.date < today;

              return (
                <div key={index} className="min-h-[280px] flex flex-col">
                  {/* Day Header */}
                  <div className={`text-center py-3 border-b border-gray-200 ${
                    isToday 
                      ? "bg-frozen-600 text-white" 
                      : "bg-gray-50"
                  }`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                      isToday ? "text-frozen-100" : "text-gray-500"
                    }`}>
                      {day.date.toLocaleDateString("it-IT", { weekday: "short" })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? "text-white" : "text-gray-900"}`}>
                      {day.date.getDate()}
                    </div>
                  </div>

                  {/* Day Content */}
                  <div className={`p-2 space-y-2 flex-1 ${
                    isPast ? "bg-gray-50/50" : "bg-white"
                  }`}>
                    {day.bookings.length === 0 ? (
                      <p className="text-xs text-center text-gray-400 py-8">
                        Nessuna lezione
                      </p>
                    ) : (
                      day.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={`p-3 rounded-lg text-xs border transition-all hover:shadow-md ${
                            booking.coach_confirmed
                              ? "bg-green-50 border-green-200"
                              : "bg-yellow-50 border-yellow-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-900">
                              {formatTime(booking.start_time)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              typeConfig[booking.type]?.color || "bg-gray-100 text-gray-700 border-gray-200"
                            }`}>
                              {typeConfig[booking.type]?.label || booking.type}
                            </span>
                          </div>
                          <p className="text-gray-900 font-medium mb-1 truncate">
                            {booking.user?.full_name || "Atleta"}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3" />
                            {booking.court}
                          </p>
                          
                          {!isPast && !booking.coach_confirmed && (
                            <div className="flex gap-1.5 mt-2">
                              <button
                                onClick={() => updateBookingConfirmation(booking.id, true)}
                                disabled={updatingId === booking.id}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-all"
                              >
                                {updatingId === booking.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    Conferma
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => updateBookingConfirmation(booking.id, false)}
                                disabled={updatingId === booking.id}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
                              >
                                <X className="h-3.5 w-3.5" />
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
        ) : (
          /* List View */
          <div className="divide-y divide-gray-200">
            {filteredAllBookings.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery || filterStatus !== "all" 
                    ? "Nessuna lezione trovata"
                    : "Nessuna lezione questa settimana"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery || filterStatus !== "all"
                    ? "Prova a modificare i filtri di ricerca"
                    : "Le tue lezioni appariranno qui"}
                </p>
              </div>
            ) : (
              <>
                {/* Header Row - stile admin */}
                <div className="bg-gray-50 px-5 py-3">
                  <div className="flex items-center gap-6">
                    <div className="w-20">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Data</div>
                    </div>
                    <div className="w-24">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Orario</div>
                    </div>
                    <div className="w-24">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Campo</div>
                    </div>
                    <div className="w-32">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Atleta</div>
                    </div>
                    <div className="w-32">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Stato</div>
                    </div>
                    <div className="w-36 text-right">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Azioni</div>
                    </div>
                  </div>
                </div>

                {/* Data Rows */}
                {filteredAllBookings.map((booking) => {
                  const isPast = new Date(booking.start_time) < new Date();
                  return (
                    <div
                      key={booking.id}
                      className="bg-white px-5 py-4 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        {/* Data */}
                        <div className="w-20">
                          <div className={`text-sm font-bold ${
                            booking.date.toDateString() === today.toDateString()
                              ? "text-frozen-600"
                              : "text-gray-900"
                          }`}>
                            {booking.date.getDate()} {booking.date.toLocaleDateString("it-IT", { month: "short" })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {booking.date.toLocaleDateString("it-IT", { weekday: "short" })}
                          </div>
                        </div>

                        {/* Orario */}
                        <div className="w-24">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatTime(booking.start_time)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatTime(booking.end_time)}
                          </div>
                        </div>

                        {/* Campo */}
                        <div className="w-24">
                          <div className="font-bold text-gray-900">{booking.court}</div>
                        </div>

                        {/* Tipo */}
                        <div className="w-32">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                            typeConfig[booking.type]?.color || "bg-gray-100 text-gray-700 border-gray-200"
                          }`}>
                            {typeConfig[booking.type]?.label || booking.type}
                          </span>
                        </div>

                        {/* Atleta */}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 truncate">
                            {booking.user?.full_name || "Atleta"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {booking.user?.email || ""}
                          </div>
                        </div>

                        {/* Stato */}
                        <div className="w-32">
                          {booking.coach_confirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Confermata
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Da confermare
                            </span>
                          )}
                        </div>

                        {/* Azioni */}
                        <div className="flex gap-2 w-36 justify-end">
                          {!isPast && !booking.coach_confirmed && (
                            <>
                              <button
                                onClick={() => updateBookingConfirmation(booking.id, true)}
                                disabled={updatingId === booking.id}
                                className="p-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="Conferma"
                              >
                                {updatingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => updateBookingConfirmation(booking.id, false)}
                                disabled={updatingId === booking.id}
                                className="p-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="Rifiuta"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Today's Detail View - Only in Week Mode */}
      {viewMode === "week" && weekBookings.find(d => d.date.toDateString() === today.toDateString())?.bookings.length ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-gradient-to-r from-frozen-50 to-transparent">
            <div className="w-12 h-12 rounded-xl bg-frozen-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-frozen-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Lezioni di Oggi</h2>
              <p className="text-sm text-gray-600">Il tuo programma giornaliero</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {weekBookings
              .find(d => d.date.toDateString() === today.toDateString())
              ?.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-frozen-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">
                        {booking.user?.full_name || "Atleta"}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {booking.court}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      typeConfig[booking.type]?.color || "bg-gray-100 text-gray-700 border-gray-200"
                    }`}>
                      {typeConfig[booking.type]?.label || booking.type}
                    </span>
                    {booking.coach_confirmed ? (
                      <span className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 rounded-lg border border-green-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Confermata
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-lg border border-yellow-200">
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
