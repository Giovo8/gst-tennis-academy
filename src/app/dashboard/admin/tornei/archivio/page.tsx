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
  Eye
} from "lucide-react";
import Link from "next/link";

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  max_participants?: number;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admin/tornei"
            className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Gestione competizioni
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Archivio Competizioni
          </h1>
          <p className="text-secondary/70 text-sm md:text-base">
            Visualizza tutte le competizioni concluse e archiviate.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome torneo, descrizione o categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
        <div className="text-center py-20 rounded-xl bg-white">
          <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search ? "Nessuna competizione trovata" : "Nessuna competizione archiviata"}
          </h3>
          <p className="text-secondary/70">
            {search 
              ? "Prova a modificare i criteri di ricerca."
              : "Le competizioni concluse appariranno qui."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-secondary/5 rounded-xl px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-64">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Nome torneo</div>
                </div>
                <div className="w-40">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Tipo</div>
                </div>
                <div className="w-32">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Data</div>
                </div>
                <div className="w-24">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Partecipanti</div>
                </div>
                <div className="w-32">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Stato</div>
                </div>
              </div>
              <div className="w-36 text-right">
                <div className="text-xs font-bold text-secondary/60 uppercase">Azioni</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {filteredTournaments.map((tournament) => {
            const typeInfo = typeConfig[tournament.competition_type || 'eliminazione_diretta'];
            const statusInfo = statusConfig[tournament.status || 'Completato'] || statusConfig["Completato"];

            return (
              <div
                key={tournament.id}
                className="bg-white rounded-xl px-5 py-4 hover:shadow-md transition-all border border-gray-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-64">
                      <h3 className="font-bold text-secondary">{tournament.title}</h3>
                      {tournament.description && (
                        <p className="text-xs text-secondary/60 mt-0.5">{tournament.description}</p>
                      )}
                    </div>
                    <div className="w-40">
                      <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="w-32">
                      <div className="text-sm text-secondary/70">
                        {tournament.start_date 
                          ? new Date(tournament.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '-'}
                      </div>
                    </div>
                    <div className="w-24 text-center">
                      <div className="text-sm font-semibold text-secondary">
                        {tournament.max_participants || '-'}
                      </div>
                    </div>
                    <div className="w-32">
                      <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="w-36 flex items-center justify-end gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/admin/tornei/${tournament.id}`)}
                      className="p-2 rounded-md text-secondary/70 hover:bg-secondary/10 transition-all"
                      title="Visualizza"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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
