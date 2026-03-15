"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trash2,
  Loader2,
  Save,
  X,
  GraduationCap,
  Wrench,
  Flag,
  Shield,
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

type BlockException = {
  id: string;
  date: string;
};

const BLOCK_TYPES = [
  { value: "corsi_tennis", label: "Corsi Tennis" },
  { value: "corso_adulti", label: "Corso Adulti" },
  { value: "manutenzione", label: "Manutenzione" },
  { value: "evento", label: "Evento" },
  { value: "altro", label: "Altro" },
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

export default function CourtBlockEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Dati blocco corrente
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [blockType, setBlockType] = useState("");
  const [customBlockType, setCustomBlockType] = useState("");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("22:00");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [blockExceptions, setBlockExceptions] = useState<BlockException[]>([]);

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDisableDateTab = (block: Block) => {
    if (allBlocks.length <= 1) {
      alert("Non puoi rimuovere l'ultimo giorno. Usa 'Elimina Blocco' se vuoi cancellarlo tutto.");
      return;
    }

    const dateLabel = format(new Date(block.start_time), "dd/MM/yyyy", { locale: it });
    const shouldDisable = confirm(`Vuoi rimuovere il tab del ${dateLabel}?`);
    if (!shouldDisable) return;

    const dateKey = toDateKey(new Date(block.start_time));

    setBlockExceptions((prev) => {
      const alreadyExists = prev.some((item) => item.date === dateKey);
      if (alreadyExists) return prev;

      return [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: dateKey,
      }];
    });

    setAllBlocks((prev) => prev.filter((item) => item.id !== block.id));
  };

  // Determina tipo e icona
  function getBlockStyle(reason?: string) {
    const reasonLower = (reason || "").toLowerCase();

    if (reasonLower.includes("corso adulti")) {
      return {
        type: "Corso Adulti",
        icon: GraduationCap
      };
    }
    
    if (reasonLower.includes("corsi") || reasonLower.includes("tennis")) {
      return {
        type: "Corsi Tennis",
        icon: GraduationCap
      };
    } else if (reasonLower.includes("manutenzione")) {
      return {
        type: "Manutenzione",
        icon: Wrench
      };
    } else if (reasonLower.includes("evento")) {
      return {
        type: "Evento",
        icon: Flag
      };
    }
    
    return {
      type: "Blocco",
      icon: Shield
    };
  }

  useEffect(() => {
    void loadCourts();
  }, []);

  useEffect(() => {
    if (!blockId) {
      setLoading(false);
      return;
    }

    void loadBlockDetails();
  }, [blockId]);

  async function loadCourts() {
    const courtsData = await getCourts();
    if (courtsData.length > 0) {
      setCourts(courtsData);
    }
  }

  async function loadBlockDetails() {
    if (!blockId) return;

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

      let filteredBlocks: Block[] = [];

      if (!relatedError && relatedBlocks) {
        // Filtra solo blocchi con stesso orario
        filteredBlocks = relatedBlocks.filter(b => {
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          const bStartTime = bStart.getHours() * 60 + bStart.getMinutes();
          const bEndTime = bEnd.getHours() * 60 + bEnd.getMinutes();
          return bStartTime === mainStartTime && bEndTime === mainEndTime;
        });

        setAllBlocks(filteredBlocks);
        setBlockExceptions([]);

        // Estrai giorni della settimana dai blocchi
        const weekDays = new Set<number>();
        filteredBlocks.forEach(block => {
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
      let extractedCustomType = "";
      
      if (reason.includes(" - ")) {
        const parts = reason.split(" - ");
        const typeLabel = parts[0].trim();
        extractedNotes = parts.slice(1).join(" - ");

        const customTypeMatch = typeLabel.match(/^Altro\s*\((.+)\)$/i);
        if (customTypeMatch?.[1]) {
          extractedType = "altro";
          extractedCustomType = customTypeMatch[1].trim();
        } else {
          // Trova il valore del tipo
          const foundType = BLOCK_TYPES.find(t => t.label.toLowerCase() === typeLabel.toLowerCase());
          if (foundType) {
            extractedType = foundType.value;
          }
        }
      } else {
        const customTypeMatch = reason.match(/^Altro\s*\((.+)\)$/i);
        if (customTypeMatch?.[1]) {
          extractedType = "altro";
          extractedCustomType = customTypeMatch[1].trim();
        }

        // Cerca se il reason contiene uno dei tipi
        const foundType = BLOCK_TYPES.find(
          t => t.value !== "altro" && reason.toLowerCase().includes(t.label.toLowerCase())
        );
        if (foundType && extractedType === "") {
          extractedType = foundType.value;
        }
      }
      
      setBlockType(extractedType);
      setCustomBlockType(extractedCustomType);
      setNotes(extractedNotes.trim());
      
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

    if (blockType === "altro" && !customBlockType.trim()) {
      alert("Specifica in cosa consiste il blocco 'Altro'");
      return;
    }

    const baseStartMinutes = toMinutes(startTime);
    const baseEndMinutes = toMinutes(endTime);
    if (baseEndMinutes <= baseStartMinutes) {
      alert("L'orario fine deve essere successivo all'orario inizio");
      return;
    }

    if (allBlocks.length === 0) {
      alert("Nessun blocco disponibile da aggiornare");
      return;
    }

    try {
      setSubmitting(true);

      // Trova il range di date dai blocchi esistenti
      const dates = allBlocks.map(b => new Date(b.start_time));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Crea nuovi blocchi con i nuovi parametri
      let typeLabel = BLOCK_TYPES.find(t => t.value === blockType)?.label || blockType;
      if (blockType === "altro" && customBlockType.trim()) {
        typeLabel = `Altro (${customBlockType.trim()})`;
      }
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
          const currentDateKey = toDateKey(currentDate);
          const isDisabledDate = blockExceptions.some((item) => item.date === currentDateKey);

          if (!isDisabledDate) {
            const [startHour, startMinute] = startTime.split(":").map(Number);
            const [endHour, endMinute] = endTime.split(":").map(Number);

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
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (newBlocks.length === 0) {
        alert("Nessun blocco da creare: verifica giorni selezionati o disattivazioni");
        setSubmitting(false);
        return;
      }

      // Elimina tutti i blocchi del gruppo corrente
      await supabase
        .from("court_blocks")
        .delete()
        .in("id", allBlocks.map(b => b.id));

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

  if (!blockId) {
    return (
      <div className="space-y-4">
        <p className="text-secondary/70">ID blocco mancante.</p>
        <Link href="/dashboard/admin/courts" className="text-secondary font-medium hover:underline">
          Torna a Blocco Campi
        </Link>
      </div>
    );
  }

  const blockStyle = getBlockStyle(allBlocks[0]?.reason);
  const BlockIcon = blockStyle.icon;

  return (
    <div className="space-y-6">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/courts" className="hover:text-secondary/80 transition-colors">
            Blocco Campi
          </Link>
          {" › "}
          <Link href={`/dashboard/admin/courts/${blockId}`} className="hover:text-secondary/80 transition-colors">
            Dettagli Blocco
          </Link>
          {" › "}
          <span>Modifica Blocco</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Modifica blocco campo</h1>
        <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
          Aggiorna campo, giorni e orari mantenendo il periodo originale del blocco.
        </p>
      </div>

      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: "var(--secondary)" }}
      >
        <div className="flex items-start gap-6">
          <BlockIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{selectedCourt}</h2>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">
          Date bloccate
        </h2>

        <div className="space-y-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="bg-secondary rounded-lg px-4 py-3 border border-secondary min-w-[560px]">
            <div className="grid grid-cols-[40px_2fr_1fr_64px] items-center gap-4">
              <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
              <div className="text-xs font-bold text-white/80 uppercase">Data</div>
              <div className="text-xs font-bold text-white/80 uppercase">Orario</div>
              <div className="text-xs font-bold text-white/80 uppercase text-center">&nbsp;</div>
            </div>
          </div>

          {allBlocks.map((block, index) => {
            const dateStart = new Date(block.start_time);
            const dateEnd = new Date(block.end_time);

            return (
              <div
                key={block.id}
                className="bg-white rounded-lg px-4 py-3 border border-gray-200 border-l-4 min-w-[560px]"
                style={{ borderLeftColor: "var(--secondary)" }}
              >
                <div className="grid grid-cols-[40px_2fr_1fr_64px] items-center gap-4">
                  <div className="text-sm text-secondary/60 text-center">{index + 1}</div>
                  <div className="text-secondary font-semibold text-sm">
                    {format(dateStart, "EEEE d MMMM yyyy", { locale: it }).replace(/^./, (letter) => letter.toUpperCase())}
                  </div>
                  <div className="text-secondary/70 text-sm">
                    {format(dateStart, "HH:mm")} - {format(dateEnd, "HH:mm")}
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleDisableDateTab(block)}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                      aria-label={`Rimuovi ${format(dateStart, "dd/MM/yyyy", { locale: it })}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Modifica blocco</h2>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  {courts.map((court) => (
                    <button
                      key={court}
                      type="button"
                      onClick={() => setSelectedCourt(court)}
                      className={`px-5 py-2 text-sm text-left font-medium rounded-lg border transition-all ${
                        selectedCourt === court
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {court}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo blocco</label>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  {BLOCK_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setBlockType(type.value)}
                      className={`px-5 py-2 text-sm text-left font-medium rounded-lg border transition-all ${
                        blockType === type.value
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {blockType === "altro" && (
                  <div className="mt-4">
                    <label className="block text-xs text-secondary/60 mb-2">Specifica in cosa consiste</label>
                    <input
                      type="text"
                      value={customBlockType}
                      onChange={(e) => setCustomBlockType(e.target.value)}
                      placeholder="Es. intervento tecnico esterno"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni settimana</label>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekDay(day.value)}
                      className={`px-4 py-2 text-sm text-left font-medium rounded-lg border transition-all ${
                        selectedWeekDays.includes(day.value)
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-secondary/60 mt-2">
                  {selectedWeekDays.length === 7
                    ? "Tutti i giorni"
                    : selectedWeekDays.length === 0
                      ? "Nessun giorno selezionato"
                      : `${selectedWeekDays.length} giorno/i selezionato/i`}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-secondary/60 mb-2">Orario inizio</label>
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
                  <div>
                    <label className="block text-xs text-secondary/60 mb-2">Orario fine</label>
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
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Note</label>
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
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUpdate}
          disabled={
            !selectedCourt ||
            !blockType ||
            selectedWeekDays.length === 0 ||
            (blockType === "altro" && !customBlockType.trim()) ||
            submitting ||
            deleting
          }
          className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

        <button
          onClick={handleDelete}
          disabled={deleting || submitting}
          className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}
