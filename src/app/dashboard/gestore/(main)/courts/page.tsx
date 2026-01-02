"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type CourtBlock = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason: string;
};

const COURTS = [
  { id: "campo-1", name: "Campo 1", type: "Terra Rossa" },
  { id: "campo-2", name: "Campo 2", type: "Terra Rossa" },
  { id: "campo-3", name: "Campo 3", type: "Sintetico" },
  { id: "campo-4", name: "Campo 4", type: "Sintetico" },
];

export default function GestoreCourtsPage() {
  const [blocks, setBlocks] = useState<CourtBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    setLoading(true);
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("court_blocks")
      .select("*")
      .gte("end_time", now)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setBlocks(data);
    }
    
    setLoading(false);
  }

  const isCourtBlocked = (courtId: string) => {
    const now = new Date();
    return blocks.some(b => 
      b.court_id === courtId && 
      new Date(b.start_time) <= now && 
      new Date(b.end_time) >= now
    );
  };

  const getCourtBlock = (courtId: string) => {
    const now = new Date();
    return blocks.find(b => 
      b.court_id === courtId && 
      new Date(b.start_time) <= now && 
      new Date(b.end_time) >= now
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Gestione Campi</h1>
        <p className="text-[var(--foreground-muted)]">Visualizza lo stato dei campi e gestisci i blocchi</p>
      </div>

      {/* Courts Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {COURTS.map((court) => {
          const blocked = isCourtBlocked(court.id);
          const block = getCourtBlock(court.id);
          
          return (
            <div
              key={court.id}
              className={`bg-[var(--surface)] rounded-xl border p-6 transition ${
                blocked
                  ? "border-red-500/50"
                  : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{court.name}</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">{court.type}</p>
                </div>
                <div className={`rounded-lg p-2 ${blocked ? "bg-red-500/10" : "bg-green-500/10"}`}>
                  {blocked ? (
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  )}
                </div>
              </div>
              
              <div className={`text-sm font-medium ${blocked ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                {blocked ? (
                  <>
                    <p className="mb-1">⚠️ Campo bloccato</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{block?.reason || "Manutenzione"}</p>
                  </>
                ) : (
                  <p>✓ Disponibile</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Blocks */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Blocchi Attivi e Programmati</h2>
        
        {blocks.length === 0 ? (
          <p className="text-[var(--foreground-muted)] text-center py-8">Nessun blocco attivo o programmato</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-4 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)]">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{block.court_id}</p>
                  <p className="text-sm text-[var(--foreground-muted)]">{block.reason}</p>
                </div>
                <div className="text-right text-sm text-[var(--foreground-muted)]">
                  <p>{new Date(block.start_time).toLocaleDateString("it-IT")}</p>
                  <p>{new Date(block.start_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} - {new Date(block.end_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
