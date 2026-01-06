"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Swords,
  Trophy,
  Users,
  Calendar,
  Clock,
  Plus,
  Filter,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Edit,
  Trash2,
} from "lucide-react";

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal";
  scheduled_date?: string;
  court?: string;
  match_type?: string;
  challenge_type?: string;
  winner_id?: string;
  created_at: string;
  challenger?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  opponent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  booking?: {
    id: string;
    court: string;
    start_time: string;
    end_time: string;
    status: string;
    manager_confirmed: boolean;
  };
}

interface Stats {
  totalChallenges: number;
  activeChallenges: number;
  completedChallenges: number;
  pendingChallenges: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  ranking: number;
  points: number;
  wins: number;
  losses: number;
  level: string;
  totalMatches: number;
  winRate: number;
}

export default function AdminArenaPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalChallenges: 0,
    activeChallenges: 0,
    completedChallenges: 0,
    pendingChallenges: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedRank, setSelectedRank] = useState<string>("Tutti");

  useEffect(() => {
    loadChallenges();
    loadLeaderboard();
  }, [statusFilter]);

  async function loadChallenges() {
    try {
      setLoading(true);
      
      // Load all challenges
      let url = "/api/arena/challenges";
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
        
        // Calculate stats
        const total = data.challenges?.length || 0;
        const active = data.challenges?.filter((c: Challenge) => 
          c.status === "accepted" || c.status === "pending" || c.status === "counter_proposal"
        ).length || 0;
        const completed = data.challenges?.filter((c: Challenge) => c.status === "completed").length || 0;
        const pending = data.challenges?.filter((c: Challenge) => c.status === "pending").length || 0;

        setStats({
          totalChallenges: total,
          activeChallenges: active,
          completedChallenges: completed,
          pendingChallenges: pending,
        });
      }
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard() {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch("/api/arena/stats");
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }

  async function handleDeleteChallenge(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa sfida?")) return;

    try {
      const response = await fetch("/api/arena/challenges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: id }),
      });

      if (response.ok) {
        loadChallenges();
      }
    } catch (error) {
      console.error("Error deleting challenge:", error);
    }
  }

  async function handleResetSeason() {
    if (!confirm("⚠️ ATTENZIONE: Questa azione eliminerà TUTTE le sfide e resetterà le statistiche Arena di TUTTI gli utenti. Sei sicuro di voler procedere?")) {
      return;
    }

    if (!confirm("Conferma ancora una volta: vuoi davvero resettare l'intera stagione Arena? Questa azione NON può essere annullata!")) {
      return;
    }

    try {
      setResetting(true);
      const response = await fetch("/api/arena/reset-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        alert("✅ Stagione resettata con successo!");
        setShowResetModal(false);
        loadChallenges();
      } else {
        const error = await response.json();
        alert(`❌ Errore: ${error.error || "Impossibile resettare la stagione"}`);
      }
    } catch (error) {
      console.error("Error resetting season:", error);
      alert("❌ Errore durante il reset della stagione");
    } finally {
      setResetting(false);
    }
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "oro":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      case "argento":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      case "bronzo":
        return "bg-orange-100 text-orange-700 border border-orange-200";
      case "platino":
        return "bg-cyan-100 text-cyan-700 border border-cyan-200";
      case "diamante":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      default:
        return "bg-blue-100 text-blue-700 border border-blue-200";
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: "In Attesa", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Accettata", className: "bg-green-100 text-green-800" },
      declined: { label: "Rifiutata", className: "bg-red-100 text-red-800" },
      completed: { label: "Completata", className: "bg-blue-100 text-blue-800" },
      cancelled: { label: "Cancellata", className: "bg-gray-100 text-gray-800" },
      counter_proposal: { label: "Controproposta", className: "bg-purple-100 text-purple-800" },
    };

    const badge = badges[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Swords className="h-8 w-8 text-orange-500" />
            Gestione Arena
          </h1>
          <p className="text-gray-600 mt-1">
            Gestisci tutte le sfide e le statistiche della stagione Arena
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Stagione
          </button>
          <button
            onClick={() => router.push("/dashboard/admin/arena/create-challenge")}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crea Sfida
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Totale Sfide</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalChallenges}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Swords className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sfide Attive</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeChallenges}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Trophy className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedChallenges}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Attesa</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingChallenges}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tutte
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === "pending"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                In Attesa
              </button>
              <button
                onClick={() => setStatusFilter("accepted")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === "accepted"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Accettate
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === "completed"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Completate
              </button>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        <div>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Swords className="h-5 w-5 text-orange-500" />
              Tutte le Sfide
            </h2>
          </div>

              {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Caricamento sfide...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="p-12 text-center">
            <Swords className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna sfida trovata</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Players */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden">
                          {challenge.challenger?.avatar_url ? (
                            <img
                              src={challenge.challenger.avatar_url}
                              alt={challenge.challenger.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-frozen-700">
                              {challenge.challenger?.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">
                          {challenge.challenger?.full_name}
                        </span>
                      </div>

                      <Swords className="h-5 w-5 text-orange-500" />

                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {challenge.opponent?.avatar_url ? (
                            <img
                              src={challenge.opponent.avatar_url}
                              alt={challenge.opponent.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-gray-700">
                              {challenge.opponent?.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">
                          {challenge.opponent?.full_name}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Stato:</span>
                        {getStatusBadge(challenge.status)}
                      </div>
                      {challenge.match_type && (
                        <>
                          <span>•</span>
                          <span>{challenge.match_type === "singles" ? "Singolo" : "Doppio"}</span>
                        </>
                      )}
                      {challenge.challenge_type && (
                        <>
                          <span>•</span>
                          <span>{challenge.challenge_type === "ranked" ? "Classificata" : "Amichevole"}</span>
                        </>
                      )}
                      {challenge.winner_id && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-green-600">
                            Vincitore: {challenge.winner_id === challenge.challenger_id
                              ? challenge.challenger?.full_name
                              : challenge.opponent?.full_name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Booking Info */}
                    {challenge.booking && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{challenge.booking.court}</span>
                        {!challenge.booking.manager_confirmed && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                              Prenotazione da confermare
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/admin/arena/challenge/${challenge.id}`)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Visualizza dettagli"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteChallenge(challenge.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Elimina sfida"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classifica Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Classifica Arena
          </h2>
        </div>

        {/* Rank Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {["Tutti", "Bronzo", "Argento", "Oro", "Platino", "Diamante"].map((rank) => {
            const rankLabels: Record<string, string> = {
              "Tutti": "🏆 Tutti",
              "Bronzo": "🥉 Bronzo",
              "Argento": "🥈 Argento",
              "Oro": "🥇 Oro",
              "Platino": "💎 Platino",
              "Diamante": "💠 Diamante"
            };
            
            return (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  selectedRank === rank
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {rankLabels[rank]}
              </button>
            );
          })}
        </div>

        {loadingLeaderboard ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Caricamento classifica...</p>
          </div>
        ) : (() => {
          const filteredLeaderboard = selectedRank === "Tutti" 
            ? leaderboard 
            : leaderboard.filter(entry => entry.level === selectedRank);
          
          return filteredLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedRank === "Tutti" 
                  ? "Nessun giocatore in classifica" 
                  : `Nessun giocatore nel livello ${selectedRank}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeaderboard.map((entry, index) => {
                const displayPosition = selectedRank === "Tutti" ? entry.ranking : (index + 1);
                
                return (
                  <div
                    key={entry.userId}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                      {index < 3 ? (
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0
                              ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                              : index === 1
                              ? "bg-gradient-to-br from-gray-300 to-gray-400"
                              : "bg-gradient-to-br from-orange-400 to-orange-500"
                          }`}
                        >
                          {displayPosition}
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-gray-400">
                          {displayPosition}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {entry.avatar ? (
                            <img
                              src={entry.avatar}
                              alt={entry.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-orange-700 text-lg">
                              {entry.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 truncate">
                          {entry.name || "N/A"}
                        </p>
                        {selectedRank === "Tutti" && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelColor(entry.level)}`}>
                            {entry.level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {entry.points ?? 0} punti
                        </span>
                        <span>
                          {entry.wins ?? 0}V - {entry.losses ?? 0}S
                        </span>
                        {entry.winRate !== undefined && (
                          <span className="text-xs">
                            {entry.winRate.toFixed(0)}% vittorie
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{entry.points ?? 0}</p>
                        <p className="text-xs text-gray-600">Punti</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900">{entry.totalMatches ?? 0}</p>
                        <p className="text-xs text-gray-600">Partite</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-600">{entry.wins ?? 0}</p>
                        <p className="text-xs text-gray-600">Vittorie</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-red-600">{entry.losses ?? 0}</p>
                        <p className="text-xs text-gray-600">Sconfitte</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-blue-600">{entry.winRate?.toFixed(0) ?? 0}%</p>
                        <p className="text-xs text-gray-600">Win Rate</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      </div>

      {/* Reset Season Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reset Stagione Arena</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-700">
                Questa azione eliminerà <strong>TUTTE</strong> le sfide Arena e resetterà le statistiche di <strong>TUTTI</strong> gli utenti.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Verranno eliminate:
                </p>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Tutte le sfide (pending, accepted, completed)</li>
                  <li>Tutte le statistiche Arena degli utenti</li>
                  <li>Tutta la classifica</li>
                </ul>
              </div>
              <p className="text-red-600 font-semibold">
                Questa azione NON può essere annullata!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleResetSeason}
                disabled={resetting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Conferma Reset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
