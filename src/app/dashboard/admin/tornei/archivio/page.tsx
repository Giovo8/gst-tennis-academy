"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { 
  Loader2, 
  Trophy, 
  ArrowLeft,
  Calendar,
  Users as UsersIcon,
  Search,
  Eye,
  Target
} from "lucide-react";
import Link from "next/link";

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  max_participants?: number;
  current_participants?: number;
  tournament_type?: 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';
  competition_type?: 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';
  status?: string;
  category?: string;
  surface_type?: string;
  match_format?: string;
  entry_fee?: number;
};

export default function ArchivioCompetizioni() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadArchivedTournaments();
  }, []);

  async function loadArchivedTournaments() {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments');
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) {
        // Filtra solo i tornei conclusi o completati
        const archivedTournaments = (json.tournaments ?? []).filter(
          (t: Tournament) => 
            t.status === 'Concluso' || 
            t.status === 'Completato' ||
            t.status === 'Chiuso'
        );
        setTournaments(archivedTournaments);
      } else {
        setError(json.error || 'Errore caricamento tornei');
      }
    } catch (err: any) {
      setError(err?.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    eliminazione_diretta: {
      label: "Eliminazione Diretta",
      color: "bg-frozen-50 text-frozen-700 border-frozen-200",
    },
    girone_eliminazione: {
      label: "Girone + Eliminazione",
      color: "bg-frozen-50 text-frozen-700 border-frozen-200",
    },
    campionato: {
      label: "Campionato",
      color: "bg-frozen-50 text-frozen-700 border-frozen-200",
    },
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    "Completato": {
      label: "Completato",
      color: "bg-slate-50 text-slate-700 border-slate-200",
    },
    "Concluso": {
      label: "Concluso",
      color: "bg-slate-50 text-slate-700 border-slate-200",
    },
    "Chiuso": {
      label: "Chiuso",
      color: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = 
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/tornei"
            className="hover:text-secondary/80 transition-colors"
          >
            Gestione Competizioni
          </Link>
          {" › "}
          <span>Archivio</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">
          Archivio Competizioni
        </h1>
        <p className="text-secondary/70 text-sm">
          Visualizza tutte le competizioni concluse e archiviate.
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome, descrizione o categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/70">Caricamento competizioni archiviate...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search ? "Nessuna competizione trovata" : "Nessuna competizione archiviata"}
          </h3>
          <p className="text-secondary/60">
            {search
              ? "Prova a modificare i criteri di ricerca."
              : "Le competizioni concluse appariranno qui."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[600px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="flex items-center gap-4">
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-white/80 uppercase">#</div>
                </div>
                <div className="w-48 flex-shrink-0">
                  <div className="text-xs font-bold text-white/80 uppercase">Nome Torneo</div>
                </div>
                <div className="flex-1"></div>
                <div className="w-28 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Data</div>
                </div>
                <div className="w-24 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Iscritti</div>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredTournaments.map((tournament) => {
              // Determina il colore del bordo in base allo stato
              let borderColor = "#6b7280"; // gray - default completato/concluso
              if (tournament.status === "Chiuso") {
                borderColor = "#ef4444"; // red - chiuso
              }

              return (
                <div
                  key={tournament.id}
                  onClick={() => router.push(`/dashboard/admin/tornei/${tournament.id}`)}
                  className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      {(tournament.tournament_type === 'eliminazione_diretta' || tournament.competition_type === 'eliminazione_diretta') && (
                        <Trophy className="h-5 w-5 text-secondary/60" />
                      )}
                      {(tournament.tournament_type === 'girone_eliminazione' || tournament.competition_type === 'girone_eliminazione') && (
                        <Target className="h-5 w-5 text-secondary/60" />
                      )}
                      {(tournament.tournament_type === 'campionato' || tournament.competition_type === 'campionato') && (
                        <UsersIcon className="h-5 w-5 text-secondary/60" />
                      )}
                    </div>

                    {/* Nome */}
                    <div className="w-48 flex-shrink-0">
                      <div className="font-bold text-secondary truncate">
                        {tournament.title}
                      </div>
                    </div>

                    {/* Spazio flessibile */}
                    <div className="flex-1"></div>

                    {/* Data */}
                    <div className="w-28 flex-shrink-0 text-center">
                      {tournament.start_date ? (
                        <div className="text-sm font-semibold text-secondary">
                          {new Date(tournament.start_date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

                    {/* Partecipanti */}
                    <div className="w-24 flex-shrink-0 text-center">
                      <div className="text-sm font-semibold text-secondary">
                        {tournament.current_participants || 0}/{tournament.max_participants || 0}
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
