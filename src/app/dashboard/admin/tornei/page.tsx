"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { 
  Loader2, 
  Trophy, 
  Plus, 
  Trash2, 
  Users as UsersIcon,
  Search,
  SlidersHorizontal,
  Target,
  MoreVertical,
  Pencil,
} from "lucide-react";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";
import TournamentStats from "@/components/tournaments/TournamentStats";
import Link from "next/link";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary">Gestione Competizioni</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => router.push('/dashboard/admin/tornei/new')}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Torneo
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, descrizione o categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
            hasActiveFilters
              ? "border-secondary bg-secondary text-white hover:opacity-90"
              : "border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
          }`}
          aria-label="Apri filtri tornei"
          title="Filtri"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
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

                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === tournament.id) {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        } else {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          const menuWidth = 176;
                          const menuHeight = 100;
                          const viewportPadding = 8;
                          let left = rect.right - menuWidth;
                          left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));
                          let top = rect.bottom + 6;
                          if (top + menuHeight > window.innerHeight - viewportPadding) {
                            top = Math.max(viewportPadding, rect.top - menuHeight - 6);
                          }
                          setMenuPosition({ top, right: window.innerWidth - rect.right });
                          setOpenMenuId(tournament.id);
                        }
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === tournament.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); }} />
                        <div
                          className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                          style={{ top: menuPosition.top, right: menuPosition.right }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setMenuPosition(null);
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
                              setMenuPosition(null);
                              handleDeleteTournament(tournament.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors w-full"
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

      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Tornei</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Seleziona i criteri per visualizzare i tornei.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            <div className="space-y-1">
              <label htmlFor="tornei-type-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Tipo competizione
              </label>
              <select
                id="tornei-type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i tipi</option>
                <option value="eliminazione_diretta">Eliminazione Diretta</option>
                <option value="girone_eliminazione">Girone + Eliminazione</option>
                <option value="campionato">Campionato</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="tornei-status-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Stato
              </label>
              <select
                id="tornei-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti gli stati</option>
                <option value="Aperto">Aperto</option>
                <option value="In Corso">In Corso</option>
                <option value="Completato">Completato</option>
                <option value="Concluso">Concluso</option>
                <option value="Chiuso">Chiuso</option>
              </select>
            </div>
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => {
                setFilterType("all");
                setFilterStatus("all");
              }}
              className="w-1/2 py-3 border-r border-gray-200 text-secondary font-semibold hover:bg-gray-50 transition-colors"
            >
              Rimuovi filtri
            </button>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-1/2 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-br-lg"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
