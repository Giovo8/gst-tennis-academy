"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Swords,
  Trophy,
  Target,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  Medal,
  Star,
  Zap,
  Crown,
  Flame,
  ArrowRight,
  BarChart3,
  Shield,
  Sparkles,
  Check,
  X as XIcon,
  MessageSquare,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ChallengeModal from "@/components/arena/ChallengeModal";
import PlayerProfileModal from "@/components/arena/PlayerProfileModal";

interface PlayerStats {
  ranking: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  points: number;
  level: string;
}

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal";
  scheduled_date?: string;
  court?: string;
  message?: string;
  booking_id?: string;
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

interface SelectedPlayer {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  stats?: {
    ranking: number;
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    streak: number;
    points: number;
    level: string;
  };
}

export default function ArenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<PlayerStats>({
    ranking: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    streak: 0,
    points: 0,
    level: "Bronzo",
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; full_name: string; avatar_url?: string } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null);
  const [activeTab, setActiveTab] = useState<"sfide" | "classifica" | "info" | "statistiche">("sfide");
  const [selectedRank, setSelectedRank] = useState<string>("Tutti");

  useEffect(() => {
    loadArenaData();
    
    // Check if returning from challenge creation
    const success = searchParams.get('success');
    if (success === 'challenge_created') {
      // Remove the query param
      router.replace('/dashboard/atleta/arena');
    }
  }, [searchParams]);

  async function loadArenaData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Atleta");

    // Load user stats from API
    try {
      const statsRes = await fetch(`/api/arena/stats?user_id=${user.id}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          setStats({
            ranking: statsData.stats.ranking || 0,
            totalMatches: statsData.stats.total_matches || 0,
            wins: statsData.stats.wins || 0,
            losses: statsData.stats.losses || 0,
            winRate: parseFloat(statsData.stats.win_rate || "0"),
            streak: statsData.stats.current_streak || 0,
            points: statsData.stats.points || 0,
            level: statsData.stats.level || "Bronzo",
          });
        }
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }

    // Load challenges
    try {
      const challengesRes = await fetch(`/api/arena/challenges?user_id=${user.id}`);
      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        console.log("Challenges loaded:", challengesData.challenges);
        setChallenges(challengesData.challenges || []);
      }
    } catch (error) {
      console.error("Error loading challenges:", error);
    }

    // Load leaderboard
    try {
      const leaderboardRes = await fetch("/api/arena/stats?limit=100");
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        console.log("Leaderboard API response:", leaderboardData);
        
        // Transform data to match expected format
        const transformedLeaderboard = (leaderboardData.leaderboard || []).map((entry: any) => ({
          userId: entry.user_id,
          ranking: entry.ranking || 0,
          points: entry.points || 0,
          wins: entry.wins || 0,
          losses: entry.losses || 0,
          level: entry.level || 'Bronzo',
          totalMatches: entry.total_matches || 0,
          winRate: entry.win_rate || 0,
          name: entry.profile?.full_name || 'Giocatore',
          avatar: entry.profile?.avatar_url
        }));
        
        console.log("Transformed leaderboard:", transformedLeaderboard);
        setLeaderboard(transformedLeaderboard);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }

    setLoading(false);
  }

  async function handleChallengeAction(challengeId: string, action: "accept" | "decline") {
    try {
      const status = action === "accept" ? "accepted" : "declined";
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, status }),
      });

      if (response.ok) {
        loadArenaData(); // Reload data
      }
    } catch (error) {
      console.error("Error updating challenge:", error);
    }
  }

  function handleBookMatch(challenge: Challenge) {
    // Redirect to booking page with challenge context
    router.push(`/dashboard/atleta/bookings/new?challenge_id=${challenge.id}`);
  }

  function handleViewProfile(player: LeaderboardEntry) {
    setSelectedPlayer({
      id: player.userId,
      full_name: player.name || "Giocatore",
      avatar_url: player.avatar,
      stats: {
        ranking: player.ranking,
        totalMatches: player.totalMatches,
        wins: player.wins,
        losses: player.losses,
        winRate: player.winRate,
        streak: 0,
        points: player.points,
        level: player.level,
      },
    });
    setShowProfileModal(true);
  }

  function handleChallengePlayer(player: SelectedPlayer | LeaderboardEntry | { id: string; full_name: string; avatar_url?: string; stats?: any }) {
    if ("userId" in player) {
      // It's a LeaderboardEntry
      setSelectedOpponent({
        id: player.userId,
        full_name: player.name || "Giocatore",
        avatar_url: player.avatar,
      });
    } else {
      // It's a SelectedPlayer or PlayerProfile
      setSelectedOpponent({
        id: player.id,
        full_name: player.full_name,
        avatar_url: player.avatar_url,
      });
    }
    setShowChallengeModal(true);
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "oro":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "argento":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "bronzo":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "oro":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "argento":
        return <Medal className="h-4 w-4 text-gray-600" />;
      case "bronzo":
        return <Award className="h-4 w-4 text-orange-600" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Arena</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Sfida altri atleti, scala la classifica e raggiungi la vetta
          </p>
          {/* Level Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md text-white text-sm mt-3">
            {getLevelIcon(stats.level)}
            <span className="font-bold">Livello {stats.level}</span>
            <span className="text-white/90">•</span>
            <span className="text-white/90">{stats.points} punti</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/atleta/arena/choose-opponent")}
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Swords className="h-4 w-4" />
            Lancia Sfida
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
        </div>
      </div>

      {/* Main Content - Conditional Rendering based on activeTab */}
      {activeTab === "sfide" && (
      <div className="space-y-6">
        {/* Sfide */}
        <div className="bg-white rounded-lg p-6">
              {challenges.length === 0 ? (
                <div className="text-center py-20 rounded-xl bg-white">
                  <Swords className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
                  <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida trovata</h3>
                  <p className="text-secondary/70">Lancia una sfida per iniziare</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                  <div className="space-y-3 min-w-[800px]">
                  {/* Header Row */}
                  <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0">
                        <div className="text-xs font-bold text-white/80 uppercase"></div>
                      </div>
                      <div className="w-40 flex-shrink-0">
                        <div className="text-xs font-bold text-white/80 uppercase">Avversario</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white/80 uppercase">Dettagli</div>
                      </div>
                      <div className="w-24 flex-shrink-0 text-center">
                        <div className="text-xs font-bold text-white/80 uppercase">Data</div>
                      </div>
                      <div className="w-20 flex-shrink-0 text-center">
                        <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
                      </div>
                      <div className="w-24 flex-shrink-0 text-center">
                        <div className="text-xs font-bold text-white/80 uppercase">Campo</div>
                      </div>
                      <div className="w-28 flex-shrink-0 text-center">
                        <div className="text-xs font-bold text-white/80 uppercase">Stato</div>
                      </div>
                      <div className="w-24 flex-shrink-0 text-center">
                        <div className="text-xs font-bold text-white/80 uppercase">Azioni</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Rows */}
                  {challenges.map((challenge) => {
                    const isChallenger = challenge.challenger_id === userId;
                    const opponent = isChallenger ? challenge.opponent : challenge.challenger;
                    const isPending = challenge.status === "pending";
                    const isCounterProposal = challenge.status === "counter_proposal";
                    const canRespond = !isChallenger && isPending;
                    const needsConfirmation = isChallenger && isCounterProposal;

                    // Determina colore bordo in base allo stato
                    let borderStyle = {};
                    if (challenge.status === "completed") {
                      borderStyle = { borderLeftColor: "#10b981" }; // verde
                    } else if (challenge.status === "pending") {
                      borderStyle = { borderLeftColor: "#f59e0b" }; // amber
                    } else if (challenge.status === "accepted") {
                      borderStyle = { borderLeftColor: "#3b82f6" }; // blu
                    } else if (challenge.status === "declined" || challenge.status === "cancelled") {
                      borderStyle = { borderLeftColor: "#ef4444" }; // rosso
                    } else {
                      borderStyle = { borderLeftColor: "#8b5cf6" }; // viola per controproposta
                    }

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
                      <div
                        key={challenge.id}
                        onClick={() => router.push(`/dashboard/atleta/arena/challenge/${challenge.id}`)}
                        className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer border-l-4"
                        style={borderStyle}
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar Avversario */}
                          <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                            {opponent?.avatar_url ? (
                              <img
                                src={opponent.avatar_url}
                                alt={opponent.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{opponent?.full_name?.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Nome Avversario */}
                          <div className="w-40 flex-shrink-0">
                            <div className="font-bold text-secondary text-sm truncate">
                              {opponent?.full_name}
                            </div>
                            <div className="text-xs text-secondary/60">
                              {isChallenger ? "Hai sfidato" : "Ti ha sfidato"}
                            </div>
                          </div>

                          {/* Dettagli */}
                          <div className="flex-1 overflow-hidden">
                            <div className="flex flex-wrap gap-1">
                            {needsConfirmation && (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-orange-100 text-orange-700 whitespace-nowrap">
                                Da confermare
                              </span>
                            )}
                            {!challenge.booking?.manager_confirmed && challenge.booking && (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                                Attesa gestore
                              </span>
                            )}
                            </div>
                          </div>

                          {/* Data */}
                          <div className="w-24 flex-shrink-0 text-center">
                            <span className="text-xs text-secondary/60">
                              {challenge.booking
                                ? new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "-"}
                            </span>
                          </div>

                          {/* Ora */}
                          <div className="w-20 flex-shrink-0 text-center">
                            <span className="text-xs text-secondary/60">
                              {challenge.booking
                                ? new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                          </div>

                          {/* Campo */}
                          <div className="w-24 flex-shrink-0 text-center">
                            <span className="text-xs text-secondary/60">
                              {challenge.booking?.court || "-"}
                            </span>
                          </div>

                          {/* Stato */}
                          <div className="w-28 flex-shrink-0 text-center">
                            <span className="text-xs text-secondary/60">
                              {getStatusLabel(challenge.status)}
                            </span>
                          </div>

                          {/* Azioni */}
                          <div className="w-24 flex-shrink-0 flex items-center justify-center gap-1">
                            {canRespond && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChallengeAction(challenge.id, "accept");
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-all"
                                  title="Accetta"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChallengeAction(challenge.id, "decline");
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-all"
                                  title="Rifiuta"
                                >
                                  <XIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {challenge.status === "accepted" && !challenge.booking_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookMatch(challenge);
                                }}
                                className="px-2 py-1 bg-secondary text-white text-xs font-medium rounded-md hover:opacity-90 transition-colors"
                              >
                                Prenota
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/atleta/mail?recipient=${opponent?.id}`);
                              }}
                              className="p-2 text-secondary/70 hover:bg-secondary/5 rounded-md transition-all"
                              title="Messaggio"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              )}
            </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg p-6">
          {/* Rank Filter */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {["Tutti", "Bronzo", "Argento", "Oro", "Platino", "Diamante"].map((rank) => (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank)}
                className={`px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap transition-all ${
                  selectedRank === rank
                    ? "bg-secondary text-white"
                    : "bg-white border border-gray-300 text-secondary hover:border-secondary"
                }`}
              >
                {rank === "Tutti" ? "Tutti" :
                 rank === "Bronzo" ? "Bronzo" :
                 rank === "Argento" ? "Argento" :
                 rank === "Oro" ? "Oro" :
                 rank === "Platino" ? "Platino" : "Diamante"}
              </button>
            ))}
          </div>

          {(() => {
            const filteredLeaderboard = selectedRank === "Tutti"
              ? leaderboard
              : leaderboard.filter(entry => entry.level === selectedRank);

            return filteredLeaderboard.length === 0 ? (
              <div className="text-center py-20 rounded-xl bg-white">
                <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
                <h3 className="text-xl font-semibold text-secondary mb-2">Nessun giocatore in classifica</h3>
                <p className="text-secondary/70">
                  {selectedRank === "Tutti"
                    ? "Non ci sono ancora giocatori"
                    : `Nessun giocatore nel livello ${selectedRank}`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <div className="space-y-3 min-w-[700px]">
                {/* Header Row */}
                <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">#</div>
                    </div>
                    <div className="w-10 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase"></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white/80 uppercase">Giocatore</div>
                    </div>
                    <div className="w-20 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">Livello</div>
                    </div>
                    <div className="w-16 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">V</div>
                    </div>
                    <div className="w-16 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">S</div>
                    </div>
                    <div className="w-20 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">Punti</div>
                    </div>
                    <div className="w-24 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">Azioni</div>
                    </div>
                  </div>
                </div>

                {/* Data Rows */}
                {filteredLeaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === userId;
                  const displayPosition = selectedRank === "Tutti" ? entry.ranking : (index + 1);

                  // Determina colore bordo in base alla posizione
                  let borderStyle = {};
                  if (displayPosition === 1) {
                    borderStyle = { borderLeftColor: "#eab308" }; // oro
                  } else if (displayPosition === 2) {
                    borderStyle = { borderLeftColor: "#9ca3af" }; // argento
                  } else if (displayPosition === 3) {
                    borderStyle = { borderLeftColor: "#f97316" }; // bronzo
                  } else if (isCurrentUser) {
                    borderStyle = { borderLeftColor: "var(--secondary)" }; // secondary per utente corrente
                  } else {
                    borderStyle = { borderLeftColor: "#e5e7eb" }; // grigio default
                  }

                  return (
                    <div
                      key={entry.userId}
                      onClick={() => !isCurrentUser && handleViewProfile(entry)}
                      className={`bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer border-l-4 ${
                        isCurrentUser ? "bg-secondary/5" : ""
                      }`}
                      style={borderStyle}
                    >
                      <div className="flex items-center gap-4">
                        {/* Posizione */}
                        <div className="w-10 flex-shrink-0 text-center">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mx-auto ${
                              displayPosition === 1
                                ? "bg-yellow-500 text-white"
                                : displayPosition === 2
                                ? "bg-gray-400 text-white"
                                : displayPosition === 3
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 text-secondary"
                            }`}
                          >
                            {displayPosition}
                          </div>
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                          {entry.avatar ? (
                            <img
                              src={entry.avatar}
                              alt={entry.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{entry.name?.charAt(0).toUpperCase() || "?"}</span>
                          )}
                        </div>

                        {/* Nome Giocatore */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-secondary text-sm truncate">
                            {entry.name || "Giocatore"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs font-medium text-secondary/60">(Tu)</span>
                            )}
                          </div>
                        </div>

                        {/* Livello */}
                        <div className="w-20 flex-shrink-0 text-center">
                          <span className="text-xs text-secondary/60">{entry.level}</span>
                        </div>

                        {/* Vittorie */}
                        <div className="w-16 flex-shrink-0 text-center">
                          <span className="text-xs text-green-600 font-medium">{entry.wins}</span>
                        </div>

                        {/* Sconfitte */}
                        <div className="w-16 flex-shrink-0 text-center">
                          <span className="text-xs text-red-600 font-medium">{entry.losses}</span>
                        </div>

                        {/* Punti */}
                        <div className="w-20 flex-shrink-0 text-center">
                          <span className="text-sm font-bold text-secondary">{entry.points}</span>
                        </div>

                        {/* Azioni */}
                        <div className="w-24 flex-shrink-0 flex items-center justify-center gap-1">
                          {!isCurrentUser && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChallengePlayer(entry);
                                }}
                                className="p-2 text-white bg-secondary hover:opacity-90 rounded-md transition-all"
                                title="Lancia sfida"
                              >
                                <Swords className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(entry);
                                }}
                                className="p-2 text-secondary/70 hover:bg-secondary/5 rounded-md transition-all"
                                title="Vedi profilo"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="bg-white rounded-lg">
          <div className="space-y-6">
            {/* Sistema di Punteggio */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Sistema di Punteggio (Tennis)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <span className="font-bold text-green-700">Vittoria:</span>
                    <span className="text-green-600 ml-2">+50 punti</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <XIcon className="h-5 w-5 text-red-600" />
                  <div>
                    <span className="font-bold text-red-700">Sconfitta:</span>
                    <span className="text-red-600 ml-2">-20 punti (minimo 0)</span>
                  </div>
                </div>
                <p className="text-xs text-secondary/60 mt-3">
                  Nel tennis non esistono pareggi - ogni partita deve avere un vincitore
                </p>
              </div>
            </div>

            {/* Livelli */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-secondary" />
                Livelli
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <p className="font-bold text-orange-700">Bronzo</p>
                  <p className="text-xs text-orange-600">0-799 punti</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                  <p className="font-bold text-gray-700">Argento</p>
                  <p className="text-xs text-gray-600">800-1499 punti</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                  <p className="font-bold text-amber-700">Oro</p>
                  <p className="text-xs text-amber-600">1500-1999 punti</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <p className="font-bold text-purple-700">Platino</p>
                  <p className="text-xs text-purple-600">2000-2499 punti</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="font-bold text-blue-700">Diamante</p>
                  <p className="text-xs text-blue-600">2500+ punti</p>
                </div>
              </div>
            </div>

            {/* Tipi di Sfida */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Swords className="h-5 w-5 text-secondary" />
                Tipi di Sfida
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-secondary/5 rounded-lg border-l-4 border-secondary">
                  <p className="font-bold text-secondary">Sfida Diretta</p>
                  <p className="text-sm text-secondary/70">Sfida un giocatore specifico 1 contro 1</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="font-bold text-blue-700">Sfida di Coppia</p>
                  <p className="text-sm text-blue-600">Forma una coppia e sfida un'altra coppia 2 contro 2</p>
                </div>
              </div>
            </div>

            {/* Regole */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-secondary" />
                Regole Generali
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <span className="text-sm text-secondary/80">Le sfide devono essere confermate dall'avversario</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <span className="text-sm text-secondary/80">Ogni sfida richiede la prenotazione di un campo</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <span className="text-sm text-secondary/80">Il risultato deve essere inserito entro 24 ore dalla sfida</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                  <span className="text-sm text-secondary/80">In caso di controversie, contattare lo staff</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistiche Tab */}
      {activeTab === "statistiche" && (
        <div className="bg-white rounded-lg">
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Win Rate */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary/60 uppercase font-bold">Win Rate</p>
                    <p className="text-2xl font-bold text-secondary mt-1">{stats.winRate.toFixed(0)}%</p>
                    <p className="text-xs text-secondary/60 mt-1">
                      {stats.wins} vittorie su {stats.totalMatches} match
                    </p>
                  </div>
                  <div className="p-3 bg-green-500 rounded-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Current Streak */}
              <div className={`bg-white rounded-lg border border-gray-200 p-5 border-l-4 ${
                stats.streak > 0 ? 'border-l-orange-500' : 'border-l-gray-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary/60 uppercase font-bold">
                      {stats.streak > 0 ? 'Serie Positiva' : stats.streak < 0 ? 'Serie Negativa' : 'Nessuna Serie'}
                    </p>
                    <p className="text-2xl font-bold text-secondary mt-1">{Math.abs(stats.streak)}</p>
                    <p className="text-xs text-secondary/60 mt-1">
                      {stats.streak > 0 ? 'Vittorie consecutive' : stats.streak < 0 ? 'Sconfitte consecutive' : 'Inizia a giocare'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stats.streak > 0 ? 'bg-orange-500' : 'bg-gray-400'}`}>
                    <Flame className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Total Points */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 border-l-4 border-l-secondary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary/60 uppercase font-bold">Punti Totali</p>
                    <p className="text-2xl font-bold text-secondary mt-1">{stats.points}</p>
                    <p className="text-xs text-secondary/60 mt-1">
                      Ranking #{stats.ranking || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Wins */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 border-l-4 border-l-green-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary/60 uppercase font-bold">Vittorie</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.wins}</p>
                    <p className="text-xs text-secondary/60 mt-1">Match vinti</p>
                  </div>
                  <div className="p-3 bg-green-600 rounded-lg">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Losses */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary/60 uppercase font-bold">Sconfitte</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.losses}</p>
                    <p className="text-xs text-secondary/60 mt-1">Match persi</p>
                  </div>
                  <div className="p-3 bg-red-500 rounded-lg">
                    <XIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Level Progress */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary/60 uppercase font-bold">Livello Attuale</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.level}</p>
                    <p className="text-xs text-secondary/60 mt-1">
                      {stats.level === "Diamante"
                        ? "Livello massimo raggiunto!"
                        : `${getPointsToNextLevel(stats.points, stats.level)} punti al prossimo`}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500 rounded-lg">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Progress to Next Level */}
            {stats.level !== "Diamante" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-secondary">Progresso verso il prossimo livello</h3>
                  <span className="text-sm text-secondary/60">
                    {stats.points} / {getNextLevelPoints(stats.level)} punti
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all"
                    style={{
                      width: `${Math.min((stats.points / getNextLevelPoints(stats.level)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-secondary/60 mt-2">
                  Mancano {getPointsToNextLevel(stats.points, stats.level)} punti per raggiungere il livello successivo
                </p>
              </div>
            )}

            {/* Charts Placeholder */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-secondary mb-4">Prestazioni nel Tempo</h3>
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-secondary/20" />
                  <p className="text-sm text-secondary/60">Grafici disponibili a breve</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ChallengeModal
        isOpen={showChallengeModal}
        onClose={() => {
          setShowChallengeModal(false);
          setSelectedOpponent(null);
        }}
        opponent={selectedOpponent}
        onChallengeCreated={loadArenaData}
      />

      <PlayerProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        onChallenge={handleChallengePlayer}
        onMessage={(playerId) => router.push(`/dashboard/atleta/mail?recipient=${playerId}`)}
      />
    </div>
  );

  function getPointsToNextLevel(currentPoints: number, currentLevel: string): number {
    const nextPoints = getNextLevelPoints(currentLevel);
    return nextPoints - currentPoints;
  }

  function getNextLevelPoints(level: string): number {
    switch (level.toLowerCase()) {
      case "bronzo":
        return 800;
      case "argento":
        return 1500;
      case "oro":
        return 2000;
      case "platino":
        return 2500;
      default:
        return 2500;
    }
  }
}
