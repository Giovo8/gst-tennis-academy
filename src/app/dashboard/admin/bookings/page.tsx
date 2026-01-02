"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  User,
  MapPin,
  RefreshCw,
  Shield,
} from "lucide-react";

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
  created_at: string;
  user_profile?: { full_name: string; email: string } | null;
  coach_profile?: { full_name: string; email: string } | null;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      console.log("🔍 Caricamento prenotazioni...");
      
      // Prima verifica il ruolo dell'utente
      const { data: { user } } = await supabase.auth.getUser();
      console.log("👤 Utente:", user?.id);
      
      const { data: roleData } = await supabase.rpc('get_my_role');
      console.log("🎭 Ruolo:", roleData);
      
      // Prima query: prendi tutte le bookings
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
        console.log("⚠️ Nessuna prenotazione trovata");
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
        .select("id, full_name, email")
        .in("id", userIds);

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
        coach_profile: booking.coach_id ? profilesMap.get(booking.coach_id) || null : null
      }));

      console.log("✅ Prenotazioni caricate:", enrichedBookings.length);
      setBookings(enrichedBookings);
    } catch (error) {
      console.error("❌ Errore nel caricamento prenotazioni:", error);
      alert(`Errore: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking(bookingId: string) {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          manager_confirmed: true,
          status: "confirmed" 
        })
        .eq("id", bookingId);

      if (!error) {
        loadBookings();
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
    }
  }

  async function rejectBooking(bookingId: string) {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled",
          manager_confirmed: false
        })
        .eq("id", bookingId);

      if (!error) {
        loadBookings();
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  }

  async function deleteBooking(bookingId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione?")) return;
    
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (!error) {
        loadBookings();
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  }

  function exportToCSV() {
    const csv = [
      ["Data", "Ora Inizio", "Ora Fine", "Campo", "Atleta", "Maestro", "Tipo", "Status", "Conferma Manager"].join(","),
      ...filteredBookings.map((b) => [
        formatDate(b.start_time),
        formatTime(b.start_time),
        formatTime(b.end_time),
        b.court,
        b.user_profile?.full_name || "N/A",
        b.coach_profile?.full_name || "N/A",
        typeConfig[b.type]?.label || b.type,
        statusConfig[b.status]?.label || b.status,
        b.manager_confirmed ? "Sì" : "No",
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
    campo: { label: "Campo", color: "bg-blue-100 text-blue-700 border-blue-300" },
    lezione_privata: { label: "Lezione Privata", color: "bg-purple-100 text-purple-700 border-purple-300" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-pink-100 text-pink-700 border-pink-300" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Confermata", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = filter === "all" || booking.status === filter;
    const matchesSearch =
      !search ||
      booking.user_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.user_profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      booking.coach_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.court?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending" || !b.manager_confirmed).length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    needsApproval: bookings.filter((b) => !b.manager_confirmed && b.status !== "cancelled").length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2">
            Gestione Prenotazioni
          </h1>
          <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>
            Visualizza, conferma e gestisci tutte le prenotazioni dei campi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/bookings/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Crea Prenotazione
          </Link>
          <Link
            href="/dashboard/admin/courts"
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Blocco Campi
          </Link>
          <button
            onClick={() => loadBookings()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Ricarica
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Esporta CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Totale</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.confirmed}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Confermate</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.pending}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>In Attesa</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.needsApproval}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Da Approvare</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.cancelled}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Annullate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome atleta, maestro, email o campo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Filter className="inline-block w-4 h-4 mr-1.5" />
            Tutte
          </button>
          {Object.entries(statusConfig).map(([status, { label }]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === status
                  ? "text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Caricamento prenotazioni...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-gray-200 bg-white">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessuna prenotazione trovata</h3>
          <p className="text-gray-600">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-gray-100 rounded-xl px-5 py-3 border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-28">
                  <div className="text-xs font-bold text-gray-600 uppercase">Data e Orario</div>
                </div>
                <div className="w-24">
                  <div className="text-xs font-bold text-gray-600 uppercase">Campo</div>
                </div>
                <div className="w-32">
                  <div className="text-xs font-bold text-gray-600 uppercase">Tipo</div>
                </div>
                <div className="w-56">
                  <div className="text-xs font-bold text-gray-600 uppercase">Atleta</div>
                </div>
                <div className="w-48">
                  <div className="text-xs font-bold text-gray-600 uppercase">Maestro</div>
                </div>
                <div className="w-32">
                  <div className="text-xs font-bold text-gray-600 uppercase">Stato</div>
                </div>
              </div>
              <div className="w-36 text-right">
                <div className="text-xs font-bold text-gray-600 uppercase">Azioni</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {filteredBookings.map((booking) => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const bookingType = typeConfig[booking.type] || typeConfig.campo;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Info principale - Grid con larghezze fisse */}
                  <div className="flex items-center gap-6 flex-1">
                    {/* Data e Ora */}
                    <div className="w-28">
                      <div className="font-bold text-gray-700 text-sm mb-0.5">
                        {formatDate(booking.start_time)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                    </div>

                    {/* Campo */}
                    <div className="w-24">
                      <div className="font-bold text-gray-700">{booking.court}</div>
                    </div>

                    {/* Tipo */}
                    <div className="w-32">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border ${bookingType.color}`}>
                        {bookingType.label}
                      </span>
                    </div>

                    {/* Atleta */}
                    <div className="w-56">
                      <div className="font-semibold text-gray-700 truncate">
                        {booking.user_profile?.full_name || "Nome non disponibile"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {booking.user_profile?.email || ""}
                      </div>
                    </div>

                    {/* Maestro - sempre visibile con larghezza fissa */}
                    <div className="w-48">
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-gray-700 truncate">
                          {booking.coach_profile?.full_name || "Non assegnato"}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-32">
                      {!booking.manager_confirmed && booking.status !== "cancelled" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border bg-orange-100 text-orange-700 border-orange-300">
                          <AlertCircle className="h-3 w-3" />
                          Da Approvare
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Azioni - sempre nella stessa posizione */}
                  <div className="flex gap-2 w-36 justify-end">{!booking.manager_confirmed && booking.status !== "cancelled" && (
                      <>
                        <button
                          onClick={() => confirmBooking(booking.id)}
                          className="p-2 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-200 transition-colors"
                          title="Approva"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => rejectBooking(booking.id)}
                          className="p-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors"
                          title="Rifiuta"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {booking.status !== "cancelled" && (
                      <button
                        onClick={() => {
                          setEditingBooking(booking);
                          setShowEditModal(true);
                        }}
                        className="p-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Modifica"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteBooking(booking.id)}
                      className="p-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal di Modifica */}
      {showEditModal && editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => {
            setShowEditModal(false);
            setEditingBooking(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditingBooking(null);
            loadBookings();
          }}
        />
      )}
    </div>
  );
}

function EditBookingModal({ 
  booking, 
  onClose, 
  onSave 
}: { 
  booking: Booking; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const [court, setCourt] = useState(booking.court);
  const [startTime, setStartTime] = useState(booking.start_time);
  const [endTime, setEndTime] = useState(booking.end_time);
  const [notes, setNotes] = useState(booking.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          court,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
        })
        .eq("id", booking.id);

      if (error) throw error;
      
      alert("Prenotazione aggiornata con successo!");
      onSave();
    } catch (error) {
      console.error("Errore aggiornamento:", error);
      alert("Errore durante l'aggiornamento della prenotazione");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">Modifica Prenotazione</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Info Atleta */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Atleta</div>
            <div className="font-semibold text-gray-700">
              {booking.user_profile?.full_name || "Nome non disponibile"}
            </div>
            <div className="text-sm text-gray-500">{booking.user_profile?.email}</div>
          </div>

          {/* Campo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Campo
            </label>
            <select
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {["Campo 1", "Campo 2", "Campo 3", "Campo 4", "Campo 5", "Campo 6", "Campo 7", "Campo 8"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Orario Inizio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Orario Inizio
            </label>
            <input
              type="datetime-local"
              value={startTime.slice(0, 16)}
              onChange={(e) => setStartTime(new Date(e.target.value).toISOString())}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Orario Fine */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Orario Fine
            </label>
            <input
              type="datetime-local"
              value={endTime.slice(0, 16)}
              onChange={(e) => setEndTime(new Date(e.target.value).toISOString())}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Aggiungi note opzionali..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex gap-3 justify-end border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Modifiche"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
