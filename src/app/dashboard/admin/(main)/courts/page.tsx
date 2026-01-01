"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  MapPin,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Settings,
  Trash2,
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  surface: string;
  isIndoor: boolean;
  isActive: boolean;
}

interface CourtBlock {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  is_recurring: boolean;
}

interface Booking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  user: {
    full_name: string;
  };
}

// Static courts configuration
const COURTS: Court[] = [
  { id: "campo-1", name: "Campo 1", surface: "Terra Rossa", isIndoor: false, isActive: true },
  { id: "campo-2", name: "Campo 2", surface: "Terra Rossa", isIndoor: false, isActive: true },
  { id: "campo-3", name: "Campo 3", surface: "Sintetico", isIndoor: true, isActive: true },
  { id: "campo-4", name: "Campo 4", surface: "Cemento", isIndoor: false, isActive: true },
];

export default function CourtsPage() {
  const [blocks, setBlocks] = useState<CourtBlock[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [blockForm, setBlockForm] = useState({
    court_id: "",
    date: new Date().toISOString().split("T")[0],
    start_hour: "08",
    end_hour: "22",
    reason: "Manutenzione",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = new Date().toISOString().split("T")[0];

    // Load today's bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(full_name)
      `)
      .gte("start_time", `${today}T00:00:00`)
      .lte("start_time", `${today}T23:59:59`)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (bookingsData) {
      setTodayBookings(bookingsData);
    }

    // Load active blocks
    const { data: blocksData } = await supabase
      .from("court_blocks")
      .select("*")
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (blocksData) {
      setBlocks(blocksData);
    }

    setLoading(false);
  }

  async function createBlock() {
    setSaving(true);

    const startTime = new Date(`${blockForm.date}T${blockForm.start_hour}:00:00`);
    const endTime = new Date(`${blockForm.date}T${blockForm.end_hour}:00:00`);

    const { data, error } = await supabase
      .from("court_blocks")
      .insert({
        court_id: blockForm.court_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        reason: blockForm.reason,
      })
      .select()
      .single();

    if (!error && data) {
      setBlocks([...blocks, data]);
      setShowBlockModal(false);
      setBlockForm({
        court_id: "",
        date: new Date().toISOString().split("T")[0],
        start_hour: "08",
        end_hour: "22",
        reason: "Manutenzione",
      });
    }

    setSaving(false);
  }

  async function deleteBlock(id: string) {
    if (!confirm("Sei sicuro di voler rimuovere questo blocco?")) return;
    
    setDeleting(id);

    const { error } = await supabase
      .from("court_blocks")
      .delete()
      .eq("id", id);

    if (!error) {
      setBlocks(blocks.filter(b => b.id !== id));
    }

    setDeleting(null);
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
    });
  }

  function getCourtStatus(courtName: string) {
    const now = new Date();
    
    // Check if blocked
    const isBlocked = blocks.some(b => 
      b.court_id === courtName &&
      new Date(b.start_time) <= now &&
      new Date(b.end_time) >= now
    );

    if (isBlocked) {
      return { status: "blocked", label: "Bloccato", color: "bg-red-500" };
    }

    // Check if in use
    const currentBooking = todayBookings.find(b =>
      b.court === courtName &&
      new Date(b.start_time) <= now &&
      new Date(b.end_time) >= now
    );

    if (currentBooking) {
      return { status: "in-use", label: "In uso", color: "bg-blue-500", booking: currentBooking };
    }

    return { status: "available", label: "Disponibile", color: "bg-green-500" };
  }

  function getCourtBookings(courtName: string) {
    return todayBookings.filter(b => b.court === courtName);
  }

  function getCourtBlocks(courtName: string) {
    return blocks.filter(b => b.court_id === courtName);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Gestione Campi</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Monitora e gestisci i campi da tennis
          </p>
        </div>
        <button
          onClick={() => setShowBlockModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          <AlertTriangle className="h-5 w-5" />
          Blocca Campo
        </button>
      </div>

      {/* Courts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {COURTS.map((court) => {
          const status = getCourtStatus(court.name);
          const courtBookings = getCourtBookings(court.name);
          const courtBlocks = getCourtBlocks(court.name);

          return (
            <div
              key={court.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              {/* Court Header */}
              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${status.color}/10 flex items-center justify-center`}>
                      <MapPin className={`h-6 w-6 ${status.color.replace("bg-", "text-")}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">{court.name}</h3>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        {court.surface} • {court.isIndoor ? "Indoor" : "Outdoor"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${status.color}`} />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {status.label}
                    </span>
                  </div>
                </div>

                {status.booking && (
                  <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                    <p className="text-blue-700 dark:text-blue-300">
                      In uso da: {status.booking.user?.full_name || "Utente"} 
                      ({formatTime(status.booking.start_time)} - {formatTime(status.booking.end_time)})
                    </p>
                  </div>
                )}
              </div>

              {/* Today's Schedule */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">
                  Programma di Oggi
                </h4>
                
                {courtBookings.length === 0 && courtBlocks.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)] text-center py-4">
                    Nessuna prenotazione o blocco
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {/* Blocks */}
                    {courtBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <div className="text-sm">
                            <p className="text-red-700 dark:text-red-300 font-medium">
                              {block.reason}
                            </p>
                            <p className="text-red-600 dark:text-red-400 text-xs">
                              {formatDate(block.start_time)} {formatTime(block.start_time)} - {formatTime(block.end_time)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteBlock(block.id)}
                          disabled={deleting === block.id}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-800 text-red-500"
                        >
                          {deleting === block.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}

                    {/* Bookings */}
                    {courtBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-hover)]"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[var(--primary)]" />
                          <div className="text-sm">
                            <p className="text-[var(--foreground)] font-medium">
                              {booking.user?.full_name || "Prenotazione"}
                            </p>
                            <p className="text-[var(--foreground-muted)] text-xs">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }`}>
                          {booking.status === "confirmed" ? "Confermata" : "In attesa"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Blocks Summary */}
      {blocks.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Blocchi Attivi ({blocks.length})
          </h2>
          <div className="space-y-2">
            {blocks.slice(0, 5).map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-[var(--foreground-muted)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{block.court_id}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      {formatDate(block.start_time)} • {formatTime(block.start_time)} - {formatTime(block.end_time)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--foreground-muted)]">{block.reason}</span>
                  <button
                    onClick={() => deleteBlock(block.id)}
                    disabled={deleting === block.id}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--foreground-muted)] hover:text-red-500"
                  >
                    {deleting === block.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Blocca Campo
              </h2>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Campo
                </label>
                <select
                  value={blockForm.court_id}
                  onChange={(e) => setBlockForm({ ...blockForm, court_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="">Seleziona campo...</option>
                  {COURTS.map((court) => (
                    <option key={court.id} value={court.name}>{court.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  value={blockForm.date}
                  onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Ora Inizio
                  </label>
                  <select
                    value={blockForm.start_hour}
                    onChange={(e) => setBlockForm({ ...blockForm, start_hour: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
                      <option key={hour} value={hour.toString().padStart(2, "0")}>
                        {hour.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Ora Fine
                  </label>
                  <select
                    value={blockForm.end_hour}
                    onChange={(e) => setBlockForm({ ...blockForm, end_hour: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
                      <option key={hour} value={hour.toString().padStart(2, "0")}>
                        {hour.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Motivo
                </label>
                <select
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="Manutenzione">Manutenzione</option>
                  <option value="Evento privato">Evento privato</option>
                  <option value="Torneo">Torneo</option>
                  <option value="Maltempo">Maltempo</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={createBlock}
                  disabled={saving || !blockForm.court_id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Blocco...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Blocca
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
