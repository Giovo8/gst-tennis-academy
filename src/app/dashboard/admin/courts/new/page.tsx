"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4", "Campo 5", "Campo 6", "Campo 7", "Campo 8"];
const BLOCK_TYPES = [
  { value: "corsi_tennis", label: "Corsi Tennis" },
  { value: "manutenzione", label: "Manutenzione" },
  { value: "evento", label: "Evento" },
];
const WEEK_DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" },
];

// Genera slot ogni 30 minuti dalle 07:00 alle 22:00
const TIME_SLOTS: string[] = [];
for (let hour = 7; hour <= 22; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:00`);
  if (hour < 22) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:30`);
  }
}

export default function NewCourtBlockPage() {
  const router = useRouter();
  const [selectedCourt, setSelectedCourt] = useState("");
  const [blockType, setBlockType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("22:00");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // tutti i giorni
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  async function handleCreateBlock() {
    if (!selectedCourt) {
      setError("Seleziona un campo");
      return;
    }

    if (!blockType) {
      setError("Seleziona un tipo di blocco");
      return;
    }

    if (!startDate || !endDate) {
      setError("Seleziona data inizio e data fine");
      return;
    }

    if (selectedWeekDays.length === 0) {
      setError("Seleziona almeno un giorno della settimana");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError("La data fine deve essere successiva alla data inizio");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      // Crea un blocco per ogni giorno nel range che corrisponde ai giorni selezionati
      const blocksToInsert = [];
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
        
        // Controlla se questo giorno della settimana è selezionato
        if (selectedWeekDays.includes(dayOfWeek)) {
          // Crea timestamp con orari specifici
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          const dayStart = new Date(currentDate);
          dayStart.setHours(startHour, startMinute, 0, 0);
          
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(endHour, endMinute, 0, 0);
          
          // Trova il label del tipo
          const typeLabel = BLOCK_TYPES.find(t => t.value === blockType)?.label || blockType;
          const reasonText = notes ? `${typeLabel} - ${notes}` : typeLabel;
          
          blocksToInsert.push({
            court_id: selectedCourt,
            start_time: dayStart.toISOString(),
            end_time: dayEnd.toISOString(),
            reason: reasonText,
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const { error: insertError } = await supabase
        .from("court_blocks")
        .insert(blocksToInsert);

      if (insertError) throw insertError;

      const daysCount = blocksToInsert.length;
      setSuccess(`${daysCount} blocco${daysCount > 1 ? 'i creati' : ' creato'} con successo!`);
      
      setTimeout(() => {
        router.push("/dashboard/admin/courts");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore nella creazione del blocco");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/courts"
              className="hover:text-secondary/80 transition-colors"
            >
              Blocco Campi
            </Link>
            <span className="mx-2">›</span>
            <span>Crea Blocco</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">Crea blocco campo</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Blocca uno o più campi per un periodo di tempo.
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
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <div className="space-y-6">
            {/* Campo */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {COURTS.map((court) => (
                    <button
                      key={court}
                      type="button"
                      onClick={() => setSelectedCourt(court)}
                      className={`px-5 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                        selectedCourt === court
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary/50'
                      }`}
                    >
                      {court}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tipo Blocco */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo blocco</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {BLOCK_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setBlockType(type.value)}
                      className={`px-5 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                        blockType === type.value
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary/50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Data Inizio */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
              <div className="flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            {/* Data Fine */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data fine</label>
              <div className="flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            {/* Giorni settimana */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Giorni settimana</label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekDay(day.value)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                        selectedWeekDays.includes(day.value)
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary/50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-secondary/60 mt-2">
                  {selectedWeekDays.length === 7 ? "Tutti i giorni" : selectedWeekDays.length === 0 ? "Nessun giorno selezionato" : `${selectedWeekDays.length} giorno/i selezionato/i`}
                </p>
              </div>
            </div>

            {/* Orario Inizio */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Orario inizio</label>
              <div className="flex-1">
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Orario Fine */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Orario fine</label>
              <div className="flex-1">
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note aggiuntive */}
            <div className="flex items-start gap-8">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Note aggiuntive</label>
              <div className="flex-1">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="es. Campionato regionale (opzionale)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateBlock}
          disabled={submitting || !selectedCourt || !blockType || !startDate || !endDate || selectedWeekDays.length === 0}
          className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creazione...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Crea Blocco</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
