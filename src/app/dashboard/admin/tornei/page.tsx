"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Search, Trophy, Users, Calendar, TrendingUp, CheckCircle, Flag } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

// Define the Tournament type
interface Tournament {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  start_date: string | null;
  max_participants: number;
}

export default function AdminTorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Adjust the type for react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Tournament>();

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments");
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) {
        setTournaments(json.tournaments || []);
      } else {
        setError(json.error || "Errore nel caricamento dei tornei");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Errore di rete");
      }
    } finally {
      setLoading(false);
    }
  }

  async function createTournament(data: Tournament) {
    try {
      // use auth token for admin-created tournaments
      await supabase.auth.refreshSession();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) {
        loadTournaments();
        reset();
      } else {
        alert(json.error || "Errore nella creazione del torneo");
      }
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Errore di rete");
      }
    }
  }

  const filteredTournaments = tournaments.filter((tournament) =>
    (tournament.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tournament.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-12">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-400">
          Gestione Tornei
        </p>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent leading-tight">Tornei e Campionati</h1>
        <p className="text-sm text-gray-400">Crea e gestisci tutte le competizioni</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/20 p-3 group-hover:scale-110 transition-transform">
              <Trophy className="h-8 w-8 text-blue-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-400 font-bold">Totale</p>
              <p className="text-3xl font-bold text-white">{tournaments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="group rounded-2xl border border-green-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 hover:border-green-400/40 hover:shadow-xl hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/20 p-3 group-hover:scale-110 transition-transform">
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-300 font-bold">Attivi</p>
              <p className="text-3xl font-bold text-white">{tournaments.filter((t) => t.is_active).length}</p>
            </div>
          </div>
        </div>
        
        <div className="group rounded-2xl border border-purple-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent backdrop-blur-xl p-6 hover:border-purple-400/40 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-cyan-500/20 p-3 group-hover:scale-110 transition-transform">
              <Flag className="h-8 w-8 text-purple-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-cyan-300 font-bold">Conclusi</p>
              <p className="text-3xl font-bold text-white">{tournaments.filter((t) => !t.is_active).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per titolo o descrizione..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 pl-12 pr-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Crea Torneo
        </button>
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-sm text-gray-400">Caricamento tornei...</p>
          </div>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl">
          <Trophy className="h-16 w-16 text-blue-400/50 mx-auto mb-4" />
          <p className="text-xl font-bold text-white mb-2">Nessun torneo trovato</p>
          <p className="text-sm text-gray-400 mb-6">
            {searchQuery ? "Prova a modificare i criteri di ricerca" : "Inizia creando il primo torneo"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Crea il primo torneo
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 ring-2 ring-blue-400/30 group-hover:scale-110 transition-transform">
                    <Trophy className="h-6 w-6 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-blue-300 transition-colors">{tournament.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{tournament.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('it-IT') : "Non definita"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Max {tournament.max_participants} partecipanti</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex-1 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-blue-400/50 hover:bg-blue-500/20"
                >
                  Dettagli
                </button>
                <button
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
                >
                  Gestisci
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tournament Modal - Modernized */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl shadow-2xl shadow-blue-500/20">
            {/* Animated background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute left-1/4 top-10 h-32 w-32 rounded-full blur-3xl bg-blue-400/10 animate-pulse" />
              <div className="absolute right-1/4 bottom-10 h-24 w-24 rounded-full blur-3xl bg-cyan-400/10 animate-pulse" style={{animationDelay: '1s'}} />
            </div>

            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent">Crea un nuovo torneo</h2>
                  <p className="text-sm text-gray-400 mt-1">Configura tutti i dettagli della competizione</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-2 text-gray-300 hover:text-white hover:border-blue-400/50 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form
                onSubmit={handleSubmit((data) => createTournament(data))}
                className="space-y-6"
              >
                {/* Tipo Competizione */}
                <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/5 to-transparent p-5">
                  <label className="block text-sm font-bold text-blue-300 mb-3">Tipo di Competizione</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="group relative flex items-center gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 cursor-pointer hover:border-blue-400/50 hover:bg-blue-500/20 transition-all">
                      <input
                        type="radio"
                        {...register("competition_type")}
                        value="torneo"
                        defaultChecked
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-semibold text-white">Torneo</p>
                        <p className="text-xs text-gray-400">Eliminazione diretta</p>
                      </div>
                    </label>
                    <label className="group relative flex items-center gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 cursor-pointer hover:border-blue-400/50 hover:bg-blue-500/20 transition-all">
                      <input
                        type="radio"
                        {...register("competition_type")}
                        value="campionato"
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-semibold text-white">Campionato</p>
                        <p className="text-xs text-gray-400">Round-robin</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Formato Torneo */}
                <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/5 to-transparent p-5">
                  <label className="block text-sm font-bold text-blue-300 mb-3">Formato</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="group relative flex flex-col items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 cursor-pointer hover:border-blue-400/50 hover:bg-blue-500/20 transition-all">
                      <input
                        type="radio"
                        {...register("format")}
                        value="eliminazione_diretta"
                        defaultChecked
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      <div className="text-center">
                        <p className="font-semibold text-white text-sm">Eliminazione</p>
                        <p className="text-xs text-gray-400">Bracket classico</p>
                      </div>
                    </label>
                    <label className="group relative flex flex-col items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 cursor-pointer hover:border-blue-400/50 hover:bg-blue-500/20 transition-all">
                      <input
                        type="radio"
                        {...register("format")}
                        value="girone_eliminazione"
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      <div className="text-center">
                        <p className="font-semibold text-white text-sm">Gironi + Finale</p>
                        <p className="text-xs text-gray-400">Con fase a gruppi</p>
                      </div>
                    </label>
                    <label className="group relative flex flex-col items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 cursor-pointer hover:border-blue-400/50 hover:bg-blue-500/20 transition-all">
                      <input
                        type="radio"
                        {...register("format")}
                        value="round_robin"
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      <div className="text-center">
                        <p className="font-semibold text-white text-sm">Round Robin</p>
                        <p className="text-xs text-gray-400">Tutti vs tutti</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Info Base */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Titolo</label>
                    <input
                      {...register("title", { required: "Il titolo è obbligatorio" })}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                      placeholder="Es: Torneo Primavera 2025"
                    />
                    {errors.title && <p className="text-sm text-cyan-300 mt-1">{String(errors.title.message)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Categoria</label>
                    <input
                      {...register("category")}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                      placeholder="Es: Open, U16, Doppio"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Descrizione</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                    placeholder="Descrizione del torneo..."
                  />
                </div>

                {/* Date e Partecipanti */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Data Inizio</label>
                    <input
                      type="datetime-local"
                      {...register("start_date", { required: "Data obbligatoria" })}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                    />
                    {errors.start_date && <p className="text-sm text-cyan-300 mt-1">{String(errors.start_date.message)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Data Fine</label>
                    <input
                      type="datetime-local"
                      {...register("end_date")}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Max Partecipanti</label>
                    <select
                      {...register("max_participants", { required: true, valueAsNumber: true })}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="4">4</option>
                      <option value="8">8</option>
                      <option value="16">16</option>
                      <option value="32">32</option>
                      <option value="64">64</option>
                    </select>
                  </div>
                </div>

                {/* Configurazione Match */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Formato Match</label>
                    <select
                      {...register("match_format")}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="best_of_1">Best of 1 set</option>
                      <option value="best_of_3">Best of 3 set</option>
                      <option value="best_of_5">Best of 5 set</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Superficie</label>
                    <select
                      {...register("surface_type")}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="terra">Terra battuta</option>
                      <option value="cemento">Cemento</option>
                      <option value="erba">Erba</option>
                      <option value="sintetico">Sintetico</option>
                      <option value="indoor">Indoor</option>
                    </select>
                  </div>
                </div>

                {/* Quote e Premi */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Quota Iscrizione (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("entry_fee", { valueAsNumber: true })}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Montepremi (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("prize_pool", { valueAsNumber: true })}
                      className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 text-base font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Trophy className="h-5 w-5" />
                  Crea Torneo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
