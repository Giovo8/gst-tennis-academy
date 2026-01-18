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
      <div className="flex flex-col gap-4">
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link
              href="/dashboard/admin/bookings"
              className="hover:text-secondary/80 transition-colors"
            >
              Prenotazioni
            </Link>
            <span className="mx-2">›</span>
            <span>Blocco Campi</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Blocco campi</h1>
          <p className="text-secondary/70 text-sm max-w-2xl">
            Gestisci i blocchi sui campi per impedire le prenotazioni.
          </p>
        </div>
        <Link
          href="/dashboard/admin/courts/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white text-sm font-medium rounded-md transition-opacity"
        >
          <Plus className="h-5 w-5" />
          <span>Crea Blocco</span>
        </Link>
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
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
          <div className="space-y-3 min-w-[900px]">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-4 sm:px-5 py-3 mb-3 border border-secondary">
            <div className="grid grid-cols-[40px_100px_80px_60px_80px_60px_80px_1fr] gap-4 items-center">
              <div className="flex items-center justify-center">
                <Shield className="h-4 w-4 text-white/80" />
              </div>
              <button
                onClick={() => handleSort("court")}
                className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
              >
                Campo
                {sortBy === "court" && (
                  sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => handleSort("date")}
                className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
              >
                Data Inizio
                {sortBy === "date" && (
                  sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
              <div className="text-xs font-bold text-white/80 uppercase">Data Fine</div>
              <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
              <div className="text-xs font-bold text-white/80 uppercase">Durata</div>
              <div className="text-xs font-bold text-white/80 uppercase">Motivo</div>
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
            
            // Calcola durata in giorni
            const durationMs = new Date(block.end_time).getTime() - new Date(block.start_time).getTime();
            const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
            
            return (
              <div key={block.id}>
                {/* Blocco principale - CLICCABILE */}
                <div
                  onClick={() => router.push(`/dashboard/admin/courts/${block.id}`)}
                  className={`bg-white rounded-md px-4 py-3 ${blockStyle.bgHover} transition-all border-l-4 ${blockStyle.borderColor} cursor-pointer`}
                >
                  <div className="grid grid-cols-[40px_100px_80px_60px_80px_60px_80px_1fr] gap-4 items-center">
                    {/* Icona */}
                    <div className="flex items-center justify-center">
                      <BlockIcon className={`h-5 w-5 ${blockStyle.iconColor}`} strokeWidth={2} />
                    </div>

                    {/* Campo */}
                    <div className="font-bold text-secondary">{block.court_id}</div>

                    {/* Data Inizio */}
                    <div className="font-bold text-secondary text-sm">
                      {formatDate(block.start_time)}
                    </div>

                    {/* Ora Inizio */}
                    <div className="text-sm text-secondary/70">
                      {startTime}
                    </div>

                    {/* Data Fine */}
                    <div className="font-bold text-secondary text-sm">
                      {formatDate(block.end_time)}
                    </div>

                    {/* Ora Fine */}
                    <div className="text-sm text-secondary/70">
                      {endTime}
                    </div>

                    {/* Durata */}
                    <div className="text-sm text-secondary/70">
                      {durationDays} {durationDays === 1 ? "giorno" : "giorni"}
                    </div>

                    {/* Motivo */}
                    <div className="text-sm font-medium text-secondary">
                      {block.reason || "Blocco campo"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
