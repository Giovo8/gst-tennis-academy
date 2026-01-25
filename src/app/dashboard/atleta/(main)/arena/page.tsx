"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Swords,
  Trophy,
  Shield,
  Star,
  BarChart3,
  Eye,
  Search,
  History,
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
  challenge_type?: string;
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
  const [selectedRank, setSelectedRank] = useState<string>("Tutti");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadArenaData();
    
    // Check if returning from challenge creation
    const success = searchParams.get('success');
    if (success === 'challenge_created') {
      // Remove the query param
      router.replace('/dashboard/atleta/arena');
    }
  }, [searchParams]);

  const filteredChallenges = challenges.filter((challenge) => {
    // Filter by search term
    if (search.trim()) {
      const q = search.toLowerCase();
      const challengerName = (challenge.challenger?.full_name || "").toLowerCase();
      const opponentName = (challenge.opponent?.full_name || "").toLowerCase();

      if (!challengerName.includes(q) && !opponentName.includes(q)) {
        return false;
      }
    }

    // Filter by status - only show active challenges (not finalized)
    if (["completed", "declined", "cancelled"].includes(challenge.status)) {
      return false;
    }

    return true;
  });

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
      console.log("❓ Challenges API response status:", challengesRes.status);
      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        console.log("✅ Challenges loaded:", challengesData.challenges?.length || 0, "challenges", challengesData.challenges);
        setChallenges(challengesData.challenges || []);
      } else {
        console.error("❌ Challenges API returned status:", challengesRes.status);
      }
    } catch (error) {
      console.error("❌ Error loading challenges:", error);
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
        return "👑";
      case "argento":
        return "🥈";
      case "bronzo":
        return "🥉";
      default:
        return "⭐";
    }
  };

  const getLevelAccentColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "oro":
        return "#f59e0b"; // amber-500
      case "argento":
        return "#9ca3af"; // gray-400
      case "bronzo":
        return "#f97316"; // orange-500
      default:
        return "#0ea5e9"; // secondary
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Arena</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Sfida altri atleti, scala la classifica e raggiungi la vetta
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => router.push("/dashboard/atleta/arena/choose-opponent")}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Swords className="h-4 w-4" />
            Lancia Sfida
          </button>
          <Link
            href="/dashboard/atleta/arena/storico"
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Storico"
          >
            <History className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard/atleta/arena/statistiche"
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Statistiche"
          >
            <BarChart3 className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard/atleta/arena/info"
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Info"
          >
            <Shield className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Level Badge - styled like admin tournament header - Full Width */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: getLevelAccentColor(stats.level) }}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="text-xl font-bold">Livello {stats.level}</span>
          <span className="text-white/80">•</span>
          <span className="text-lg font-semibold">{stats.points} punti</span>
        </div>
      </div>

      {/* Main Content - Sfide e Classifica */}
      <div className="space-y-6">
        {/* Search (no container, inline like other pages) */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome giocatore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Sfide - senza container esterno */}
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-20 rounded-xl bg-white">
            <Swords className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida trovata</h3>
            <p className="text-secondary/70">Lancia una sfida per iniziare</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="space-y-3 min-w-[750px]">
              {/* Header Row */}
              <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                <div className="flex items-center gap-4">
                  <div className="w-8 flex-shrink-0">
                    <div className="text-xs font-bold text-white/80 uppercase"></div>
                  </div>
                  <div className="w-10 flex-shrink-0">
                    <div className="text-xs font-bold text-white/80 uppercase"></div>
                  </div>
                  <div className="w-48 flex-shrink-0">
                    <div className="text-xs font-bold text-white/80 uppercase">Avversario</div>
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
                </div>
              </div>

              {/* Data Rows */}
              {filteredChallenges.map((challenge) => {
                const isChallenger = challenge.challenger_id === userId;
                const opponent = isChallenger ? challenge.opponent : challenge.challenger;

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
                    className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer border-l-4 border-l-secondary"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icona Tipo Sfida */}
                      <div className="w-8 flex-shrink-0 flex items-center justify-center">
                        {challenge.challenge_type === "ranked" ? (
                          <Shield className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                        ) : (
                          <Star className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                        )}
                      </div>

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
                      <div className="w-48 flex-shrink-0">
                        <div className="font-bold text-secondary text-sm truncate">
                          {opponent?.full_name}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary">Classifica Arena</h2>
          </div>
          
          {/* Rank Filter */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center gap-2 mb-6">
            {["Tutti", "Bronzo", "Argento", "Oro", "Platino", "Diamante"].map((rank) => (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border w-full ${
                  selectedRank === rank
                    ? "text-white bg-secondary border-secondary"
                    : "bg-white text-secondary/70 border-gray-200 hover:bg-secondary/5 hover:border-gray-300"
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
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
                <p className="text-secondary/70">
                  {selectedRank === "Tutti"
                    ? "Nessun giocatore in classifica"
                    : `Nessun giocatore nel livello ${selectedRank}`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="space-y-3" style={{ minWidth: '900px' }}>
                {/* Header Row */}
                <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                  <div className="grid grid-cols-[48px_200px_80px_80px_80px_80px_80px_80px] items-center gap-4">
                    <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                    <div className="text-xs font-bold text-white/80 uppercase">Giocatore</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Punti</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Partite</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Vittorie</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Sconfitte</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Win Rate</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Azioni</div>
                  </div>
                </div>

                {/* Data Rows */}
                {filteredLeaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === userId;
                  const displayPosition = selectedRank === "Tutti" ? entry.ranking : (index + 1);

                  // Determina il colore del bordo in base alla posizione
                  let borderStyle = {};
                  if (displayPosition === 1) {
                    borderStyle = { borderLeftColor: "#eab308" }; // giallo oro
                  } else if (displayPosition === 2) {
                    borderStyle = { borderLeftColor: "#9ca3af" }; // grigio argento
                  } else if (displayPosition === 3) {
                    borderStyle = { borderLeftColor: "#f97316" }; // arancione bronzo
                  } else {
                    borderStyle = { borderLeftColor: "#0f4c7c" }; // secondary default
                  }

                  return (
                    <div
                      key={`${entry.userId}-${index}`}
                      className={`bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all border-l-4 ${
                        isCurrentUser ? "bg-secondary/5" : ""
                      }`}
                      style={borderStyle}
                    >
                      <div className="grid grid-cols-[48px_200px_80px_80px_80px_80px_80px_80px] items-center gap-4">
                        {/* Position */}
                        <div className="text-center">
                          <span className="text-lg font-bold text-secondary">
                            {displayPosition}
                          </span>
                        </div>

                        {/* Player */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 min-w-[40px] rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
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
                          <span className="font-bold text-secondary truncate">
                            {entry.name || "N/A"}
                            {isCurrentUser && (
                              <span className="ml-1 text-xs font-medium text-secondary/60">(Tu)</span>
                            )}
                          </span>
                        </div>

                        {/* Points */}
                        <div className="text-center">
                          <span className="text-lg font-bold text-secondary">{entry.points ?? 0}</span>
                        </div>

                        {/* Total Matches */}
                        <div className="text-center">
                          <span className="text-sm font-semibold text-secondary">{entry.totalMatches ?? 0}</span>
                        </div>

                        {/* Wins */}
                        <div className="text-center">
                          <span className="text-sm font-semibold text-secondary">{entry.wins ?? 0}</span>
                        </div>

                        {/* Losses */}
                        <div className="text-center">
                          <span className="text-sm font-semibold text-secondary">{entry.losses ?? 0}</span>
                        </div>

                        {/* Win Rate */}
                        <div className="text-center">
                          <span className="text-sm font-semibold text-secondary">{entry.winRate?.toFixed(0) ?? 0}%</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-2">
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
}
