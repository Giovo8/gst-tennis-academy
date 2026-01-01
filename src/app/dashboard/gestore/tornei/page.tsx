"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Trophy, Award, CheckCircle, Plus, Trash2, BarChart3 } from "lucide-react";
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
  competition_type?: 'torneo' | 'campionato';
  format?: 'eliminazione_diretta' | 'round_robin' | 'girone_eliminazione';
  status?: string;
  category?: string;
  surface_type?: string;
  match_format?: string;
  entry_fee?: number;
};


function GestoreTorneiPageInner() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const selectedTournament = searchParams?.get("t");
  const [filterType, setFilterType] = useState<'all' | 'torneo' | 'campionato'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [managingTournamentId, setManagingTournamentId] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);

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

  async function loadParticipants(tournamentId: string) {
    setManagingTournamentId(tournamentId);
    try {
      const res = await fetch(`/api/tournament_participants?tournament_id=${tournamentId}`);
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) setParticipants(json.participants ?? []);
      else setError(json.error || 'Errore caricamento partecipanti');
    } catch (err) {
      // ignore
    }
  }

  async function handleDeleteTournament(tournamentId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo torneo? Questa azione è irreversibile e cancellerà anche tutti i match e i partecipanti associati.')) {
      return;
    }

    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch(`/api/tournaments?id=${tournamentId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (!res.ok) {
        setError(json.error || 'Errore eliminazione');
      } else {
        load();
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function handleEditTournament(tournamentId: string, updatedData: Partial<Tournament>) {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch(`/api/tournaments?id=${tournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(updatedData),
      });
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (!res.ok) {
        setError(json.error || 'Errore modifica');
      } else {
        load();
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16">
      {/* Header Section with Gradient */}
      <div className="relative mb-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[#7de3ff]/10 blur-3xl" />
          <div className="absolute right-1/4 top-20 h-48 w-48 rounded-full bg-[#4fb3ff]/10 blur-3xl" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff]" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7de3ff]">Area Gestore</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white via-[#7de3ff] to-white bg-clip-text text-transparent">
              Gestione Tornei
            </span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Crea e gestisci tornei e campionati con il sistema semplificato. 
            Scegli tra eliminazione diretta, girone + eliminazione o campionato.
          </p>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="mt-8">
        <TournamentStats />
      </div>

      {/* Reports Section */}
      <div className="mt-8">
        <button
          onClick={() => setShowReports(!showReports)}
          className="w-full group relative overflow-hidden rounded-xl border border-[#7de3ff]/20 bg-gradient-to-r from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-4 transition-all hover:border-[#7de3ff]/40 hover:shadow-lg hover:shadow-[#7de3ff]/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#7de3ff]/30 to-[#4fb3ff]/30 ring-1 ring-[#7de3ff]/50">
                <BarChart3 className="w-5 h-5 text-[#7de3ff]" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">Statistiche e Report Avanzati</h3>
                <p className="text-xs text-gray-400">Classifiche giocatori, performance e storico tornei</p>
              </div>
            </div>
            <div className={`transform transition-transform ${showReports ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-[#7de3ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>
        
        {showReports && (
          <div className="mt-4 rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 via-[#0a1929]/90 to-[#0a1929]/80 backdrop-blur-xl p-6">
            <TournamentReports />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6">
        {/* Nuovo form semplificato con design moderno */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 via-[#0a1929]/90 to-[#0a1929]/80 backdrop-blur-xl shadow-2xl shadow-[#7de3ff]/5 transition-all hover:border-[#7de3ff]/40 hover:shadow-[#7de3ff]/10">
          {/* Animated background orbs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-10 h-32 w-32 animate-pulse rounded-full bg-[#7de3ff]/5 blur-2xl" style={{animationDuration: '4s'}} />
            <div className="absolute right-10 bottom-10 h-24 w-24 animate-pulse rounded-full bg-[#4fb3ff]/5 blur-2xl" style={{animationDuration: '6s', animationDelay: '2s'}} />
          </div>
          
          <div className="relative p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="group-hover:scale-110 transition-transform duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#7de3ff] to-[#4fb3ff] opacity-20 blur-lg" />
                    <div className="relative rounded-xl bg-gradient-to-br from-[#7de3ff]/30 to-[#4fb3ff]/30 p-3 ring-1 ring-[#7de3ff]/50">
                      <Trophy className="w-7 h-7 text-[#7de3ff] drop-shadow-[0_0_8px_rgba(125,227,255,0.5)]" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Crea Nuovo Torneo</h2>
                  <p className="text-sm text-gray-400">Sistema semplificato con wizard in 3 step</p>
                </div>
              </div>
              
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-6 py-3 font-bold text-[#0a1929] shadow-lg shadow-[#7de3ff]/30 transition-all hover:shadow-xl hover:shadow-[#7de3ff]/40 hover:scale-105 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                  <div className="relative flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    <span>Nuovo Torneo</span>
                  </div>
                </button>
              )}
            </div>

          {showCreateForm && (
            <SimpleTournamentCreator 
              onSuccess={() => {
                setShowCreateForm(false);
                load();
              }}
            />
          )}

          {!showCreateForm && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 ring-1 ring-[#7de3ff]/30 mb-4">
                <Trophy className="w-8 h-8 text-[#7de3ff]/60" />
              </div>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Clicca su <span className="font-semibold text-[#7de3ff]">&quot;Nuovo Torneo&quot;</span> per creare un torneo semplificato con wizard intuitivo in 3 step
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Lista Competizioni */}
        <div className="relative overflow-hidden rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 via-[#0a1929]/90 to-[#0a1929]/80 backdrop-blur-xl shadow-2xl shadow-[#7de3ff]/5">
          {/* Animated background for list */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-20 top-20 h-40 w-40 animate-pulse rounded-full bg-[#4fb3ff]/5 blur-3xl" style={{animationDuration: '8s'}} />
          </div>
          
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Competizioni Attive</h2>
                <p className="text-sm text-gray-400">Gestisci e monitora tutti i tornei</p>
              </div>
              <div className="flex justify-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] text-[#0a1929] shadow-lg shadow-[#7de3ff]/30'
                    : 'bg-[#0a1929]/60 text-gray-400 border border-[#7de3ff]/10 hover:border-[#7de3ff]/30 hover:text-[#7de3ff]'
                }`}
              >
                Tutte
              </button>
              <button
                onClick={() => setFilterType('torneo')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterType === 'torneo'
                    ? 'bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] text-[#0a1929] shadow-lg shadow-[#7de3ff]/30'
                    : 'bg-[#0a1929]/60 text-gray-400 border border-[#7de3ff]/10 hover:border-[#7de3ff]/30 hover:text-[#7de3ff]'
                }`}
              >
                Tornei
              </button>
              <button
                onClick={() => setFilterType('campionato')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterType === 'campionato'
                    ? 'bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] text-[#0a1929] shadow-lg shadow-[#7de3ff]/30'
                    : 'bg-[#0a1929]/60 text-gray-400 border border-[#7de3ff]/10 hover:border-[#7de3ff]/30 hover:text-[#7de3ff]'
                }`}
              >
                Campionati
              </button>
            </div>
          </div>
          </div>
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#7de3ff]/20 blur-xl animate-pulse" />
                <Loader2 className="relative w-10 h-10 animate-spin text-[#7de3ff]" />
              </div>
              <p className="mt-4 text-sm text-gray-400 animate-pulse">Caricamento tornei...</p>
            </div>
          )}

          {!loading && tournaments.filter(t => filterType === 'all' || t.competition_type === filterType || (!t.competition_type && filterType === 'torneo')).length === 0 && (
            <div className="py-20 text-center">
              <div className="relative inline-flex mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 blur-xl" />
                <div className="relative rounded-2xl bg-[#0a1929]/60 p-6 ring-1 ring-[#7de3ff]/20">
                  <Trophy className="w-16 h-16 text-[#7de3ff]/40" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nessun torneo ancora</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">Inizia creando il tuo primo torneo con il sistema semplificato</p>
            </div>
          )}

          {!loading && (
            <ul className="space-y-3">
              {tournaments
                .filter(t => filterType === 'all' || t.competition_type === filterType || (!t.competition_type && filterType === 'torneo'))
                .map(t => (
                <li key={t.id} className="group/item relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-gradient-to-br from-[#0a1929]/60 to-[#0a1929]/40 border border-[#7de3ff]/10 hover:border-[#7de3ff]/40 hover:bg-[#0a1929]/80 transition-all duration-300 hover:shadow-lg hover:shadow-[#7de3ff]/10 hover:-translate-y-0.5">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7de3ff]/0 via-[#7de3ff]/5 to-[#7de3ff]/0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex items-start gap-4 flex-1">
                    <div className="group-hover/item:scale-110 transition-transform duration-300">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#7de3ff] to-[#4fb3ff] opacity-0 group-hover/item:opacity-20 blur-lg transition-opacity" />
                        <div className="relative p-3 rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 ring-1 ring-[#7de3ff]/30">
                          <Trophy className="w-5 h-5 text-[#7de3ff]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg ring-1 ${
                          (t.competition_type === 'campionato')
                            ? 'bg-[#4fb3ff]/10 text-[#4fb3ff] ring-[#4fb3ff]/20'
                            : 'bg-[#7de3ff]/10 text-[#7de3ff] ring-[#7de3ff]/20'
                        }`}>
                          {t.competition_type === 'campionato' ? 'Campionato' : 'Torneo'}
                        </span>
                        {t.status && (
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ring-1 ${
                            t.status === 'Aperto' 
                              ? 'bg-blue-500/10 text-blue-300 ring-blue-500/20'
                              : t.status === 'In corso'
                              ? 'bg-green-500/10 text-green-300 ring-green-500/20'
                              : 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
                          }`}>
                            {t.status}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white mb-2 truncate group-hover/item:text-[#7de3ff] transition-colors">{t.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="text-gray-400">
                          {t.start_date ? new Date(t.start_date).toLocaleString('it-IT') : 'Data da definire'}
                        </div>
                        {t.format && (
                          <div className="text-gray-500 capitalize">
                            • {t.format.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2 sm:ml-3">
                      <button
                        onClick={() => handleDeleteTournament(t.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 transition-all hover:shadow-md"
                        title="Elimina torneo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Vuoi chiudere le iscrizioni?')) {
                            handleEditTournament(t.id, { status: 'Chiuso' });
                          }
                        }}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#0a1929]/80 text-gray-300 border border-[#7de3ff]/20 hover:border-[#7de3ff]/50 hover:text-[#7de3ff] hover:bg-[#0a1929] transition-all hover:shadow-md"
                      >
                        Chiudi
                      </button>
                      <button
                        onClick={() => loadParticipants(t.id)}
                        className="group/manage relative overflow-hidden px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] text-[#0a1929] shadow-md shadow-[#7de3ff]/30 hover:shadow-lg hover:shadow-[#7de3ff]/40 transition-all hover:scale-105 active:scale-95"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/manage:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative">Gestisci</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Pannello di Gestione Torneo */}
      {managingTournamentId && (
        <div className="relative overflow-hidden rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl shadow-xl shadow-[#7de3ff]/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-20 top-10 h-32 w-32 animate-pulse rounded-full bg-[#7de3ff]/5 blur-2xl" />
          </div>
          
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 p-2.5 ring-1 ring-[#7de3ff]/30">
                  <Trophy className="w-6 h-6 text-[#7de3ff]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Gestione Torneo</h3>
                  <p className="text-xs text-gray-400">Gestisci partecipanti, gironi e tabelloni</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setManagingTournamentId(null);
                  setParticipants([]);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#0a1929]/80 text-gray-300 border border-[#7de3ff]/20 hover:border-[#7de3ff]/50 hover:text-[#7de3ff] hover:bg-[#0a1929] transition-all"
              >
                Chiudi
              </button>
            </div>
            <TournamentManagerWrapper tournamentId={managingTournamentId} isAdmin={true} />
          </div>
        </div>
      )}

      {/* Partecipanti del torneo selezionato */}
      {selectedTournament && participants.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl shadow-xl shadow-[#7de3ff]/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-20 top-10 h-32 w-32 animate-pulse rounded-full bg-[#7de3ff]/5 blur-2xl" />
          </div>
          
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 p-2.5 ring-1 ring-[#7de3ff]/30">
                <Award className="w-5 h-5 text-[#7de3ff]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Iscritti ({participants.length})
                </h3>
                <p className="text-xs text-gray-400">Partecipanti registrati al torneo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {participants.map((p: any) => (
                <div
                  key={p.id}
                  className="group/participant flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-[#0a1929]/60 to-[#0a1929]/40 border border-[#7de3ff]/10 hover:border-[#7de3ff]/30 hover:bg-[#0a1929]/80 transition-all hover:shadow-md hover:shadow-[#7de3ff]/10"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7de3ff] to-[#4fb3ff] opacity-20 blur-md group-hover/participant:opacity-40 transition-opacity" />
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 ring-1 ring-[#7de3ff]/30 flex items-center justify-center">
                      <span className="text-[#7de3ff] font-bold text-sm">
                        {(p.profiles?.full_name || p.user_id || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-white truncate group-hover/participant:text-[#7de3ff] transition-colors">
                    {p.profiles?.full_name || p.user_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error notification with better design */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pb-safe">
          <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-900/10 backdrop-blur-xl p-4 shadow-2xl shadow-red-500/20 max-w-md">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent" />
            <div className="relative flex items-start gap-3">
              <div className="rounded-lg bg-red-500/20 p-2 ring-1 ring-red-500/30">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300 mb-1">Errore</p>
                <p className="text-xs text-red-200/80">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function GestoreTorneiPage() {
  return (
    <Suspense>
      <GestoreTorneiPageInner />
    </Suspense>
  );
}
