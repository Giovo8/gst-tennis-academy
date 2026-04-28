"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  Check,
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
  is_disabled: boolean;
};

export default function CourtBlockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const blockId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [togglingDateId, setTogglingDateId] = useState<string | null>(null);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);

  function getBlockStyle(reason?: string) {
    const reasonText = (reason || "").trim();
    const reasonLower = reasonText.toLowerCase();

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

    if (reasonLower.startsWith("altro")) {
      return {
        type: "Altro",
        icon: Shield,
      };
    }

    return {
      type: reasonText ? "Altro" : "Blocco",
      icon: Shield,
    };
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
        .eq("is_disabled", false)
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

    if (!confirm(`Sei sicuro di voler disattivare tutti i ${allBlocks.length} giorni di questo blocco?`)) {
      return;
    }

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("court_blocks")
        .update({ is_disabled: true })
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

  async function handleToggleDateTab(block: Block) {
    const isCurrentlyDisabled = block.is_disabled;
    const dateLabel = format(new Date(block.start_time), "dd/MM/yyyy", { locale: it });
    const shouldToggle = confirm(
      isCurrentlyDisabled
        ? `Vuoi riattivare il giorno ${dateLabel}?`
        : `Vuoi disattivare il giorno ${dateLabel}?`
    );

    if (!shouldToggle) return;

    try {
      setTogglingDateId(block.id);
      const { error } = await supabase
        .from("court_blocks")
        .update({ is_disabled: !isCurrentlyDisabled })
        .eq("id", block.id);

      if (error) throw error;

      setAllBlocks((prev) =>
        prev.map((b) => b.id === block.id ? { ...b, is_disabled: !isCurrentlyDisabled } : b)
      );
    } catch (err) {
      console.error("Error toggling date:", err);
      alert("Errore durante la modifica");
    } finally {
      setTogglingDateId(null);
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
  const headerCardBg = getBlockCardBg(blockStyle.type);

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

      <div>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Blocco</h1>
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
            <h1 className="text-2xl font-bold text-white">{firstBlock.court_id}</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">
          Date bloccate
        </h2>

        <ul className="flex flex-col gap-2">
          {allBlocks.map((block, index) => {
            const dateStart = new Date(block.start_time);
            const dateEnd = new Date(block.end_time);
            const isDisabledDate = block.is_disabled;

            return (
              <li key={block.id}>
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg"
                  style={{ background: isDisabledDate ? "#9ca3af" : "var(--secondary)" }}
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
                      onClick={() => void handleToggleDateTab(block)}
                      disabled={togglingDateId === block.id}
                      className="inline-flex items-center justify-center w-8 h-8 rounded transition-all focus:outline-none disabled:opacity-50 hover:bg-white/10 text-white/70 hover:text-white"
                      aria-label={`${isDisabledDate ? "Riattiva" : "Disattiva"} ${format(dateStart, "dd/MM/yyyy", { locale: it })}`}
                    >
                      {togglingDateId === block.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isDisabledDate ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Giorni bloccati</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {allBlocks.length} {allBlocks.length === 1 ? "giorno" : "giorni"}
              </p>
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
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {format(new Date(firstBlock.start_time), "HH:mm")} - {format(new Date(firstBlock.end_time), "HH:mm")}
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/dashboard/admin/courts/modifica?id=${blockId}`}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
        >
          Modifica
        </Link>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : null}
          Elimina
        </button>
      </div>
    </div>
  );
}
