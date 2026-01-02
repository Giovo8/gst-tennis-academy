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
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div>
        <Link
          href="/dashboard/admin/bookings"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors mb-4 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna a Gestione Prenotazioni
        </Link>
        <h1 className="text-3xl font-extrabold text-black mb-2">
          Blocco Campi
        </h1>
        <p className="text-gray-800 font-medium">
          Blocca fasce orarie su campi specifici per impedire le prenotazioni
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Create Block Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Plus className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Crea Nuovo Blocco</h2>
            <p className="text-sm text-gray-600">Blocca una fascia oraria su un campo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Data</label>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Campo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Campo</label>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleziona campo</option>
              {COURTS.map((court) => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
          </div>

          {/* Ora Inizio */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Ora Inizio</label>
            <select
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleziona ora</option>
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Ora Fine */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Ora Fine</label>
            <select
              value={selectedEndTime}
              onChange={(e) => setSelectedEndTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleziona ora</option>
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Motivo (opzionale)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="es. Manutenzione"
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleCreateBlock}
          disabled={submitting || !selectedCourt || !selectedStartTime || !selectedEndTime}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold mb-1">Vista Settimanale Blocchi</p>
              <h2 className="text-xl font-bold text-gray-900">
                {format(weekDays[0], "d MMM", { locale: it })} - {format(weekDays[6], "d MMM yyyy", { locale: it })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Oggi
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 font-medium">Caricamento blocchi...</p>
          </div>
        ) : (
          <div className="p-6 overflow-x-auto">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-2 mb-4 min-w-[900px]">
              <div className="text-xs font-semibold text-gray-600">Campo</div>
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center">
                  <div className={`text-xs font-semibold uppercase ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-600'}`}>
                    {format(day, "EEE", { locale: it })}
                  </div>
                  <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, "d", { locale: it })}
                  </div>
                </div>
              ))}
            </div>

            {/* Courts Grid */}
            <div className="space-y-2 min-w-[900px]">
              {COURTS.map((court) => (
                <div key={court} className="grid grid-cols-8 gap-2 items-center">
                  <div className="text-sm font-bold text-gray-900">{court}</div>
                  {weekDays.map((day, idx) => {
                    const courtBlocks = getBlocksForDateAndCourt(day, court);
                    return (
                      <div key={idx} className="min-h-[60px] bg-gray-50 rounded-lg p-2 border border-gray-200">
                        {courtBlocks.length > 0 ? (
                          <div className="space-y-1">
                            {courtBlocks.map((block) => (
                              <div
                                key={block.id}
                                className="bg-red-100 border border-red-300 rounded p-1 group relative"
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
                          <div className="flex items-center justify-center h-full text-gray-400">
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
