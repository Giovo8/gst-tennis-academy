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
  Search,
  Archive,
  Target,
  MoreVertical,
  Pencil,
} from "lucide-react";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";
import TournamentStats from "@/components/tournaments/TournamentStats";
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

function AdminTorneiPageInner() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managingTournamentId, setManagingTournamentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato'>('all');
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    const matchesType = filterType === 'all' || t.tournament_type === filterType || t.competition_type === filterType;
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
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">Gestione Competizioni</h1>
          <p className="text-secondary/70 font-medium">
            Visualizza, crea e gestisci tornei e campionati
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => router.push('/dashboard/admin/tornei/new')}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Torneo
          </button>
          <button
            onClick={() => router.push('/dashboard/admin/tornei/archivio')}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Archivio"
          >
            <Archive className="h-5 w-5" />
          </button>
          <Link
            href="/dashboard/admin/tornei/report"
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all inline-flex items-center justify-center"
            title="Report"
          >
            <BarChart3 className="h-5 w-5" />
          </Link>
        </div>
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
          <p className="mt-4 text-secondary/60">Caricamento tornei...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun torneo trovato</h3>
          <p className="text-secondary/60">Crea il tuo primo torneo</p>
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
              <div className="grid grid-cols-[40px_1fr_80px_80px_40px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                <div className="text-xs font-bold text-white/80 uppercase">Nome Torneo</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Data</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Iscritti</div>
                <div></div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredTournaments.map((tournament) => {
              const statusInfo = statusConfig[tournament.status || 'Aperto'] || statusConfig["Aperto"];

              // Determina il colore del bordo in base allo stato
              let borderColor = "#034863"; // secondary - default
              if (tournament.status === "Aperto") {
                // Rosso se posti esauriti, verde altrimenti
                if ((tournament.current_participants || 0) >= (tournament.max_participants || 0)) {
                  borderColor = "#ef4444"; // red - posti esauriti
                } else {
                  borderColor = "#10b981"; // emerald - aperto/fase iscrizione
                }
              } else if (tournament.status === "In Corso" || tournament.status === "In corso") {
                borderColor = "#034863"; // secondary (blu del bottone Nuovo Torneo) - in corso
              } else if (tournament.status === "Completato" || tournament.status === "Concluso" || tournament.status === "Chiuso") {
                borderColor = "#6b7280"; // gray - completato/concluso/chiuso
              }

              return (
                <div
                  key={tournament.id}
                  className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div
                    onClick={() => router.push(`/dashboard/admin/tornei/${tournament.id}`)}
                    className="grid grid-cols-[40px_1fr_80px_80px_40px] items-center gap-4 no-underline"
                  >
                    {/* Simbolo Tipo */}
                    <div className="flex items-center justify-center">
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
                    <div className="font-bold text-secondary truncate">
                      {tournament.title}
                    </div>

                    {/* Data */}
                    <div className="text-center">
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
                    <div className="text-center">
                      <div className="text-sm font-semibold text-secondary">
                        {tournament.current_participants || 0}/{tournament.max_participants || 0}
                      </div>
                    </div>

                    {/* Azioni - 3 puntini */}
                    <div className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === tournament.id ? null : tournament.id);
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === tournament.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                          <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                router.push(`/dashboard/admin/tornei/${tournament.id}`);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Gestisci
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDeleteTournament(tournament.id);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Elimina
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
