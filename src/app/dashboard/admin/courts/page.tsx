"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Shield,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  GraduationCap,
  Wrench,
  Flag,
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

export default function CourtsBlockPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "court" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("court_blocks")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(100);

      if (!error && data) {
        setBlocks(data);
      }
    } catch (err) {
      console.error("Error loading blocks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBlock(blockId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Sei sicuro di voler rimuovere questo blocco?")) return;

    try {
      setDeleting(blockId);
      const { error } = await supabase
        .from("court_blocks")
        .delete()
        .eq("id", blockId);

      if (!error) {
        setBlocks(blocks.filter(b => b.id !== blockId));
      }
    } catch (err) {
      console.error("Error deleting block:", err);
    } finally {
      setDeleting(null);
    }
  }

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
    const reasonLower = (reason || "").toLowerCase();
    
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
        borderColor: "border-frozen-lake-600",
        iconColor: "text-frozen-lake-600",
        bgHover: "hover:bg-frozen-lake-50",
        icon: Flag
      };
    }
    
    // Default
    return {
      type: "Blocco",
      borderColor: "border-frozen-lake-700",
      iconColor: "text-frozen-lake-700",
      bgHover: "hover:bg-frozen-lake-50",
      icon: Shield
    };
  }

  const sortedBlocks = [...groupedBlocks].sort((a, b) => {
    if (!sortBy) return 0;

    let comparison = 0;
    switch (sortBy) {
      case "date":
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        break;
      case "court":
        comparison = a.court_id.localeCompare(b.court_id);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: "date" | "court") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yy", { locale: it });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/bookings"
              className="hover:text-secondary/80 transition-colors"
            >
              Prenotazioni
            </Link>
            <span className="mx-2">›</span>
            <span>Blocco Campi</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">Blocco campi</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Gestisci i blocchi sui campi per impedire le prenotazioni.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/courts/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white text-sm font-medium rounded-md transition-opacity"
          >
            <Plus className="h-5 w-5" />
            <span>Crea Blocco</span>
          </Link>
          <button
            onClick={() => loadBlocks()}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Ricarica"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Lista blocchi */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento blocchi...</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Shield className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun blocco attivo</h3>
          <p className="text-secondary/60 mb-6">
            Crea il primo blocco per impedire prenotazioni su campi specifici
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
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-white rounded-lg px-5 py-3 mb-3">
            <div className="flex items-center gap-4">
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                <Shield className="h-4 w-4 text-secondary/60" />
              </div>
              <div className="w-32 flex-shrink-0">
                <button
                  onClick={() => handleSort("court")}
                  className="text-xs font-bold text-secondary/60 uppercase hover:text-secondary transition-colors flex items-center gap-1"
                >
                  Campo
                  {sortBy === "court" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-28 flex-shrink-0">
                <button
                  onClick={() => handleSort("date")}
                  className="text-xs font-bold text-secondary/60 uppercase hover:text-secondary transition-colors flex items-center gap-1"
                >
                  Data Inizio
                  {sortBy === "date" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-28 flex-shrink-0">
                <div className="text-xs font-bold text-secondary/60 uppercase">Data Fine</div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-secondary/60 uppercase">Motivo</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {sortedBlocks.map((block) => {
            const startDate = new Date(block.start_time);
            const endDate = new Date(block.end_time);
            const blockStyle = getBlockStyle(block.reason);
            const BlockIcon = blockStyle.icon;
            
            // Formatta orario dal primo blocco
            const firstDate = new Date(block.allDates[0].start);
            const lastDate = new Date(block.allDates[block.allDates.length - 1].end);
            const startTime = format(firstDate, "HH:mm");
            const endTime = format(lastDate, "HH:mm");
            
            return (
              <div key={block.id}>
                {/* Blocco principale - CLICCABILE */}
                <div
                  onClick={() => router.push(`/dashboard/admin/courts/${block.id}`)}
                  className={`bg-white rounded-md p-5 ${blockStyle.bgHover} hover:shadow-lg transition-all border-l-4 ${blockStyle.borderColor} cursor-pointer`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icona */}
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <BlockIcon className={`h-5 w-5 ${blockStyle.iconColor}`} strokeWidth={2} />
                    </div>

                    {/* Campo */}
                    <div className="w-32 flex-shrink-0">
                      <div className="font-bold text-secondary">{block.court_id}</div>
                    </div>

                    {/* Data Inizio */}
                    <div className="w-28 flex-shrink-0">
                      <div className="font-bold text-secondary text-sm">
                        {formatDate(block.start_time)}
                      </div>
                      <div className="text-xs text-secondary/60 mt-0.5">
                        {startTime}
                      </div>
                    </div>

                    {/* Data Fine */}
                    <div className="w-28 flex-shrink-0">
                      <div className="font-bold text-secondary text-sm">
                        {formatDate(block.end_time)}
                      </div>
                      <div className="text-xs text-secondary/60 mt-0.5">
                        {endTime}
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-secondary">
                        {block.reason || "Blocco campo"}
                      </div>
                      <div className="text-xs text-secondary/60 mt-0.5">
                        {block.blockIds.length} {block.blockIds.length === 1 ? "giorno" : "giorni"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
