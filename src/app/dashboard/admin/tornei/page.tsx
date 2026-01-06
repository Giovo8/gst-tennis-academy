"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { 
  Loader2, 
  Trophy, 
  Plus, 
  Trash2, 
  BarChart3,
  Users as UsersIcon,
  Calendar,
  Filter,
  Search,
  Archive
} from "lucide-react";
import SimpleTournamentCreator from "@/components/tournaments/SimpleTournamentCreator";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";
import TournamentStats from "@/components/tournaments/TournamentStats";
import TournamentReports from "@/components/tournaments/TournamentReports";

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  max_participants?: number;
  tournament_type?: 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';
  status?: string;
  category?: string;
  surface_type?: string;
  match_format?: string;
  entry_fee?: number;
};

function AdminTorneiPageInner() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [managingTournamentId, setManagingTournamentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato'>('all');
  const [showReports, setShowReports] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments');
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) {
        // Filtra via i tornei conclusi/archiviati
        const activeTournaments = (json.tournaments ?? []).filter(
          (t: Tournament) => 
            t.status !== 'Concluso' && 
            t.status !== 'Completato' && 
            t.status !== 'Chiuso'
        );
        setTournaments(activeTournaments);
      }
      else setError(json.error || 'Errore caricamento tornei');
    } catch (err: any) {
      setError(err?.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTournament(tournamentId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo torneo? Questa azione è irreversibile.')) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch(`/api/tournaments?id=${tournamentId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        load();
      } else {
        setError('Errore eliminazione torneo');
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    eliminazione_diretta: {
      label: "Eliminazione Diretta",
      color: "bg-secondary text-white",
    },
    girone_eliminazione: {
      label: "Girone + Eliminazione",
      color: "bg-secondary text-white",
    },
    campionato: {
      label: "Campionato",
      color: "bg-secondary text-white",
    },
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    "Aperto": {
      label: "Aperto",
      color: "bg-secondary text-white",
    },
    "In Corso": {
      label: "In Corso",
      color: "bg-secondary text-white",
    },
    "In corso": {
      label: "In Corso",
      color: "bg-secondary text-white",
    },
    "Completato": {
      label: "Completato",
      color: "bg-secondary text-white",
    },
    "Concluso": {
      label: "Concluso",
      color: "bg-secondary text-white",
    },
    "Chiuso": {
      label: "Chiuso",
      color: "bg-secondary text-white",
    },
  };

  const filteredTournaments = tournaments.filter((t) => {
    const matchesType = filterType === 'all' || t.tournament_type === filterType;
    const matchesSearch = 
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Gestione competizioni
          </h1>
          <p className="text-secondary/70 text-sm md:text-base">
            Crea e gestisci tornei e campionati della GST Tennis Academy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Nascondi Form" : "Nuovo Torneo"}
          </button>
          <button
            onClick={() => router.push('/dashboard/admin/tornei/archivio')}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            Archivio
          </button>
          <button
            onClick={() => setShowReports(!showReports)}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Report
          </button>
        </div>
      </div>

      {/* Stats */}
      {/* Reports */}
      {showReports && (
        <div className="bg-white rounded-xl p-6">
          <TournamentReports />
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl p-6">
          <SimpleTournamentCreator 
            onSuccess={() => {
              setShowCreateForm(false);
              load();
            }}
          />
        </div>
      )}

      {/* Filters */}
      {!showCreateForm && !showReports && (
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome torneo, descrizione o categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                filterType === "all"
                  ? "text-white bg-secondary hover:opacity-90"
                  : "bg-white text-secondary/70 hover:bg-secondary/5"
              }`}
            >
              <Filter className="inline-block w-4 h-4 mr-1.5" />
              Tutti
            </button>
            {Object.entries(typeConfig).map(([type, { label }]) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  filterType === type
                    ? "text-white bg-secondary hover:opacity-90"
                    : "bg-white text-secondary/70 hover:bg-secondary/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tournaments List */}
      {!showCreateForm && !showReports && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-secondary" />
              <p className="mt-4 text-secondary/70">Caricamento tornei...</p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-20 rounded-xl bg-white">
              <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
              <h3 className="text-xl font-semibold text-secondary mb-2">Nessun torneo trovato</h3>
              <p className="text-secondary/70">Crea il tuo primo torneo</p>
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
                const typeInfo = typeConfig[tournament.tournament_type || 'eliminazione_diretta'];
                const statusInfo = statusConfig[tournament.status || 'Aperto'] || statusConfig["Aperto"];

                return (
                  <div
                    key={tournament.id}
                    onClick={() => router.push(`/dashboard/admin/tornei/${tournament.id}`)}
                    className="group bg-white rounded-xl p-5 hover:bg-secondary/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-6 flex-1">
                        {/* Nome */}
                        <div className="w-64">
                          <div className="font-bold text-secondary truncate">
                            {tournament.title}
                          </div>
                          {tournament.description && (
                            <div className="text-xs text-secondary/60 truncate">
                              {tournament.description}
                            </div>
                          )}
                        </div>

                        {/* Tipo */}
                        <div className="w-40">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>

                        {/* Data */}
                        <div className="w-32">
                          {tournament.start_date ? (
                            <div className="text-sm font-semibold text-secondary">
                              {new Date(tournament.start_date).toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">-</div>
                          )}
                        </div>

                        {/* Partecipanti */}
                        <div className="w-24">
                          <div className="text-sm font-semibold text-secondary">
                            {tournament.max_participants || 0}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="w-32">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 w-36 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTournament(tournament.id);
                          }}
                          className="p-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Pannello di Gestione Torneo */}
      {managingTournamentId && (
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-secondary">Gestione torneo</h3>
            <button
              onClick={() => setManagingTournamentId(null)}
              className="px-4 py-2 text-sm font-medium text-secondary/70 bg-secondary/5 rounded-md hover:bg-secondary/10 transition-colors"
            >
              Chiudi
            </button>
          </div>
          <TournamentManagerWrapper tournamentId={managingTournamentId} isAdmin={true} />
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div className="bg-red-50 rounded-xl p-4 shadow-md">
            <div className="flex items-start gap-3">
              <div className="text-red-600">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 mb-1">Errore</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTorneiPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AdminTorneiPageInner />
    </Suspense>
  );
}
