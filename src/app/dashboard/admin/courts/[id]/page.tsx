"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Pencil,
  Trash2,
  Loader2,
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

export default function CourtBlockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const blockId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deletingDateId, setDeletingDateId] = useState<string | null>(null);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);

  function getBlockStyle(reason?: string) {
    const reasonLower = (reason || "").toLowerCase();

    if (reasonLower.includes("corso adulti")) {
      return {
        type: "Corso Adulti",
        icon: GraduationCap,
      };
    }

    if (reasonLower.includes("corsi") || reasonLower.includes("tennis")) {
      return {
        type: "Corsi Tennis",
        icon: GraduationCap,
      };
    }

    if (reasonLower.includes("manutenzione")) {
      return {
        type: "Manutenzione",
        icon: Wrench,
      };
    }

    if (reasonLower.includes("evento")) {
      return {
        type: "Evento",
        icon: Flag,
      };
    }

    return {
      type: "Blocco",
      icon: Shield,
    };
  }

  useEffect(() => {
    void loadBlockDetails();
  }, [blockId]);

  async function loadBlockDetails() {
    try {
      setLoading(true);

      const { data: mainBlock, error: mainError } = await supabase
        .from("court_blocks")
        .select("*")
        .eq("id", blockId)
        .single();

      if (mainError || !mainBlock) {
        router.push("/dashboard/admin/courts");
        return;
      }

      const mainDate = new Date(mainBlock.start_time);
      const mainEndDate = new Date(mainBlock.end_time);
      const mainStartTime = mainDate.getHours() * 60 + mainDate.getMinutes();
      const mainEndTime = mainEndDate.getHours() * 60 + mainEndDate.getMinutes();

      const { data: relatedBlocks } = await supabase
        .from("court_blocks")
        .select("*")
        .eq("court_id", mainBlock.court_id)
        .eq("reason", mainBlock.reason || "")
        .order("start_time", { ascending: true });

      const filteredBlocks = (relatedBlocks || []).filter((item) => {
        const itemStart = new Date(item.start_time);
        const itemEnd = new Date(item.end_time);
        const itemStartTime = itemStart.getHours() * 60 + itemStart.getMinutes();
        const itemEndTime = itemEnd.getHours() * 60 + itemEnd.getMinutes();
        return itemStartTime === mainStartTime && itemEndTime === mainEndTime;
      });

      setAllBlocks(filteredBlocks.length > 0 ? filteredBlocks : [mainBlock]);
    } catch (err) {
      console.error("Error loading block:", err);
      router.push("/dashboard/admin/courts");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!allBlocks.length) return;

    if (!confirm(`Sei sicuro di voler eliminare tutti i ${allBlocks.length} giorni di questo blocco?`)) {
      return;
    }

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("court_blocks")
        .delete()
        .in("id", allBlocks.map((item) => item.id));

      if (error) throw error;

      router.push("/dashboard/admin/courts");
    } catch (err) {
      console.error("Error deleting blocks:", err);
      alert("Errore durante l'eliminazione del blocco");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteDateTab(block: Block) {
    const dateLabel = format(new Date(block.start_time), "dd/MM/yyyy", { locale: it });
    const shouldDelete = confirm(
      `Vuoi eliminare il tab del ${dateLabel}? Questa azione crea un'eccezione per questa data.`
    );

    if (!shouldDelete) return;

    try {
      setDeletingDateId(block.id);

      const { error } = await supabase
        .from("court_blocks")
        .delete()
        .eq("id", block.id);

      if (error) throw error;

      if (allBlocks.length === 1) {
        router.push("/dashboard/admin/courts");
        return;
      }

      setAllBlocks((prev) => prev.filter((item) => item.id !== block.id));
    } catch (err) {
      console.error("Error creating block exception:", err);
      alert("Errore durante la creazione dell'eccezione");
    } finally {
      setDeletingDateId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento dettagli...</p>
      </div>
    );
  }

  if (!allBlocks.length) {
    return (
      <div className="space-y-4">
        <p className="text-secondary/70">Blocco non trovato.</p>
        <Link href="/dashboard/admin/courts" className="text-secondary font-medium hover:underline">
          Torna a Blocco Campi
        </Link>
      </div>
    );
  }

  const firstBlock = allBlocks[0];
  const blockStyle = getBlockStyle(firstBlock.reason);
  const BlockIcon = blockStyle.icon;

  const firstDate = new Date(allBlocks[0].start_time);
  const lastDate = new Date(allBlocks[allBlocks.length - 1].end_time);

  return (
    <div className="space-y-6">
      <p className="breadcrumb text-secondary/60">
        <Link href="/dashboard/admin/courts" className="hover:text-secondary/80 transition-colors">
          Blocco Campi
        </Link>
        {" › "}
        <span>Dettagli Blocco</span>
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-secondary">Dettagli Blocco</h1>
        <p className="text-secondary/70 font-medium">
          Visualizza e gestisci i dettagli del blocco campi
        </p>
      </div>

      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: "var(--secondary)" }}
      >
        <div className="flex items-start gap-6">
          <BlockIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{firstBlock.court_id}</h1>
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
                      onClick={() => void handleDeleteDateTab(block)}
                      disabled={deletingDateId === block.id}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8 disabled:opacity-50"
                      aria-label={`Elimina ${format(dateStart, "dd/MM/yyyy", { locale: it })}`}
                    >
                      {deletingDateId === block.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli blocco</h2>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Motivo</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{firstBlock.reason || "Non specificato"}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Intervallo date</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {format(firstDate, "dd/MM/yyyy", { locale: it })} - {format(lastDate, "dd/MM/yyyy", { locale: it })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni bloccati</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {allBlocks.length} {allBlocks.length === 1 ? "giorno" : "giorni"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Creato il</label>
            <div className="flex-1">
              <p className="text-secondary/70">
                {format(new Date(firstBlock.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/admin/courts/modifica?id=${blockId}`}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
        >
          <Pencil className="h-5 w-5" />
          Modifica
        </Link>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
          Elimina
        </button>
      </div>
    </div>
  );
}
