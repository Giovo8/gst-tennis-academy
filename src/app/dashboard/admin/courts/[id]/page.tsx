"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  Save,
  GraduationCap,
  Wrench,
  Flag,
  Shield,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Block = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
};

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

export default function CourtBlockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const blockId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Dati blocco corrente
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [blockType, setBlockType] = useState("");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("22:00");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  // Determina tipo, colore e icona
  function getBlockStyle(reason?: string) {
    const reasonLower = (reason || "").toLowerCase();
    
    if (reasonLower.includes("corsi") || reasonLower.includes("tennis")) {
      return {
        type: "Corsi Tennis",
        borderColor: "border-frozen-lake-700",
        bgColor: "bg-frozen-lake-700",
        iconColor: "text-frozen-lake-700",
        icon: GraduationCap
      };
    } else if (reasonLower.includes("manutenzione")) {
      return {
        type: "Manutenzione",
        borderColor: "border-frozen-lake-800",
        bgColor: "bg-frozen-lake-800",
        iconColor: "text-frozen-lake-800",
        icon: Wrench
      };
    } else if (reasonLower.includes("evento")) {
      return {
        type: "Evento",
        borderColor: "border-frozen-lake-600",
        bgColor: "bg-frozen-lake-600",
        iconColor: "text-frozen-lake-600",
        icon: Flag
      };
    }
    
    return {
      type: "Blocco",
      borderColor: "border-frozen-lake-700",
      bgColor: "bg-frozen-lake-700",
      iconColor: "text-frozen-lake-700",
      icon: Shield
    };
  }

  useEffect(() => {
    loadBlockDetails();
  }, [blockId]);

  async function loadBlockDetails() {
    try {
      setLoading(true);

      // Carica il blocco principale
      const { data: mainBlock, error: mainError } = await supabase
        .from("court_blocks")
        .select("*")
        .eq("id", blockId)
        .single();

      if (mainError || !mainBlock) {
        console.error("Block not found");
        router.push("/dashboard/admin/courts");
        return;
      }

      const mainDate = new Date(mainBlock.start_time);
      const mainEndDate = new Date(mainBlock.end_time);
      const mainStartTime = mainDate.getHours() * 60 + mainDate.getMinutes();
      const mainEndTime = mainEndDate.getHours() * 60 + mainEndDate.getMinutes();

      // Trova tutti i blocchi con stesso campo, motivo e orario
      const { data: relatedBlocks, error: relatedError } = await supabase
        .from("court_blocks")
        .select("*")
        .eq("court_id", mainBlock.court_id)
        .eq("reason", mainBlock.reason || "")
        .order("start_time", { ascending: true });

      if (!relatedError && relatedBlocks) {
        // Filtra solo blocchi con stesso orario
        const filtered = relatedBlocks.filter(b => {
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          const bStartTime = bStart.getHours() * 60 + bStart.getMinutes();
          const bEndTime = bEnd.getHours() * 60 + bEnd.getMinutes();
          return bStartTime === mainStartTime && bEndTime === mainEndTime;
        });

        setAllBlocks(filtered);

        // Estrai giorni della settimana dai blocchi
        const weekDays = new Set<number>();
        filtered.forEach(block => {
          const date = new Date(block.start_time);
          weekDays.add(date.getDay());
        });
        setSelectedWeekDays(Array.from(weekDays));
      }

      // Imposta i campi del form
      setSelectedCourt(mainBlock.court_id);
      
      // Estrai tipo e note dal reason
      const reason = mainBlock.reason || "";
      let extractedType = "";
      let extractedNotes = "";
      
      if (reason.includes(" - ")) {
        const parts = reason.split(" - ");
        const typeLabel = parts[0];
        extractedNotes = parts.slice(1).join(" - ");
        
        // Trova il valore del tipo
        const foundType = BLOCK_TYPES.find(t => t.label === typeLabel);
        if (foundType) {
          extractedType = foundType.value;
        }
      } else {
        // Cerca se il reason contiene uno dei tipi
        const foundType = BLOCK_TYPES.find(t => reason.toLowerCase().includes(t.label.toLowerCase()));
        if (foundType) {
          extractedType = foundType.value;
        }
      }
      
      setBlockType(extractedType);
      setNotes(extractedNotes);
      
      // Imposta orari
      const startHour = mainDate.getHours();
      const startMin = mainDate.getMinutes();
      const endHour = mainEndDate.getHours();
      const endMin = mainEndDate.getMinutes();
      
      setStartTime(`${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`);
      setEndTime(`${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`);

    } catch (err) {
      console.error("Error loading block:", err);
      router.push("/dashboard/admin/courts");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!selectedCourt || !blockType || selectedWeekDays.length === 0) {
      alert("Compila tutti i campi obbligatori");
      return;
    }

    try {
      setSubmitting(true);

      // Elimina tutti i blocchi del gruppo corrente
      await supabase
        .from("court_blocks")
        .delete()
        .in("id", allBlocks.map(b => b.id));

      // Trova il range di date dai blocchi esistenti
      const dates = allBlocks.map(b => new Date(b.start_time));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Crea nuovi blocchi con i nuovi parametri
      const typeLabel = BLOCK_TYPES.find(t => t.value === blockType)?.label || blockType;
      const reasonText = notes ? `${typeLabel} - ${notes}` : typeLabel;

      const newBlocks: Array<{
        court_id: string;
        start_time: string;
        end_time: string;
        reason: string;
      }> = [];

      const currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        const dayOfWeek = currentDate.getDay();

        if (selectedWeekDays.includes(dayOfWeek)) {
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          const dayStart = new Date(currentDate);
          dayStart.setHours(startHour, startMinute, 0, 0);
          
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(endHour, endMinute, 0, 0);

          newBlocks.push({
            court_id: selectedCourt,
            start_time: dayStart.toISOString(),
            end_time: dayEnd.toISOString(),
            reason: reasonText,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const { error } = await supabase.from("court_blocks").insert(newBlocks);

      if (error) throw error;

      router.push("/dashboard/admin/courts");
    } catch (err) {
      console.error("Error updating blocks:", err);
      alert("Errore durante l'aggiornamento del blocco");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Sei sicuro di voler eliminare tutti i ${allBlocks.length} giorni di questo blocco?`)) {
      return;
    }

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("court_blocks")
        .delete()
        .in("id", allBlocks.map(b => b.id));

      if (error) throw error;

      router.push("/dashboard/admin/courts");
    } catch (err) {
      console.error("Error deleting blocks:", err);
      alert("Errore durante l'eliminazione del blocco");
    } finally {
      setDeleting(false);
    }
  }

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento dettagli...</p>
      </div>
    );
  }

  const blockStyle = getBlockStyle(allBlocks[0]?.reason);
  const BlockIcon = blockStyle.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider">
        <Link href="/dashboard/admin/bookings" className="hover:text-secondary/80 transition-colors">
          Prenotazioni
        </Link>
        <span className="mx-2">›</span>
        <button
          onClick={() => router.push("/dashboard/admin/courts")}
          className="hover:text-secondary/80 transition-colors uppercase"
        >
          Blocco Campi
        </button>
        <span className="mx-2">›</span>
        <span>Dettagli Blocco</span>
      </div>

      {/* Header con info blocco */}
      <div className={`bg-white rounded-xl border-l-4 ${blockStyle.borderColor} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${blockStyle.bgColor} text-white`}>
            <BlockIcon className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-secondary">{selectedCourt}</h1>
            <p className="text-sm text-secondary/70 mt-1">
              {allBlocks.length} {allBlocks.length === 1 ? "giorno bloccato" : "giorni bloccati"}
            </p>
          </div>
        </div>
      </div>

      {/* Date bloccate */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Date bloccate
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allBlocks.map((block) => {
            const dateStart = new Date(block.start_time);
            const dateEnd = new Date(block.end_time);
            
            return (
              <div key={block.id} className="bg-gray-50 rounded-lg px-4 py-3">
                <div className="font-semibold text-secondary text-sm">
                  {format(dateStart, "EEEE d MMM", { locale: it })}
                </div>
                <div className="text-secondary/60 text-xs mt-1">
                  {format(dateStart, "HH:mm")} - {format(dateEnd, "HH:mm")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form modifica */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Modifica blocco</h2>
        
        <div className="space-y-6">
          {/* Campo */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                {COURTS.map((court) => (
                  <button
                    key={court}
                    type="button"
                    onClick={() => setSelectedCourt(court)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
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

          {/* Tipo blocco */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo blocco *</label>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setBlockType(type.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
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

          {/* Giorni settimana */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Giorni settimana *</label>
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
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Orario inizio *</label>
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
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Orario fine *</label>
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

          {/* Note */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Note</label>
            <div className="flex-1">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi dettagli aggiuntivi..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Azioni */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleDelete}
          disabled={deleting || submitting}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {deleting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Eliminazione...
            </>
          ) : (
            <>
              <Trash2 className="h-5 w-5" />
              Elimina Blocco
            </>
          )}
        </button>

        <button
          onClick={handleUpdate}
          disabled={!selectedCourt || !blockType || selectedWeekDays.length === 0 || submitting || deleting}
          className="px-6 py-2.5 bg-secondary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Salva Modifiche
            </>
          )}
        </button>
      </div>
    </div>
  );
}
