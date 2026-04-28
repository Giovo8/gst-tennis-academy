"use client";

import { useEffect, useState, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const CALENDAR_WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

  const parseDateInput = (value: string): Date | null => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const toInputDateValue = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDateButtonLabel = (value: string): string => {
    const date = parseDateInput(value);
    if (!date) return "gg/mm/aaaa";
    return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return { date, isCurrentMonth: date.getMonth() === calendarViewDate.getMonth() };
    });
  }, [calendarViewDate]);

  const getCalendarMonthLabel = (date: Date) => {
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const openDatePickerModal = (field: "start" | "end") => {
    setActiveDateField(field);
    const currentValue = field === "start" ? startDate : endDate;
    const parsed = parseDateInput(currentValue) || new Date();
    setPendingDate(parsed);
    setCalendarViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setDatePickerModalOpen(true);
  };

  const handleDatePickerToday = () => {
    const today = new Date();
    setPendingDate(today);
    setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const applyDateSelection = () => {
    const selected = toInputDateValue(pendingDate);
    if (activeDateField === "start") {
      setStartDate(selected);
      if (endDate && endDate < selected) setEndDate(selected);
    } else {
      if (startDate && selected < startDate) setEndDate(startDate);
      else setEndDate(selected);
    }
    setDatePickerModalOpen(false);
  };

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
      return { type: "Corso Adulti", icon: GraduationCap };
    }
    if (reasonLower.includes("corsi") || reasonLower.includes("tennis")) {
      return { type: "Corsi Tennis", icon: GraduationCap };
    } else if (reasonLower.includes("manutenzione")) {
      return { type: "Manutenzione", icon: Wrench };
    } else if (reasonLower.includes("evento")) {
      return { type: "Evento", icon: Flag };
    }
    return { type: "Altro", icon: Shield };
  }

  function getBlockCardBg(type: string) {
    if (type === "Corso Adulti") return "#023047";
    if (type === "Corsi Tennis") return "#05384c";
    if (type === "Manutenzione") return "var(--color-frozen-lake-900)";
    if (type === "Evento") return "var(--color-frozen-lake-900)";
    if (type === "Altro") return "var(--secondary)";
    return "var(--color-frozen-lake-800)";
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
        .eq("is_disabled", false)
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

        // Imposta startDate/endDate dal range reale
        if (filteredBlocks.length > 0) {
          const first = filteredBlocks[0];
          const last = filteredBlocks[filteredBlocks.length - 1];
          const toVal = (s: string) => {
            const d = new Date(s);
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, "0");
            const da = String(d.getDate()).padStart(2, "0");
            return `${y}-${mo}-${da}`;
          };
          setStartDate(toVal(first.start_time));
          setEndDate(toVal(last.start_time));
        }

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

      // Trova il range di date da startDate/endDate
      const startParsed = parseDateInput(startDate);
      const endParsed = parseDateInput(endDate);
      if (!startParsed || !endParsed) {
        alert("Seleziona data inizio e data fine");
        setSubmitting(false);
        return;
      }
      const minDate = startParsed;
      const maxDate = endParsed;

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

      // Disattiva i blocchi correnti (soft-delete)
      await supabase
        .from("court_blocks")
        .update({ is_disabled: true })
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
    if (!confirm(`Sei sicuro di voler disattivare tutti i ${allBlocks.length} giorni di questo blocco?`)) {
      return;
    }

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("court_blocks")
        .update({ is_disabled: true })
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
  const headerCardBg = getBlockCardBg(blockStyle.type);

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
        <h1 className="text-4xl font-bold text-secondary">Modifica Blocco</h1>
      </div>

      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: headerCardBg,
          borderColor: headerCardBg,
          borderLeftColor: headerCardBg,
        }}
      >
        <div className="flex items-start gap-6">
          <BlockIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{selectedCourt}</h2>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Date bloccate</h2>
        </div>
        <div className="p-6">
        <ul className="flex flex-col gap-2">
          {allBlocks.map((block, index) => {
            const dateStart = new Date(block.start_time);
            const dateEnd = new Date(block.end_time);

            return (
              <li key={block.id}>
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg"
                  style={{ background: "var(--secondary)" }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold leading-none text-white">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-white">
                      {format(dateStart, "EEEE d MMMM yyyy", { locale: it }).replace(/^./, (letter) => letter.toUpperCase())}
                    </p>
                    <p className="text-xs truncate mt-0.5 text-white/70">
                      {format(dateStart, "HH:mm")} - {format(dateEnd, "HH:mm")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDisableDateTab(block)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded transition-all focus:outline-none hover:bg-white/10 text-white/70 hover:text-white"
                      aria-label={`Rimuovi ${format(dateStart, "dd/MM/yyyy", { locale: it })}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli blocco</h2>
        </div>
        <div className="p-6">
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

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
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
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Periodo</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => openDatePickerModal("start")}
                  className="w-full text-left rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  {formatDateButtonLabel(startDate)}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data fine</label>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => openDatePickerModal("end")}
                  className="w-full text-left rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  {formatDateButtonLabel(endDate)}
                </button>
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
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Ora inizio</label>
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

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Ora fine</label>
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
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
        </div>
        <div className="p-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi dettagli aggiuntivi..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Salvataggio...
            </>
          ) : (
              <span>Salva</span>
          )}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting || submitting}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Eliminazione...
            </>
          ) : (
              <span>Elimina</span>
          )}
        </button>
      </div>

      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent
          size="sm"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">
              {activeDateField === "start" ? "Seleziona Data Inizio" : "Seleziona Data Fine"}
            </ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Scegli il giorno da impostare.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {getCalendarMonthLabel(calendarViewDate)}
                </p>
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {CALENDAR_WEEK_DAYS.map((day) => (
                  <span key={day} className="py-1">{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, pendingDate);
                  const isTodayDate = isSameCalendarDay(date, new Date());
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => setPendingDate(date)}
                      className={`h-9 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-secondary text-white font-semibold"
                          : isCurrentMonth
                            ? "text-gray-800 hover:bg-gray-100"
                            : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={handleDatePickerToday}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={applyDateSelection}
              className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
