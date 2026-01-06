"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Shield,
  Clock,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { addDays, format, startOfWeek, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4", "Campo 5", "Campo 6", "Campo 7", "Campo 8"];
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
  "20:00", "21:00", "22:00"
];

type Block = {
  id: string;
  court: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
};

export default function CourtsBlockPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadBlocks();
  }, [selectedDate]);

  async function loadBlocks() {
    try {
      setLoading(true);
      const startDate = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const endDate = format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("court_blocks")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (!error && data) {
        setBlocks(data);
      }
    } catch (err) {
      console.error("Error loading blocks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBlock() {
    if (!selectedCourt || !selectedStartTime || !selectedEndTime) {
      setError("Seleziona campo, ora inizio e ora fine");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      const blockDate = format(selectedDate, "yyyy-MM-dd");
      
      const { error: insertError } = await supabase
        .from("court_blocks")
        .insert({
          court: selectedCourt,
          date: blockDate,
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          reason: reason || null,
        });

      if (insertError) throw insertError;

      setSuccess("Blocco creato con successo!");
      setSelectedCourt("");
      setSelectedStartTime("");
      setSelectedEndTime("");
      setReason("");
      loadBlocks();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Errore nella creazione del blocco");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    if (!confirm("Sei sicuro di voler rimuovere questo blocco?")) return;

    try {
      const { error } = await supabase
        .from("court_blocks")
        .delete()
        .eq("id", blockId);

      if (!error) {
        loadBlocks();
      }
    } catch (err) {
      console.error("Error deleting block:", err);
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i)
  );

  const getBlocksForDateAndCourt = (date: Date, court: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blocks.filter(b => b.date === dateStr && b.court === court);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <Link
            href="/dashboard/admin/bookings"
            className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
          >
            Prenotazioni
          </Link>
          <h1 className="text-3xl font-bold text-secondary">Blocco campi</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Blocca fasce orarie su campi specifici per impedire le prenotazioni.
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-2">
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mt-2">
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Create Block Form */}
      <div className="bg-white rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">Data</label>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-2.5 bg-white rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Campo */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">Campo</label>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="w-full px-4 py-2.5 bg-white rounded-lg text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="">Seleziona campo</option>
              {COURTS.map((court) => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
          </div>

          {/* Ora Inizio */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">Ora inizio</label>
            <select
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white rounded-lg text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="">Seleziona ora</option>
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Ora Fine */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">Ora fine</label>
            <select
              value={selectedEndTime}
              onChange={(e) => setSelectedEndTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white rounded-lg text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="">Seleziona ora</option>
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">Motivo (opzionale)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="es. Manutenzione"
              className="w-full px-4 py-2.5 bg-white rounded-lg text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>

        <button
          onClick={handleCreateBlock}
          disabled={submitting || !selectedCourt || !selectedStartTime || !selectedEndTime}
          className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creazione in corso...</span>
            </>
          ) : (
            <>
              <Shield className="h-5 w-5" />
              <span>Crea Blocco</span>
            </>
          )}
        </button>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">Vista settimanale blocchi</p>
              <h2 className="text-xl font-bold text-secondary">
                {format(weekDays[0], "d MMM", { locale: it })} - {format(weekDays[6], "d MMM yyyy", { locale: it })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="p-2 rounded-md bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-secondary bg-secondary/5 rounded-md hover:bg-secondary/10 transition-colors"
              >
                Oggi
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="p-2 rounded-md bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors"
              >
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
            <p className="text-secondary/70 font-medium">Caricamento blocchi...</p>
          </div>
        ) : (
          <div className="p-6 overflow-x-auto">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-2 mb-4 min-w-[900px]">
              <div className="text-xs font-semibold text-secondary/60">Campo</div>
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center">
                  <div className={`text-xs font-semibold uppercase ${isSameDay(day, new Date()) ? 'text-secondary' : 'text-secondary/60'}`}>
                    {format(day, "EEE", { locale: it })}
                  </div>
                  <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-secondary' : 'text-secondary'}`}>
                    {format(day, "d", { locale: it })}
                  </div>
                </div>
              ))}
            </div>

            {/* Courts Grid */}
            <div className="space-y-2 min-w-[900px]">
              {COURTS.map((court) => (
                <div key={court} className="grid grid-cols-8 gap-2 items-center">
                  <div className="text-sm font-bold text-secondary">{court}</div>
                  {weekDays.map((day, idx) => {
                    const courtBlocks = getBlocksForDateAndCourt(day, court);
                    return (
                      <div key={idx} className="min-h-[60px] bg-secondary/5 rounded-lg p-2">
                        {courtBlocks.length > 0 ? (
                          <div className="space-y-1">
                            {courtBlocks.map((block) => (
                              <div
                                key={block.id}
                                className="bg-red-100 rounded p-1 group relative"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 text-xs text-red-900 font-medium">
                                    <Clock className="h-3 w-3" />
                                    <span>{block.start_time.slice(0,5)}-{block.end_time.slice(0,5)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteBlock(block.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-200 rounded transition-all"
                                    title="Rimuovi blocco"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-700" />
                                  </button>
                                </div>
                                {block.reason && (
                                  <p className="text-xs text-red-700 truncate mt-0.5">{block.reason}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-secondary/20">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
