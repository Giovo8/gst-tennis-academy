"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];

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

const CALENDAR_WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

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
  const [customBlockType, setCustomBlockType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("22:00");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

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
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
      return {
        date,
        isCurrentMonth: date.getMonth() === calendarViewDate.getMonth(),
      };
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
    const parsed = parseDateInput(currentValue) || parseDateInput(startDate) || new Date();
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
      if (endDate && endDate < selected) {
        setEndDate(selected);
      }
    } else {
      if (startDate && selected < startDate) {
        setEndDate(startDate);
      } else {
        setEndDate(selected);
      }
    }

    setDatePickerModalOpen(false);
  };

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getBlockReason = () => {
    const selectedType = BLOCK_TYPES.find((t) => t.value === blockType);
    let typeLabel = selectedType?.label || blockType;

    if (blockType === "altro" && customBlockType.trim()) {
      typeLabel = `Altro (${customBlockType.trim()})`;
    }

    return notes ? `${typeLabel} - ${notes}` : typeLabel;
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

    if (blockType === "altro" && !customBlockType.trim()) {
      setError("Specifica in cosa consiste il blocco 'Altro'");
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

    const baseStartMinutes = toMinutes(startTime);
    const baseEndMinutes = toMinutes(endTime);
    if (baseEndMinutes <= baseStartMinutes) {
      setError("L'orario fine deve essere successivo all'orario inizio");
      return;
    }

    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);

    if (!start || !end) {
      setError("Formato data non valido");
      return;
    }

    if (end < start) {
      setError("La data fine deve essere successiva alla data inizio");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const reasonText = getBlockReason();
      const blocksToInsert: Array<{
        court_id: string;
        start_time: string;
        end_time: string;
        reason: string;
      }> = [];

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();

        if (selectedWeekDays.includes(dayOfWeek)) {
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const [endHour, endMinute] = endTime.split(":").map(Number);

          const dayStart = new Date(currentDate);
          dayStart.setHours(startHour, startMinute, 0, 0);

          const dayEnd = new Date(currentDate);
          dayEnd.setHours(endHour, endMinute, 0, 0);

          blocksToInsert.push({
            court_id: selectedCourt,
            start_time: dayStart.toISOString(),
            end_time: dayEnd.toISOString(),
            reason: reasonText,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (blocksToInsert.length === 0) {
        setError("Nessun blocco da creare: verifica periodo e giorni selezionati");
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from("court_blocks").insert(blocksToInsert);

      if (insertError) throw insertError;

      const daysCount = blocksToInsert.length;
      setSuccess(`${daysCount} blocco${daysCount > 1 ? "i creati" : " creato"} con successo!`);

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
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/courts"
            className="hover:text-secondary/80 transition-colors"
          >
            Blocco Campi
          </Link>
          {" › "}
          <span>Crea Blocco</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Crea Blocco</h1>
      </div>

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
                  {COURTS.map((court) => (
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
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Tipo blocco
              </label>
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
                    <label className="block text-xs text-secondary/60 mb-2">
                      Specifica in cosa consiste
                    </label>
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
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Giorni settimana
              </label>
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
                    <option key={time} value={time}>
                      {time}
                    </option>
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
                    <option key={time} value={time}>
                      {time}
                    </option>
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

      <button
        onClick={handleCreateBlock}
        disabled={
          submitting ||
          !selectedCourt ||
          !blockType ||
          !startDate ||
          !endDate ||
          selectedWeekDays.length === 0 ||
          (blockType === "altro" && !customBlockType.trim())
        }
        className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Creazione...</span>
          </>
        ) : (
          <span>Crea Blocco</span>
        )}
      </button>

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
                  aria-label="Mese precedente"
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
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {CALENDAR_WEEK_DAYS.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
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
