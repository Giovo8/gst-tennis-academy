"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Shield,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  GraduationCap,
  Wrench,
  Flag,
} from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";
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

export default function CourtsBlockPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCourt, setFilterCourt] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("court_blocks")
        .select("*")
        .order("start_time", { ascending: false });

      if (!error && data) {
        setBlocks(data);
      }
    } catch (err) {
      console.error("Error loading blocks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBlock(blockIds: string[]) {
    if (!confirm("Sei sicuro di voler eliminare questo blocco?")) return;

    try {
      const { error } = await supabase
        .from("court_blocks")
        .delete()
        .in("id", blockIds);

      if (!error) {
        setBlocks((prev) => prev.filter((block) => !blockIds.includes(block.id)));
      }
    } catch (err) {
      console.error("Error deleting block:", err);
    }
  }

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const openActionMenu = (blockId: string, buttonRect: DOMRect) => {
    const menuWidth = 176;
    const menuHeight = 140;
    const viewportPadding = 8;

    let left = buttonRect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    let top = buttonRect.bottom + 6;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, buttonRect.top - menuHeight - 6);
    }

    setOpenMenuId(blockId);
    setMenuPosition({ top, left });
  };

  // Raggruppa TUTTI i blocchi con stesso campo, motivo e orario
  function groupConsecutiveBlocks(blocks: Block[]) {
    if (blocks.length === 0) return [];

    const sorted = [...blocks].sort((a, b) => 
      a.court_id.localeCompare(b.court_id) || 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Crea una mappa per raggruppare per campo + motivo + orario
    const groupMap = new Map<string, {
      id: string;
      court_id: string;
      start_time: string;
      end_time: string;
      reason?: string;
      blockIds: string[];
      allDates: Array<{start: string, end: string}>;
    }>();

    for (const block of sorted) {
      const blockStart = new Date(block.start_time);
      const blockEnd = new Date(block.end_time);
      const startTime = blockStart.getHours() * 60 + blockStart.getMinutes();
      const endTime = blockEnd.getHours() * 60 + blockEnd.getMinutes();
      
      // Chiave: campo + motivo + orario
      const key = `${block.court_id}|${block.reason || ""}|${startTime}|${endTime}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: block.id,
          court_id: block.court_id,
          start_time: block.start_time,
          end_time: block.end_time,
          reason: block.reason,
          blockIds: [block.id],
          allDates: [{start: block.start_time, end: block.end_time}]
        });
      } else {
        const group = groupMap.get(key)!;
        group.blockIds.push(block.id);
        group.allDates.push({start: block.start_time, end: block.end_time});
        // Aggiorna la data finale del gruppo all'ultima data
        if (new Date(block.end_time) > new Date(group.end_time)) {
          group.end_time = block.end_time;
        }
      }
    }

    return Array.from(groupMap.values());
  }

  const groupedBlocks = groupConsecutiveBlocks(blocks);

  // Determina tipo, colore e icona in base al motivo
  function getBlockStyle(reason?: string) {
    const reasonText = (reason || "").trim();
    const reasonLower = reasonText.toLowerCase();

    if (reasonLower.includes("corso adulti")) {
      return {
        type: "Corso Adulti",
        borderColor: "border-frozen-lake-700",
        iconColor: "text-frozen-lake-700",
        bgHover: "hover:bg-frozen-lake-50",
        icon: GraduationCap
      };
    }
    
    if (reasonLower.includes("corsi") || reasonLower.includes("tennis")) {
      return {
        type: "Corsi Tennis",
        borderColor: "border-frozen-lake-700",
        iconColor: "text-frozen-lake-700",
        bgHover: "hover:bg-frozen-lake-50",
        icon: GraduationCap
      };
    } else if (reasonLower.includes("manutenzione")) {
      return {
        type: "Manutenzione",
        borderColor: "border-frozen-lake-800",
        iconColor: "text-frozen-lake-800",
        bgHover: "hover:bg-frozen-lake-50",
        icon: Wrench
      };
    } else if (reasonLower.includes("evento")) {
      return {
        type: "Evento",
        borderColor: "border-frozen-lake-900",
        iconColor: "text-frozen-lake-900",
        bgHover: "hover:bg-frozen-lake-50",
        icon: Flag
      };
    }

    if (reasonLower.startsWith("altro")) {
      return {
        type: "Altro",
        borderColor: "border-frozen-lake-700",
        iconColor: "text-frozen-lake-700",
        bgHover: "hover:bg-frozen-lake-50",
        icon: Shield
      };
    }
    
    // Default
    return {
      type: reasonText ? "Altro" : "Blocco",
      borderColor: "border-frozen-lake-700",
      iconColor: "text-frozen-lake-700",
      bgHover: "hover:bg-frozen-lake-50",
      icon: Shield
    };
  }

  const typeOptions = Array.from(
    new Set(groupedBlocks.map((block) => getBlockStyle(block.reason).type))
  ).sort((a, b) => a.localeCompare(b));

  const courtOptions = Array.from(new Set(groupedBlocks.map((block) => block.court_id))).sort((a, b) =>
    a.localeCompare(b)
  );

  const hasActiveFilters =
    filterType !== "all" ||
    filterCourt !== "all" ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  const nowMs = Date.now();

  const filteredBlocks = groupedBlocks.filter((block) => {
    // In questa pagina non mostriamo i blocchi scaduti.
    if (new Date(block.end_time).getTime() < nowMs) return false;

    const blockType = getBlockStyle(block.reason).type;
    const blockSearch = `${block.court_id} ${block.reason || ""} ${blockType}`.toLowerCase();
    const matchesSearch = search.trim().length === 0 || blockSearch.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType !== "all" && blockType !== filterType) return false;
    if (filterCourt !== "all" && block.court_id !== filterCourt) return false;

    const blockDate = block.start_time.split("T")[0];
    if (filterDateFrom && blockDate < filterDateFrom) return false;
    if (filterDateTo && blockDate > filterDateTo) return false;

    return true;
  });

  const sortedBlocks = [...filteredBlocks].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yy", { locale: it });
  };

  const formatBlockDateTime = (start: Date, end: Date) => {
    const startDate = format(start, "d/MM/yy", { locale: it });
    const endDate = format(end, "d/MM/yy", { locale: it });
    const startTime = format(start, "HH:mm");
    const endTime = format(end, "HH:mm");

    if (startDate === endDate) {
      return `${startDate} · ${startTime} - ${endTime}`;
    }

    return `${startDate} - ${endDate} · ${startTime} - ${endTime}`;
  };

  const getBlockTitle = (reason?: string) => {
    const text = (reason || "").trim();
    if (!text) return "Blocco campo";

    const altroWithParens = text.match(/^Altro\s*\(([^)]+)\)(?:\s*-\s*(.+))?$/i);
    if (altroWithParens) {
      const custom = (altroWithParens[1] || "").trim();
      const notes = (altroWithParens[2] || "").trim();
      if (custom && notes) return `${custom} - ${notes}`;
      return custom || notes || "Altro";
    }

    const altroSimple = text.match(/^Altro\s*-\s*(.+)$/i);
    if (altroSimple) {
      return (altroSimple[1] || "").trim() || "Altro";
    }

    return text;
  };

  const renderSearchWithFilter = () => (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per campo, motivo o tipo blocco..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>
      <button
        type="button"
        onClick={() => setIsFilterModalOpen(true)}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
          hasActiveFilters
            ? "border-secondary bg-secondary text-white hover:opacity-90"
            : "border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
        }`}
        aria-label="Apri filtri blocchi campi"
        title="Filtri"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link
              href="/dashboard/admin/bookings"
              className="hover:text-secondary/80 transition-colors"
            >
              Prenotazioni
            </Link>
            {" › "}
            <span>Blocco Campi</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">Blocco Campi</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/admin/courts/new"
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crea Blocco
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {renderSearchWithFilter()}
      </div>

      {/* Lista blocchi */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento blocchi...</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Shield className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun blocco attivo</h3>
          <p className="text-secondary/60 mb-6">
            Prova a modificare i filtri di ricerca
          </p>
          <Link
            href="/dashboard/admin/courts/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white font-medium rounded-md transition-opacity"
          >
            <Plus className="h-5 w-5" />
            <span>Crea Blocco</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedBlocks.map((block) => {
            const blockStyle = getBlockStyle(block.reason);
            const BlockIcon = blockStyle.icon;
            const firstDate = new Date(block.allDates[0].start);
            const lastDate = new Date(block.allDates[block.allDates.length - 1].end);
            const dateTimeLabel = formatBlockDateTime(firstDate, lastDate);

            const cardBg =
              blockStyle.type === "Corso Adulti"
                ? "#023047"
                : blockStyle.type === "Corsi Tennis"
                  ? "#05384c"
                  : blockStyle.type === "Manutenzione"
                    ? "var(--color-frozen-lake-900)"
                    : blockStyle.type === "Evento"
                      ? "var(--color-frozen-lake-900)"
                      : blockStyle.type === "Altro"
                        ? "var(--secondary)"
                        : "var(--color-frozen-lake-800)";

            return (
              <div
                key={block.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: cardBg }}
                onClick={() => router.push(`/dashboard/admin/courts/${block.id}`)}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <BlockIcon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{getBlockTitle(block.reason)}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {block.court_id} · {dateTimeLabel}
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {blockStyle.type}
                  </span>

                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === block.id) {
                          closeActionMenu();
                          return;
                        }
                        openActionMenu(block.id, e.currentTarget.getBoundingClientRect());
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === block.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                        <div
                          className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              router.push(`/dashboard/admin/courts/${block.id}`);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizza
                          </button>
                          <Link
                            href={`/dashboard/admin/courts/modifica?id=${block.id}`}
                            onClick={(e) => { e.stopPropagation(); closeActionMenu(); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifica
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              void handleDeleteBlock(block.blockIds);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors w-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Elimina
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Blocchi Campi</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Seleziona i criteri per visualizzare i blocchi.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            <div className="space-y-1">
              <label htmlFor="courts-type-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Tipo
              </label>
              <select
                id="courts-type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i tipi</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="courts-court-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Campo
              </label>
              <select
                id="courts-court-filter"
                value={filterCourt}
                onChange={(e) => setFilterCourt(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i campi</option>
                {courtOptions.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="courts-date-from-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  Data da
                </label>
                <input
                  id="courts-date-from-filter"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="courts-date-to-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  Data a
                </label>
                <input
                  id="courts-date-to-filter"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => {
                setFilterType("all");
                setFilterCourt("all");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
              className="w-1/2 py-3 border-r border-gray-200 text-secondary font-semibold hover:bg-gray-50 transition-colors"
            >
              Rimuovi filtri
            </button>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-1/2 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-br-lg"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
