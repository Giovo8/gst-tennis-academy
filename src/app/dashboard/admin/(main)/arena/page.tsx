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
  Loader2,
  Search,
  BarChart3,
  Shield,
  Star,
  History,
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
  const [search, setSearch] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedRank, setSelectedRank] = useState<string>("Tutti");
  const [activeTab, setActiveTab] = useState<"gestione" | "storico" | "statistiche" | "info">("gestione");

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
        const mappedLeaderboard = (data.leaderboard || []).map((entry: any, index: number) => ({
          userId: entry.user_id,
          name: entry.profile?.full_name || "N/A",
          avatar: entry.profile?.avatar_url,
          ranking: index + 1,
          points: entry.points || 0,
          wins: entry.wins || 0,
          losses: entry.losses || 0,
          level: entry.level || "Bronzo",
          totalMatches: (entry.wins || 0) + (entry.losses || 0),
          winRate: entry.wins > 0 || entry.losses > 0 
            ? (entry.wins / ((entry.wins || 0) + (entry.losses || 0))) * 100 
            : 0,
        }));
        setLeaderboard(mappedLeaderboard);
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "In Attesa",
      accepted: "Accettata",
      declined: "Rifiutata",
      completed: "Completata",
      cancelled: "Cancellata",
      counter_proposal: "Controproposta",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Gestione Arena</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Gestisci tutte le sfide e le statistiche della stagione Arena
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveTab("gestione");
              router.push("/dashboard/admin/arena/create-challenge");
            }}
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crea Sfida
          </button>
          <button
            onClick={() => setActiveTab("storico")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "storico"
                ? "text-white bg-secondary shadow-lg"
                : "text-secondary bg-white border border-gray-300 hover:border-secondary"
            }`}
          >
            <History className="h-4 w-4" />
            Storico
          </button>
          <button
            onClick={() => setActiveTab("statistiche")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "statistiche"
                ? "text-white bg-secondary shadow-lg"
                : "text-secondary bg-white border border-gray-300 hover:border-secondary"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Statistiche
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "info"
                ? "text-white bg-secondary shadow-lg"
                : "text-secondary bg-white border border-gray-300 hover:border-secondary"
            }`}
          >
            <Shield className="h-4 w-4" />
            Info
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Reset Stagione"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content - Conditional Rendering based on activeTab */}
      {activeTab === "gestione" && (
        <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome giocatore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              statusFilter === "all"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              statusFilter === "pending"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            In Attesa
          </button>
          <button
            onClick={() => setStatusFilter("accepted")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              statusFilter === "accepted"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Accettate
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              statusFilter === "completed"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Completate
          </button>
        </div>
      </div>

      {/* Challenges List */}
      <div className="bg-white rounded-lg">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="mt-4 text-secondary/70">Caricamento sfide...</p>
          </div>
        ) : (() => {
          const filteredChallenges = challenges.filter((challenge) => {
            const matchesSearch =
              !search ||
              challenge.challenger?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
              challenge.opponent?.full_name?.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
          });

          return filteredChallenges.length === 0 ? (
          <div className="text-center py-20 rounded-xl bg-white">
            <Swords className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida trovata</h3>
            <p className="text-secondary/70">Crea la prima sfida per iniziare</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChallenges.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => router.push(`/dashboard/admin/arena/challenge/${challenge.id}`)}
                className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Players */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-secondary text-white border-0 flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
                          {challenge.challenger?.avatar_url ? (
                            <img
                              src={challenge.challenger.avatar_url}
                              alt={challenge.challenger.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {challenge.challenger?.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-secondary">
                          {challenge.challenger?.full_name}
                        </span>
                      </div>

                      <Swords className="h-5 w-5 text-secondary/60" />

                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-secondary text-white border-0 flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
                          {challenge.opponent?.avatar_url ? (
                            <img
                              src={challenge.opponent.avatar_url}
                              alt={challenge.opponent.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {challenge.opponent?.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-secondary">
                          {challenge.opponent?.full_name}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-secondary/70">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Stato:</span>
                        <span>{getStatusLabel(challenge.status)}</span>
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
                      <div className="flex items-center gap-4 text-sm text-secondary/70">
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
                            <span className="text-amber-700 font-medium">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChallenge(challenge.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-all"
                      title="Elimina sfida"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
        })()}
      </div>

      {/* Classifica Section */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-secondary">Classifica Arena</h2>
        </div>

        {/* Rank Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {["Tutti", "Bronzo", "Argento", "Oro", "Platino", "Diamante"].map((rank) => {
            return (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedRank === rank
                    ? "text-white bg-secondary"
                    : "bg-white text-secondary/70 hover:bg-secondary/5"
                }`}
              >
                {rank}
              </button>
            );
          })}
        </div>

        {loadingLeaderboard ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="mt-4 text-secondary/70">Caricamento classifica...</p>
          </div>
        ) : (() => {
          const filteredLeaderboard = selectedRank === "Tutti" 
            ? leaderboard 
            : leaderboard.filter(entry => entry.level === selectedRank);
          
          return filteredLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
              <p className="text-secondary/70">
                {selectedRank === "Tutti" 
                  ? "Nessun giocatore in classifica" 
                  : `Nessun giocatore nel livello ${selectedRank}`}
              </p>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="bg-white rounded-lg px-5 py-3 mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 flex-shrink-0 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Giocatore</div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Punti</div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Partite</div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Vittorie</div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Sconfitte</div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Win Rate</div>
                  </div>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2">
                {filteredLeaderboard.map((entry, index) => {
                  const displayPosition = selectedRank === "Tutti" ? entry.ranking : (index + 1);
                  
                  // Determina il colore del bordo in base alla posizione
                  let borderColor = "border-secondary";
                  if (displayPosition === 1) {
                    borderColor = "border-yellow-500";
                  } else if (displayPosition === 2) {
                    borderColor = "border-gray-400";
                  } else if (displayPosition === 3) {
                    borderColor = "border-orange-500";
                  }
                  
                  return (
                    <div
                      key={`${entry.userId}-${index}`}
                      className={`bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 ${borderColor}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Position */}
                        <div className="w-12 flex-shrink-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-secondary">
                            {displayPosition}
                          </span>
                        </div>

                        {/* Player */}
                        <div className="flex-1 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary text-white border-0 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                            {entry.avatar ? (
                              <img
                                src={entry.avatar}
                                alt={entry.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {entry.name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-secondary">
                              {entry.name || "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Points */}
                        <div className="w-24 flex-shrink-0 text-center">
                          <div className="text-lg font-bold text-secondary">{entry.points ?? 0}</div>
                        </div>

                        {/* Total Matches */}
                        <div className="w-24 flex-shrink-0 text-center">
                          <div className="text-sm font-semibold text-secondary">{entry.totalMatches ?? 0}</div>
                        </div>

                        {/* Wins */}
                        <div className="w-24 flex-shrink-0 text-center">
                          <div className="text-sm font-semibold text-secondary">{entry.wins ?? 0}</div>
                        </div>

                        {/* Losses */}
                        <div className="w-24 flex-shrink-0 text-center">
                          <div className="text-sm font-semibold text-secondary">{entry.losses ?? 0}</div>
                        </div>

                        {/* Win Rate */}
                        <div className="w-24 flex-shrink-0 text-center">
                          <div className="text-sm font-semibold text-secondary">{entry.winRate?.toFixed(0) ?? 0}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>
      </>
      )}

      {/* Storico Tab */}
      {activeTab === "storico" && (
        <div className="space-y-4">
          {/* Search Bar for Storico */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome giocatore nello storico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 border border-gray-200"
            />
          </div>

          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2">
              <History className="h-6 w-6" />
              Storico Completo Sfide
            </h2>
            <p className="text-secondary/70 mb-6">
              Visualizza tutte le sfide Arena in ordine cronologico
            </p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-secondary" />
                <p className="mt-4 text-secondary/70">Caricamento storico...</p>
              </div>
            ) : challenges.length === 0 ? (
              <div className="text-center py-20">
                <Swords className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
                <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida trovata</h3>
                <p className="text-secondary/70">Non ci sono sfide nello storico</p>
              </div>
            ) : (() => {
              const filteredChallenges = challenges.filter((challenge) => {
                const matchesSearch =
                  !search ||
                  challenge.challenger?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                  challenge.opponent?.full_name?.toLowerCase().includes(search.toLowerCase());
                return matchesSearch;
              });

              return filteredChallenges.length === 0 ? (
                <div className="text-center py-20">
                  <Search className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
                  <h3 className="text-xl font-semibold text-secondary mb-2">Nessun risultato</h3>
                  <p className="text-secondary/70">Prova con un altro termine di ricerca</p>
                </div>
              ) : (
              <div className="space-y-3">
                {filteredChallenges.map((challenge) => {
                  const isCompleted = challenge.status === "completed";
                  const isCancelled = challenge.status === "cancelled" || challenge.status === "declined";
                  
                  return (
                    <div
                      key={challenge.id}
                      onClick={() => router.push(`/dashboard/admin/arena/challenge/${challenge.id}`)}
                      className="bg-white rounded-lg px-5 py-4 hover:shadow-md transition-all border border-gray-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Players */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                                {challenge.challenger?.avatar_url ? (
                                  <img
                                    src={challenge.challenger.avatar_url}
                                    alt={challenge.challenger.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {challenge.challenger?.full_name?.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-secondary">
                                  {challenge.challenger?.full_name || "N/A"}
                                </div>
                              </div>
                            </div>

                            <Swords className="h-4 w-4 text-secondary/40" />

                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                                {challenge.opponent?.avatar_url ? (
                                  <img
                                    src={challenge.opponent.avatar_url}
                                    alt={challenge.opponent.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {challenge.opponent?.full_name?.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-secondary">
                                  {challenge.opponent?.full_name || "N/A"}
                                </div>
                              </div>
                            </div>

                            {isCompleted && challenge.winner_id && (
                              <div className="flex items-center gap-1 ml-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-xs font-semibold text-secondary">
                                  {challenge.winner_id === challenge.challenger_id
                                    ? challenge.challenger?.full_name
                                    : challenge.opponent?.full_name}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-secondary/60">
                            {challenge.scheduled_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(challenge.scheduled_date).toLocaleDateString("it-IT", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            )}
                            {challenge.booking && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-3.5 w-3.5" />
                                  {challenge.booking.court}
                                </div>
                              </>
                            )}
                            {challenge.match_type && (
                              <div className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs font-medium">
                                {challenge.match_type === "singolo" ? "Singolo" : "Doppio"}
                              </div>
                            )}
                            {challenge.challenge_type && (
                              <div className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs font-medium">
                                {challenge.challenge_type === "ranked" ? "Classificata" : "Amichevole"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {getStatusBadge(challenge.status)}
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
      )}

      {/* Statistiche Tab */}
      {activeTab === "statistiche" && (
        <div className="bg-white rounded-xl p-8 text-center">
          <BarChart3 className="h-16 w-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Statistiche Dettagliate</h3>
          <p className="text-secondary/70">
            Sezione in sviluppo - Visualizza statistiche avanzate, grafici di performance e report completi
          </p>
        </div>
      )}

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="bg-white rounded-xl p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center mb-8">
              <Shield className="h-16 w-16 mx-auto text-secondary/20 mb-4" />
              <h2 className="text-2xl font-bold text-secondary mb-2">Informazioni Arena</h2>
              <p className="text-secondary/70">Regole, livelli e come funziona il sistema Arena</p>
            </div>

            {/* Come Funziona */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Come Funziona l'Arena
              </h3>
              <div className="bg-secondary/5 rounded-lg p-6 space-y-4">
                <p className="text-secondary/80">
                  L'Arena è un sistema competitivo dove gli atleti possono sfidarsi a vicenda per scalare la classifica e guadagnare punti.
                </p>
                <ul className="space-y-2 text-secondary/80">
                  <li className="flex items-start gap-2">
                    <span className="text-secondary font-bold mt-0.5">•</span>
                    <span><strong>Lancia Sfide:</strong> Sfida altri giocatori prenotando un campo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary font-bold mt-0.5">•</span>
                    <span><strong>Vinci Punti:</strong> Ottieni punti per ogni vittoria e scala la classifica</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary font-bold mt-0.5">•</span>
                    <span><strong>Raggiungi Livelli:</strong> Accumula punti per sbloccare livelli superiori</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Livelli */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Livelli Arena
              </h3>
              <div className="grid gap-3">
                {[
                  { name: "Bronzo", points: "0-99 punti", color: "from-amber-700 to-amber-600" },
                  { name: "Argento", points: "100-299 punti", color: "from-gray-400 to-gray-500" },
                  { name: "Oro", points: "300-599 punti", color: "from-yellow-400 to-yellow-500" },
                  { name: "Platino", points: "600-999 punti", color: "from-blue-400 to-blue-500" },
                  { name: "Diamante", points: "1000+ punti", color: "from-purple-400 to-purple-500" },
                ].map((level) => (
                  <div key={level.name} className="flex items-center gap-4 bg-secondary/5 rounded-lg p-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${level.color} flex items-center justify-center`}>
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-secondary">{level.name}</div>
                      <div className="text-sm text-secondary/70">{level.points}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sistema Punti */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Star className="h-5 w-5" />
                Sistema Punti
              </h3>
              <div className="bg-secondary/5 rounded-lg p-6">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary/80">Vittoria Classificata</span>
                    <span className="font-bold text-green-600">+30 punti</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary/80">Vittoria Amichevole</span>
                    <span className="font-bold text-green-600">+10 punti</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary/80">Sconfitta</span>
                    <span className="font-bold text-secondary/60">0 punti</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-blue-900 mb-2">💡 Nota</h4>
              <p className="text-sm text-blue-800">
                Le sfide amichevoli permettono di allenarsi senza rischiare la classifica, mentre le sfide classificate influenzano direttamente il tuo ranking nell'Arena.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Season Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary">Reset Stagione Arena</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-secondary/80">
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
                className="flex-1 px-4 py-2 bg-secondary/10 text-secondary rounded-md hover:bg-secondary/20 transition-all disabled:opacity-50"
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
