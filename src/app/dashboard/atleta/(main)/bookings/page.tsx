"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Booking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  coach_id: string | null;
  notes: string | null;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  coach?: {
    full_name: string;
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("start_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    console.log("🔍 Caricamento prenotazioni atleta...");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("❌ Nessun utente loggato");
      setLoading(false);
      return;
    }
    
    console.log("👤 User ID:", user.id);

    // Prima query: prendi tutte le bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
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
    
    let coachesMap = new Map();
    if (coachIds.length > 0) {
      const { data: coachesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", coachIds);
      
      if (coachesData) {
        coachesMap = new Map(coachesData.map(c => [c.id, c]));
      }
    }

    // Combina i dati
    const enrichedBookings = bookingsData.map(booking => ({
      ...booking,
      coach: booking.coach_id ? coachesMap.get(booking.coach_id) : null
    }));

    console.log("📋 Dati arricchiti:", enrichedBookings);
    setBookings(enrichedBookings);
    setLoading(false);
  }

  async function cancelBooking(id: string) {
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (!error) {
      loadBookings();
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

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-blue-100 text-blue-700 border-blue-300" },
    lezione_privata: { label: "Lezione Privata", color: "bg-purple-100 text-purple-700 border-purple-300" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-pink-100 text-pink-700 border-pink-300" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Confermata", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  };

  const filteredBookings = bookings
    .filter((booking) => {
      const matchesStatus = filter === "all" || booking.status === filter;
      const matchesSearch =
        !search ||
        booking.court?.toLowerCase().includes(search.toLowerCase()) ||
        booking.coach?.full_name?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
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

  const now = new Date().toISOString();
  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.start_time >= now && b.status !== "cancelled").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
  };

  if (loading) {
    return (
      <div className="space-y-6" style={{ color: '#111827' }}>
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
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-cyan-600" />
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Prenotazioni
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/atleta/bookings/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Prenotazione
          </Link>
          <button
            onClick={() => loadBookings()}
            className="p-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            title="Ricarica"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per campo o maestro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 font-medium placeholder:text-gray-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tutte
            </button>
            <button
              onClick={() => setFilter("confirmed")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                filter === "confirmed"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Confermate
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                filter === "pending"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              In Attesa
            </button>
            <button
              onClick={() => setFilter("cancelled")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                filter === "cancelled"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Annullate
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Nessuna prenotazione trovata
          </h3>
          <p className="text-gray-600 mb-6">
            {search || filter !== "all" 
              ? "Prova a modificare i filtri di ricerca"
              : "Prenota il tuo primo campo per iniziare"}
          </p>
          {!search && filter === "all" && (
            <Link
              href="/dashboard/atleta/bookings/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              Prenota Ora
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("start_time")}
                      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        sortField === "start_time" 
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent" 
                          : "text-gray-700 hover:text-cyan-600"
                      }`}
                    >
                      Data & Ora
                      {sortField === "start_time" && (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4 text-cyan-600" /> : <ArrowDown className="h-4 w-4 text-cyan-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("court")}
                      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        sortField === "court" 
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent" 
                          : "text-gray-700 hover:text-cyan-600"
                      }`}
                    >
                      Campo
                      {sortField === "court" && (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4 text-cyan-600" /> : <ArrowDown className="h-4 w-4 text-cyan-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("type")}
                      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        sortField === "type" 
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent" 
                          : "text-gray-700 hover:text-cyan-600"
                      }`}
                    >
                      Tipo
                      {sortField === "type" && (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4 text-cyan-600" /> : <ArrowDown className="h-4 w-4 text-cyan-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("coach")}
                      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        sortField === "coach" 
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent" 
                          : "text-gray-700 hover:text-cyan-600"
                      }`}
                    >
                      Maestro
                      {sortField === "coach" && (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4 text-cyan-600" /> : <ArrowDown className="h-4 w-4 text-cyan-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("status")}
                      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        sortField === "status" 
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent" 
                          : "text-gray-700 hover:text-cyan-600"
                      }`}
                    >
                      Stato
                      {sortField === "status" && (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4 text-cyan-600" /> : <ArrowDown className="h-4 w-4 text-cyan-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Conferme
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => {
                  const StatusIcon = statusConfig[booking.status]?.icon || Clock;
                  const isPast = new Date(booking.start_time) < new Date();
                  const canCancel = booking.status !== "cancelled" && !isPast;

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDate(booking.start_time)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-300">
                          {booking.court}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${typeConfig[booking.type]?.color || typeConfig.campo.color}`}>
                          {typeConfig[booking.type]?.label || booking.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {booking.coach?.full_name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusConfig[booking.status]?.color || statusConfig.pending.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig[booking.status]?.label || booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div title="Manager">
                            {booking.manager_confirmed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                          {booking.coach_id && (
                            <div title="Maestro">
                              {booking.coach_confirmed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {canCancel && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1 ml-auto"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Annulla
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      {filteredBookings.some(b => b.status === "pending") && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">
                Prenotazioni in attesa di conferma
              </p>
              <p className="text-sm text-amber-800">
                Alcune prenotazioni sono in attesa di conferma da parte del gestore o del maestro. 
                Riceverai una notifica quando saranno confermate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
