"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trophy,
  Plus,
  Users as UsersIcon,
  Search,
  SlidersHorizontal,
  Target,
  X,
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments?includeCounts=true');
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) {
        setTournaments(json.tournaments ?? []);
      }
      else setError(json.error || 'Errore caricamento tornei');
    } catch (err: any) {
      setError(err?.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all';

  const filteredTournaments = tournaments.filter((t) => {
    const matchesType = filterType === 'all' || t.tournament_type === filterType || t.competition_type === filterType;
    const matchesStatus = filterStatus === 'all' || (t.status || 'Aperto') === filterStatus;
    const matchesSearch = 
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">Gestione Competizioni</p>
        <h1 className="text-4xl font-bold text-secondary">Gestione Competizioni</h1>
      </div>

      <button
        onClick={() => router.push('/dashboard/admin/tornei/new')}
        className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Nuovo Torneo
      </button>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome, descrizione o categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              hasActiveFilters || isFilterPanelOpen
                ? "border-secondary bg-secondary text-white hover:opacity-90"
                : "border-black/10 bg-white text-secondary hover:bg-gray-50"
            }`}
            aria-label="Mostra o nascondi filtri"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {isFilterPanelOpen && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2">
                {[
                  { value: "all", label: "Tutti i tipi" },
                  { value: "eliminazione_diretta", label: "Eliminazione Diretta" },
                  { value: "girone_eliminazione", label: "Girone + Eliminazione" },
                  { value: "campionato", label: "Campionato" },
                ].map((option) => {
                  const isSelected = filterType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilterType(option.value as typeof filterType)}
                      className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-secondary bg-secondary text-white"
                          : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}

                <div className="w-px h-7 bg-black/10 shrink-0" />

                {[
                  { value: "all", label: "Tutti gli stati" },
                  { value: "Aperto", label: "Aperto" },
                  { value: "In Corso", label: "In Corso" },
                  { value: "Completato", label: "Completato" },
                  { value: "Concluso", label: "Concluso" },
                  { value: "Chiuso", label: "Chiuso" },
                ].map((option) => {
                  const isSelected = filterStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilterStatus(option.value)}
                      className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-secondary bg-secondary text-white"
                          : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilterType("all");
                setFilterStatus("all");
              }}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
              aria-label="Reset filtri"
              title="Reset filtri"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento tornei...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun torneo trovato</h3>
          <p className="text-secondary/60">Crea il tuo primo torneo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTournaments.map((tournament) => {
            // Colore sfondo card in base allo stato
            let cardBg = "var(--secondary)";
            if (tournament.status === "Aperto") {
              cardBg = (tournament.current_participants || 0) >= (tournament.max_participants || 0)
                ? "#dc2626"
                : "#059669";
            } else if (tournament.status === "Completato" || tournament.status === "Concluso" || tournament.status === "Chiuso") {
              cardBg = "#9ca3af";
            }

            // Icona in base al tipo
            let TournamentIcon = Trophy;
            if (tournament.tournament_type === 'girone_eliminazione' || tournament.competition_type === 'girone_eliminazione') {
              TournamentIcon = Target;
            } else if (tournament.tournament_type === 'campionato' || tournament.competition_type === 'campionato') {
              TournamentIcon = UsersIcon;
            }

            return (
              <div
                key={tournament.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: cardBg }}
                onClick={() => router.push(`/dashboard/admin/tornei/${tournament.id}`)}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <TournamentIcon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{tournament.title}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {tournament.start_date
                        ? new Date(tournament.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                      {' · '}
                      {tournament.current_participants || 0}/{tournament.max_participants || 0} iscritti
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {tournament.status || 'Aperto'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pannello di Gestione Torneo */}
      {managingTournamentId && (
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-secondary">Gestione torneo</h3>
            <button
              onClick={() => setManagingTournamentId(null)}
              className="px-4 py-2 text-sm font-medium text-secondary/70 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors"
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
