"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Swords,
  Trophy,
  Plus,
  SlidersHorizontal,
  Loader2,
  Search,
  Shield,
  Target,
  Handshake,
  MoreVertical,
  Eye,
  Check,
  X,
  RefreshCw,
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

interface PlayerStats {
  ranking: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  points: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  ranking: number;
  points: number;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
}

export default function AthleteArenaPage() {
  const DEFAULT_STATUS_FILTER = "active";
  const router = useRouter();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/arena")[0];

  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState<PlayerStats>({
    ranking: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    points: 0,
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const matchesStatusFilter = (status: Challenge["status"]) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return status === "pending" || status === "accepted" || status === "counter_proposal" || status === "awaiting_score";
    }
    if (statusFilter === "inactive") return status === "declined" || status === "cancelled";
    if (statusFilter === "pending") return status === "pending" || status === "counter_proposal";
    if (statusFilter === "awaiting_score") return status === "awaiting_score";
    return status === statusFilter;
  };

  const getChallengeSortTimestamp = (challenge: Challenge) => {
    const referenceDate = challenge.booking?.start_time || challenge.scheduled_date || challenge.created_at;
    return new Date(referenceDate).getTime();
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

  const hasActiveFilters = statusFilter !== DEFAULT_STATUS_FILTER;

  const filteredChallenges = useMemo(() => {
    return challenges
      .filter((challenge) => {
        const q = search.trim().toLowerCase();
        const challengerName = challenge.challenger?.full_name?.toLowerCase() || "";
        const opponentName = challenge.opponent?.full_name?.toLowerCase() || "";
        const matchesSearch = !q || challengerName.includes(q) || opponentName.includes(q);
        return matchesSearch && matchesStatusFilter(challenge.status);
      })
      .sort((left, right) => getChallengeSortTimestamp(left) - getChallengeSortTimestamp(right));
  }, [challenges, search, statusFilter]);



  useEffect(() => {
    loadArenaData();
  }, []);

  async function loadArenaData() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await Promise.all([
        loadUserStats(user.id),
        loadChallenges(user.id),
        loadLeaderboard(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserStats(currentUserId: string) {
    try {
      const response = await fetch(`/api/arena/stats?user_id=${currentUserId}`);
      if (!response.ok) return;

      const data = await response.json();
      const userStats = data.stats;
      if (!userStats) return;

      setStats({
        ranking: userStats.ranking || 0,
        totalMatches: userStats.total_matches || 0,
        wins: userStats.wins || 0,
        losses: userStats.losses || 0,
        winRate: Number(userStats.win_rate || 0),
        points: userStats.points || 0,
      });
    } catch (error) {
      console.error("Error loading athlete arena stats:", error);
    }
  }

  async function loadChallenges(currentUserId: string) {
    try {
      const response = await fetch(`/api/arena/challenges?user_id=${currentUserId}`);
      if (!response.ok) return;

      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error("Error loading athlete challenges:", error);
    }
  }

  async function loadLeaderboard() {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch("/api/arena/stats");
      if (!response.ok) return;

      const data = await response.json();
      const mapped = (data.leaderboard || []).map((entry: any, index: number) => ({
        userId: entry.user_id,
        name: entry.profile?.full_name || "N/A",
        avatar: entry.profile?.avatar_url,
        ranking: entry.ranking || index + 1,
        points: entry.points || 0,
        wins: entry.wins || 0,
        losses: entry.losses || 0,
        totalMatches: (entry.wins || 0) + (entry.losses || 0),
        winRate: entry.wins > 0 || entry.losses > 0
          ? (entry.wins / ((entry.wins || 0) + (entry.losses || 0))) * 100
          : 0,
      }));

      setLeaderboard(mapped);
    } catch (error) {
      console.error("Error loading athlete leaderboard:", error);
    } finally {
      setLoadingLeaderboard(false);
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
        await loadArenaData();
      }
    } catch (error) {
      console.error("Error updating athlete challenge:", error);
    }
  }

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento Arena...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary">Arena GST</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => router.push(`${dashboardBase}/arena/choose-opponent`)}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Lancia Sfida
          </button>

          <Link
            href={`${dashboardBase}/arena/info`}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Info"
          >
            <Shield className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div
        className="rounded-xl border p-6 border-l-4"
        style={{
          background: "#033d56",
          borderColor: "#033d56",
          borderLeftColor: "#033d56",
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg font-semibold">{stats.points} punti</span>
        </div>
      </div>

      {renderSearchWithFilter("Cerca per nome giocatore...")}

      {filteredChallenges.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Swords className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida trovata</h3>
          <p className="text-secondary/60">Lancia una sfida per iniziare</p>
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

            const isChallenger = challenge.challenger_id === userId;
            const otherPlayer = isChallenger ? challenge.opponent : challenge.challenger;

            const typeColor = challenge.challenge_type === "ranked" ? "var(--secondary)" : "#023047";
            const isPending = challenge.status === "pending";
            const isDeclined = challenge.status === "declined" || challenge.status === "cancelled";
            const isConfirmed = challenge.status === "accepted";
            const cardBg = isDeclined ? "#9ca3af" : isPending ? "#ffffff" : typeColor;
            const iconBadgeBg = isPending
              ? typeColor
              : isConfirmed || isDeclined
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(255, 255, 255, 0.15)";
            const primaryTextColor = isPending ? "var(--secondary)" : "#ffffff";
            const iconColor = isPending ? "#ffffff" : primaryTextColor;
            const secondaryTextColor = isPending ? "rgba(3, 72, 99, 0.75)" : "rgba(255, 255, 255, 0.7)";

            const canAccept =
              (challenge.status === "pending" && !isChallenger) ||
              (challenge.status === "counter_proposal" && isChallenger);
            const canDecline = canAccept;
            const canCancel =
              challenge.status !== "cancelled" &&
              challenge.status !== "declined" &&
              challenge.status !== "completed";

            const menuButtonClassName = isPending
              ? "inline-flex items-center justify-center p-1.5 rounded hover:bg-black/5 text-secondary/60 hover:text-secondary transition-all focus:outline-none w-8 h-8"
              : "inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8";

            return (
              <div
                key={challenge.id}
                onClick={() => router.push(`${dashboardBase}/arena/challenge/${challenge.id}`)}
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
                      {otherPlayer?.full_name || "Giocatore"}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: secondaryTextColor }}>
                      {dateLabel} · {timeLabel} · {courtLabel} · {getStatusLabel(challenge.status)}
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
                        <div
                          className="fixed inset-0 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 top-9 z-30 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              router.push(`${dashboardBase}/arena/challenge/${challenge.id}`);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizza
                          </button>

                          {canAccept && (
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
                          )}

                          {canDecline && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUpdateChallengeStatus(challenge.id, "declined");
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                            >
                              <X className="h-3.5 w-3.5" />
                              Rifiuta
                            </button>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUpdateChallengeStatus(challenge.id, "cancelled");
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Annulla
                            </button>
                          )}
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
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
              <p className="text-secondary/70">Nessun giocatore in classifica</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {leaderboard.map((entry, index) => {
                const displayPosition = entry.ranking;
                const isCurrentUser = entry.userId === userId;

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
                        <p className="font-semibold text-white text-sm truncate">
                          {entry.name || "N/A"}
                          {isCurrentUser && <span className="ml-1 text-xs text-white/80">(Tu)</span>}
                        </p>
                      </div>

                      <span className="text-sm font-bold text-white flex-shrink-0 tabular-nums">{entry.points ?? 0}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Arena</ModalTitle>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
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
