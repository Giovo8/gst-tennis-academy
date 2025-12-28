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
  starts_at: string | null;
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
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-12 bg-[#021627] text-white">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Gestione Tornei
        </p>
        <h1 className="text-4xl font-bold text-white">Tornei</h1>
        <p className="text-sm text-muted">Crea e gestisci i tornei</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Totale"
          value={tournaments.length}
          icon={<Trophy className="h-8 w-8 text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="Attivi"
          value={tournaments.filter((t) => t.is_active).length}
          icon={<CheckCircle className="h-8 w-8 text-green-400" />}
          color="green"
        />
        <StatCard
          title="Conclusi"
          value={tournaments.filter((t) => !t.is_active).length}
          icon={<Flag className="h-8 w-8 text-purple-400" />}
          color="purple"
        />
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-2" />
          <input
            type="text"
            placeholder="Cerca per titolo o descrizione..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[#1a3d5c]/60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0] hover:shadow-lg hover:shadow-accent/20"
        >
          <Plus className="h-5 w-5" />
          Crea Torneo
        </button>
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
            <p className="text-sm text-muted">Caricamento tornei...</p>
          </div>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60">
          <Trophy className="h-12 w-12 text-muted-2 mx-auto mb-4" />
          <p className="text-lg font-medium text-white mb-2">Nessun torneo trovato</p>
          <p className="text-sm text-muted">
            {searchQuery ? "Prova a modificare i criteri di ricerca" : "Inizia creando il primo torneo"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 ring-2 ring-accent/30">
                    <Trophy className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{tournament.title}</p>
                    <p className="text-xs text-muted truncate max-w-[140px]">{tournament.description}</p>
                  </div>
                </div>
                <button
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0]"
                >
                  Modifica
                </button>
              </div>
              <div className="text-sm text-muted">Data: {tournament.starts_at ? new Date(tournament.starts_at).toLocaleString() : "Non definita"}</div>
              <div className="text-sm text-muted">Partecipanti massimi: {tournament.max_participants}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-lg rounded-xl bg-[#1a3d5c] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Crea un nuovo torneo</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-2 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={handleSubmit((data) => createTournament(data))}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-white">Titolo</label>
                <input
                  {...register("title", { required: "Il titolo è obbligatorio" })}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0f1e2d] p-2 text-sm text-white"
                  placeholder="Inserisci il titolo del torneo"
                />
                {errors.title && <p className="text-sm text-red-400">{String(errors.title.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white">Descrizione</label>
                <textarea
                  {...register("description", { required: "La descrizione è obbligatoria" })}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0f1e2d] p-2 text-sm text-white"
                  placeholder="Inserisci una descrizione del torneo"
                />
                {errors.description && <p className="text-sm text-red-400">{String(errors.description.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white">Data di inizio</label>
                <input
                  type="datetime-local"
                  {...register("starts_at", { required: "La data di inizio è obbligatoria" })}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0f1e2d] p-2 text-sm text-white"
                />
                {errors.starts_at && <p className="text-sm text-red-400">{String(errors.starts_at.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white">Partecipanti massimi</label>
                <input
                  type="number"
                  {...register("max_participants", {
                    required: "Il numero massimo di partecipanti è obbligatorio",
                    valueAsNumber: true,
                  })}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0f1e2d] p-2 text-sm text-white"
                  placeholder="Inserisci il numero massimo di partecipanti"
                />
                {errors.max_participants && <p className="text-sm text-red-400">{String(errors.max_participants.message)}</p>}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0]"
              >
                Crea Torneo
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
