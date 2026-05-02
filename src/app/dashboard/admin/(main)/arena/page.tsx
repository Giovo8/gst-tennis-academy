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
  SlidersHorizontal,
  RefreshCw,
  Check,
  Edit,
  Trash2,
  Loader2,
  Search,
  Settings,
  Target,
  Handshake,
  MoreVertical,
  Eye,
} from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal" | "awaiting_score";
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
  const DEFAULT_STATUS_FILTER = "active";
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
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState(false);
  const [selectedRank, setSelectedRank] = useState<"Tutti">("Tutti");
  const [activeTab, setActiveTab] = useState<"gestione" | "info">("gestione");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  function normalizeArenaRank(level: string | null | undefined): "Bronzo" | "Argento" | "Oro" {
    const normalized = String(level || "").trim().toLowerCase();
    if (normalized === "argento") return "Argento";
    if (normalized === "oro" || normalized === "platino" || normalized === "diamante") return "Oro";
    return "Bronzo";
  }

  useEffect(() => {
    loadChallenges();
    loadLeaderboard();
  }, [statusFilter, activeTab]);

  async function loadChallenges() {
    try {
      setLoading(true);

      // Load all challenges
      const url = "/api/arena/challenges";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const allChallenges = data.challenges || [];

        // Filtra sfide in base alla data e allo stato
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const filteredChallenges = allChallenges.filter((c: Challenge) => {
          // Se ha una data di prenotazione
          if (c.booking?.start_time) {
            const challengeDate = new Date(c.booking.start_time);
            const challengeDay = new Date(challengeDate.getFullYear(), challengeDate.getMonth(), challengeDate.getDate());

            // Se la data è passata e lo stato è ancora pending o accepted, mostra solo nello storico
            if (challengeDay < today && (c.status === "pending" || c.status === "counter_proposal")) {
              return statusFilter === "all";
            }
          }

          // Mostra tutte le sfide nella gestione
          return activeTab === "gestione";
        });

        setChallenges(filteredChallenges);

        // Calculate stats (su tutte le sfide, non filtrate)
        const total = allChallenges.length || 0;
        const active = allChallenges.filter((c: Challenge) =>
          c.status === "accepted" || c.status === "pending" || c.status === "counter_proposal" || c.status === "awaiting_score"
        ).length || 0;
        const completed = allChallenges.filter((c: Challenge) => c.status === "completed").length || 0;
        const pending = allChallenges.filter((c: Challenge) => c.status === "pending").length || 0;

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

  async function handleCompleteForTest(challengeId: string, challengerId: string) {
    if (!confirm("Impostare questa sfida in Attesa Punteggio? (solo test)")) return;

    try {
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, status: "awaiting_score" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.error("Error setting awaiting_score:", payload);
        return;
      }

      setOpenMenuId(null);
      await loadChallenges();
    } catch (error) {
      console.error("Error completing challenge:", error);
    }
  }

  async function handleUpdateChallengeStatus(challengeId: string, status: "accepted" | "declined" | "cancelled") {
    try {
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          status,
        }),
      });

      if (response.ok) {
        setOpenMenuId(null);
        await loadChallenges();
      }
    } catch (error) {
      console.error("Error updating challenge status:", error);
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
      pending: { label: "Da Confermare", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Confermata", className: "bg-green-100 text-green-800" },
      declined: { label: "Rifiutata", className: "bg-red-100 text-red-800" },
      completed: { label: "Completata", className: "bg-blue-100 text-blue-800" },
      cancelled: { label: "Annullata", className: "bg-gray-100 text-gray-800" },
      counter_proposal: { label: "Controproposta", className: "bg-purple-100 text-purple-800" },
      awaiting_score: { label: "Attesa Punteggio", className: "bg-orange-100 text-orange-800" },
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
      pending: "Da Confermare",
      accepted: "Confermata",
      declined: "Rifiutata",
      completed: "Completata",
      cancelled: "Annullata",
      counter_proposal: "Controproposta",
      awaiting_score: "Attesa Punteggio",
    };
    return labels[status] || status;
  };

  const matchesStatusFilter = (status: Challenge["status"]) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return status === "pending" || status === "accepted" || status === "counter_proposal" || status === "awaiting_score";
    if (statusFilter === "inactive") return status === "declined" || status === "cancelled";
    if (statusFilter === "pending") return status === "pending" || status === "counter_proposal";
    if (statusFilter === "awaiting_score") return status === "awaiting_score";
    return status === statusFilter;
  };

  const getChallengeSortTimestamp = (challenge: Challenge) => {
    const referenceDate = challenge.booking?.start_time || challenge.scheduled_date || challenge.created_at;
    return new Date(referenceDate).getTime();
  };

  const hasActiveFilters = statusFilter !== DEFAULT_STATUS_FILTER || selectedRank !== "Tutti";

  const renderSearchWithFilter = (placeholder: string) => (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder={placeholder}
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
        aria-label="Apri filtri Arena"
        title="Filtri"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary">Gestione Arena</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab("gestione");
              router.push("/dashboard/admin/arena/create-challenge");
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crea Sfida
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "info" ? "gestione" : "info")}
            className={`p-2.5 rounded-md transition-all ${
              activeTab === "info"
                ? "text-white bg-secondary"
                : "text-secondary/70 bg-white border border-gray-200 hover:bg-secondary hover:text-white"
            }`}
            title="Info"
          >
            <Settings className="h-5 w-5" />
          </button>

        </div>
      </div>

      {/* Main Content - Conditional Rendering based on activeTab */}
      {activeTab === "gestione" && (
        <>
      {/* Search */}
      {renderSearchWithFilter("Cerca per nome giocatore...")}

      {/* Challenges List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="mt-4 text-secondary/60">Caricamento sfide...</p>
          </div>
        ) : (() => {
          const filteredChallenges = challenges.filter((challenge) => {
            const matchesSearch =
              !search ||
              challenge.challenger?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
              challenge.opponent?.full_name?.toLowerCase().includes(search.toLowerCase());
            return matchesSearch && matchesStatusFilter(challenge.status);
          }).sort((left, right) => getChallengeSortTimestamp(left) - getChallengeSortTimestamp(right));

          return filteredChallenges.length === 0 ? (
          <div className="text-center py-20 rounded-md bg-white">
            <Swords className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida trovata</h3>
            <p className="text-secondary/60">Crea la prima sfida per iniziare</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChallenges.map((challenge) => {
              const start = challenge.booking ? new Date(challenge.booking.start_time) : null;
              const dateLabel = start
                ? start.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
                : "Data da definire";
              const timeLabel = start
                ? start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
                : "--:--";
              const courtLabel = challenge.booking?.court || "Campo da definire";

              const typeColor =
                challenge.challenge_type === "ranked"
                  ? "var(--secondary)"
                  : "#023047";

              const isPending = challenge.status === "pending";
              const isAwaitingDecision = challenge.status === "pending" || challenge.status === "counter_proposal";
              const isConfirmed = challenge.status === "accepted";
              const isDeclined = challenge.status === "declined" || challenge.status === "cancelled";
              const isCancelledOnly = challenge.status === "cancelled";
              const canCancel = challenge.status !== "cancelled" && challenge.status !== "declined" && challenge.status !== "completed";
              const cardBg = isDeclined ? "#9ca3af" : isPending ? "#ffffff" : typeColor;
              const iconBadgeBg = isPending
                ? typeColor
                : isConfirmed || isDeclined
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.15)";
              const primaryTextColor = isPending ? "var(--secondary)" : "#ffffff";
              const iconColor = isPending ? "#ffffff" : primaryTextColor;
              const secondaryTextColor = isPending ? "rgba(3, 72, 99, 0.75)" : "rgba(255, 255, 255, 0.7)";
              const menuButtonClassName = isPending
                ? "inline-flex items-center justify-center p-1.5 rounded hover:bg-black/5 text-secondary/60 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                : "inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8";

              const winnerLabel = challenge.winner_id
                ? challenge.winner_id === challenge.challenger_id
                  ? challenge.challenger?.full_name
                  : challenge.opponent?.full_name
                : null;

              return (
                <div
                  key={challenge.id}
                  onClick={() => router.push(`/dashboard/admin/arena/challenge/${challenge.id}`)}
                  className={`rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity ${
                    isPending ? "border border-gray-200" : ""
                  }`}
                  style={{ background: cardBg }}
                >
                  <div className="flex items-center gap-4 py-3 px-3">
                    <div
                      className="flex items-center justify-center rounded-lg w-11 h-11 flex-shrink-0"
                      style={{ background: iconBadgeBg }}
                    >
                      {challenge.challenge_type === "ranked" ? (
                        <Target className="h-5 w-5" strokeWidth={2} style={{ color: iconColor }} />
                      ) : (
                        <Handshake className="h-5 w-5" strokeWidth={2} style={{ color: iconColor }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: primaryTextColor }}>
                        {challenge.challenger?.full_name || "Sfidante"}, {challenge.opponent?.full_name || "Avversario"}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: secondaryTextColor }}>
                        {dateLabel} · {timeLabel} · {courtLabel}
                      </p>
                    </div>

                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === challenge.id ? null : challenge.id);
                        }}
                        className={menuButtonClassName}
                        aria-label="Azioni"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === challenge.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                          <div className="absolute right-0 top-9 z-30 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                router.push(`/dashboard/admin/arena/challenge/${challenge.id}`);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizza
                            </button>
                            {isAwaitingDecision && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleUpdateChallengeStatus(challenge.id, "accepted");
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Accetta
                                </button>
                              </>
                            )}
                            {(challenge.status === "accepted" || challenge.status === "awaiting_score") && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCompleteForTest(challenge.id, challenge.challenger_id);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-[#0b4f6c] hover:bg-[#0b4f6c]/10 transition-colors w-full"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Attesa Punteggio (test)
                              </button>
                            )}
                            {!isCancelledOnly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!canCancel) return;
                                  handleUpdateChallengeStatus(challenge.id, "cancelled");
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors w-full ${
                                  canCancel
                                    ? "text-secondary hover:bg-gray-50"
                                    : "text-secondary/40 cursor-not-allowed"
                                }`}
                                disabled={!canCancel}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Annulla
                              </button>
                            )}
                            {!isCancelledOnly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  router.push(`/dashboard/admin/arena/challenge/${challenge.id}/edit`);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Modifica
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDeleteChallenge(challenge.id);
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
        );
        })()}

      {/* Classifica Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Classifica Arena</h2>
        </div>

        <div className="p-6">
        {loadingLeaderboard ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="mt-4 text-secondary/70">Caricamento classifica...</p>
          </div>
        ) : (() => {
          return leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
              <p className="text-secondary/70">Nessun giocatore in classifica</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {leaderboard.map((entry, index) => {
                const displayPosition = entry.ranking;

                let rankBg = "var(--secondary)";
                if (displayPosition === 1) rankBg = "var(--secondary-hover)";
                else if (displayPosition === 2) rankBg = "#033247";
                else if (displayPosition === 3) rankBg = "#033d56";

                return (
                  <li key={`${entry.userId}-${index}`}>
                    <div
                      className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
                      style={{ background: rankBg }}
                    >
                      <div className="flex items-center justify-center bg-white/10 rounded-lg w-10 h-10 flex-shrink-0">
                        <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">{displayPosition}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{entry.name || "N/A"}</p>
                      </div>

                      <span className="text-sm font-bold text-white flex-shrink-0 tabular-nums">{entry.points ?? 0}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
        </div>
      </div>
      </>
      )}



      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Sistema di Punteggio</h2>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div className="space-y-4">
                  {/* Best-of-1 */}
                  <div>
                    <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-2">Set singolo</p>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-secondary">Risultato</th>
                            <th className="px-4 py-2 text-center font-semibold text-secondary">Vincitore</th>
                            <th className="px-4 py-2 text-center font-semibold text-secondary/60">Perdente</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          <tr>
                            <td className="px-4 py-2 font-medium text-secondary">1 – 0</td>
                              <td className="px-4 py-2 text-center font-bold text-secondary">+30 pt</td>
                            <td className="px-4 py-2 text-center text-secondary/60">+0 pt</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Best-of-3 */}
                  <div>
                    <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-2">Al meglio dei 3 set</p>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-secondary">Risultato</th>
                            <th className="px-4 py-2 text-center font-semibold text-secondary">Vincitore</th>
                            <th className="px-4 py-2 text-center font-semibold text-secondary/60">Perdente</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          <tr>
                            <td className="px-4 py-2 font-medium text-secondary">2 – 0</td>
                            <td className="px-4 py-2 text-center font-bold text-secondary">+30 pt</td>
                            <td className="px-4 py-2 text-center text-secondary/60">+0 pt</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-medium text-secondary">2 – 1</td>
                            <td className="px-4 py-2 text-center font-bold text-secondary">+20 pt</td>
                            <td className="px-4 py-2 text-center text-secondary/60">+10 pt</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Best-of-5 */}
                  <div>
                    <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-2">Al meglio dei 5 set</p>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-secondary">Risultato</th>
                            <th className="px-4 py-2 text-center font-semibold text-secondary">Vincitore</th>
                            <th className="px-4 py-2 text-center font-semibold text-secondary/60">Perdente</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          <tr>
                            <td className="px-4 py-2 font-medium text-secondary">3 – 0</td>
                            <td className="px-4 py-2 text-center font-bold text-secondary">+30 pt</td>
                            <td className="px-4 py-2 text-center text-secondary/60">+0 pt</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-medium text-secondary">3 – 1</td>
                            <td className="px-4 py-2 text-center font-bold text-secondary">+25 pt</td>
                            <td className="px-4 py-2 text-center text-secondary/60">+5 pt</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-medium text-secondary">3 – 2</td>
                            <td className="px-4 py-2 text-center font-bold text-secondary">+20 pt</td>
                            <td className="px-4 py-2 text-center text-secondary/60">+10 pt</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-secondary/60">
                  I punti vengono assegnati automaticamente al termine di ogni sfida classificata.
                </p>
              </div>
            </div>

            <button
              onClick={handleResetSeason}
              disabled={resetting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#022431] text-white text-sm font-medium rounded-lg hover:bg-[#022431]/90 transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Reset in corso...
                </>
              ) : (
                "Reset Stagione"
              )}
            </button>
        </div>
      )}

      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Arena</ModalTitle>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            {activeTab === "gestione" && (
              <div className="space-y-1">
                <label htmlFor="arena-status-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  Stato sfida
                </label>
                <select
                  id="arena-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="all">Tutte</option>
                  <option value="active">Attivo</option>
                  <option value="pending">Da confermare</option>
                  <option value="accepted">Confermate</option>
                  <option value="awaiting_score">Attesa Punteggio</option>
                  <option value="inactive">Inattive</option>
                  <option value="declined">Rifiutate</option>
                  <option value="cancelled">Annullate</option>
                  <option value="completed">Completate</option>
                </select>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => {
                setStatusFilter(DEFAULT_STATUS_FILTER);
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
