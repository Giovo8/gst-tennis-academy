"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Clock, AlertTriangle, CheckCircle } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Gestione Campi</h1>
        <p className="text-muted-2">Visualizza lo stato dei campi e gestisci i blocchi</p>
      </div>

      {/* Courts Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {COURTS.map((court) => {
          const blocked = isCourtBlocked(court.id);
          const block = getCourtBlock(court.id);
          
          return (
            <div
              key={court.id}
              className={`rounded-xl border p-6 transition ${
                blocked
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{court.name}</h3>
                  <p className="text-sm text-muted-2">{court.type}</p>
                </div>
                <div className={`rounded-lg p-2 ${blocked ? "bg-red-500/20" : "bg-emerald-500/20"}`}>
                  {blocked ? (
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  )}
                </div>
              </div>
              
              <div className={`text-sm font-medium ${blocked ? "text-red-300" : "text-emerald-300"}`}>
                {blocked ? (
                  <>
                    <p className="mb-1">⚠️ Campo bloccato</p>
                    <p className="text-xs text-muted-2">{block?.reason || "Manutenzione"}</p>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Blocchi Attivi e Programmati</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : blocks.length === 0 ? (
          <p className="text-muted-2 text-center py-8">Nessun blocco attivo o programmato</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="font-medium text-white">{block.court_id}</p>
                  <p className="text-sm text-muted-2">{block.reason}</p>
                </div>
                <div className="text-right text-sm text-muted-2">
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
