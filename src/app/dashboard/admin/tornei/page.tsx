"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Search
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
      if (res.ok) setTournaments(json.tournaments ?? []);
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
    eliminazione_diretta: { label: "Eliminazione Diretta", color: "bg-blue-100 text-blue-700 border-blue-300" },
    girone_eliminazione: { label: "Girone + Eliminazione", color: "bg-purple-100 text-purple-700 border-purple-300" },
    campionato: { label: "Campionato", color: "bg-pink-100 text-pink-700 border-pink-300" },
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    "Aperto": { label: "Aperto", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    "In Corso": { label: "In Corso", color: "bg-amber-100 text-amber-700 border-amber-300" },
    "In corso": { label: "In Corso", color: "bg-amber-100 text-amber-700 border-amber-300" },
    "Completato": { label: "Completato", color: "bg-gray-100 text-gray-700 border-gray-300" },
    "Concluso": { label: "Concluso", color: "bg-gray-100 text-gray-700 border-gray-300" },
    "Chiuso": { label: "Chiuso", color: "bg-red-100 text-red-700 border-red-300" },
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

  const stats = {
    total: tournaments.length,
    aperto: tournaments.filter((t) => t.status === "Aperto").length,
    inCorso: tournaments.filter((t) => t.status === "In Corso" || t.status === "In corso").length,
    completato: tournaments.filter((t) => t.status === "Completato" || t.status === "Concluso").length,
  };

  return (
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-700 mb-2">
            Gestione Tornei
          </h1>
          <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>
            Crea e gestisci tornei e campionati
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Nascondi Form" : "Nuovo Torneo"}
          </button>
          <button
            onClick={() => setShowReports(!showReports)}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Trophy className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Totale</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.aperto}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Aperti</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.inCorso}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">In Corso</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Trophy className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.completato}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Completati</p>
        </div>
      </div>

      {/* Reports */}
      {showReports && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <TournamentReports />
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
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
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome torneo, descrizione o categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filterType === "all"
                  ? "text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Filter className="inline-block w-4 h-4 mr-1.5" />
              Tutti
            </button>
            {Object.entries(typeConfig).map(([type, { label }]) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filterType === type
                    ? "text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Tournaments List */}
      {!showCreateForm && !showReports && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="mt-4 text-gray-600">Caricamento tornei...</p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-gray-200 bg-white">
              <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun torneo trovato</h3>
              <p className="text-gray-600">Crea il tuo primo torneo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header Row */}
              <div className="bg-gray-100 rounded-xl px-5 py-3 border border-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-64">
                      <div className="text-xs font-bold text-gray-600 uppercase">Nome Torneo</div>
                    </div>
                    <div className="w-40">
                      <div className="text-xs font-bold text-gray-600 uppercase">Tipo</div>
                    </div>
                    <div className="w-32">
                      <div className="text-xs font-bold text-gray-600 uppercase">Data</div>
                    </div>
                    <div className="w-24">
                      <div className="text-xs font-bold text-gray-600 uppercase">Partecipanti</div>
                    </div>
                    <div className="w-32">
                      <div className="text-xs font-bold text-gray-600 uppercase">Stato</div>
                    </div>
                  </div>
                  <div className="w-36 text-right">
                    <div className="text-xs font-bold text-gray-600 uppercase">Azioni</div>
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
                    onClick={() => setManagingTournamentId(tournament.id)}
                    className="group bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-6 flex-1">
                        {/* Nome */}
                        <div className="w-64">
                          <div className="font-bold text-gray-700 truncate">
                            {tournament.title}
                          </div>
                          {tournament.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {tournament.description}
                            </div>
                          )}
                        </div>

                        {/* Tipo */}
                        <div className="w-40">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>

                        {/* Data */}
                        <div className="w-32">
                          {tournament.start_date ? (
                            <div className="text-sm font-semibold text-gray-700">
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
                          <div className="text-sm font-semibold text-gray-700">
                            {tournament.max_participants || 0}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="w-32">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border ${statusInfo.color}`}>
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
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
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
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-gray-900">Gestione Torneo</h3>
            <button
              onClick={() => setManagingTournamentId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg">
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
