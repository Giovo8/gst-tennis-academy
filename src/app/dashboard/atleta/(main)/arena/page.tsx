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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-frozen-500 rounded-xl">
                <Swords className="h-8 w-8 text-white" />
              </div>
              Arena
            </h1>
            <p className="text-sm text-gray-600">
              Sfida altri atleti, scala la classifica e raggiungi la vetta
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/atleta/arena/choose-opponent")}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-frozen-500 rounded-xl hover:bg-frozen-600 transition-all shadow-lg shadow-frozen-500/20"
            >
              <Swords className="h-4 w-4" />
              Lancia Sfida
            </button>
            <button
              onClick={() => setActiveTab("statistiche")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === "statistiche"
                  ? "text-white bg-frozen-500 shadow-lg shadow-frozen-500/20"
                  : "text-gray-700 bg-white border border-gray-200 hover:border-frozen-300"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Statistiche
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === "info"
                  ? "text-white bg-frozen-500 shadow-lg shadow-frozen-500/20"
                  : "text-gray-700 bg-white border border-gray-200 hover:border-frozen-300"
              }`}
            >
              <Shield className="h-4 w-4" />
              Info
            </button>
          </div>
        </div>

        {/* Level Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-frozen-500 to-frozen-600 rounded-xl text-white w-fit shadow-lg shadow-frozen-500/20">
          {getLevelIcon(stats.level)}
          <span className="font-bold">Livello {stats.level}</span>
          <span className="text-frozen-100">•</span>
          <span className="text-frozen-100">{stats.points} punti</span>
        </div>
      </div>

      {/* Main Content - Conditional Rendering based on activeTab */}
      {activeTab === "sfide" && (
      <div className="space-y-6">
        {/* Sfide */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Swords className="h-5 w-5 text-frozen-600" />
              Sfide
            </h2>
          </div>
          <div className="p-6">
              {(() => {
                console.log("Total challenges in state:", challenges.length);
                console.log("Challenges:", challenges);
                return null;
              })()}
              {challenges.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex p-3 bg-gray-50 rounded-full mb-3">
                    <Swords className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">Nessuna sfida</p>
                  <p className="text-sm text-gray-500">Lancia una sfida per iniziare</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {challenges.map((challenge) => {
                    const isChallenger = challenge.challenger_id === userId;
                    const opponent = isChallenger ? challenge.opponent : challenge.challenger;
                    const isPending = challenge.status === "pending";
                    const isCounterProposal = challenge.status === "counter_proposal";
                    const canRespond = !isChallenger && isPending;
                    const needsConfirmation = isChallenger && isCounterProposal;

                    return (
                      <div
                        key={challenge.id}
                        onClick={() => router.push(`/dashboard/atleta/arena/challenge/${challenge.id}`)}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-frozen-300 hover:bg-frozen-50/30 transition-all group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {opponent?.avatar_url ? (
                            <img
                              src={opponent.avatar_url}
                              alt={opponent.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-frozen-700">
                              {opponent?.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900 truncate">
                              {isChallenger ? "Hai sfidato" : "Sei stato sfidato da"}{" "}
                              {opponent?.full_name}
                            </p>
                            {needsConfirmation && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 bg-orange-100 text-orange-700 animate-pulse">
                                ⚠️ Da confermare
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                challenge.status === "accepted"
                                  ? "bg-green-100 text-green-700"
                                  : challenge.status === "pending" || challenge.status === "counter_proposal"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : challenge.status === "completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {challenge.status === "accepted"
                                ? "Accettata"
                                : challenge.status === "pending"
                                ? "In attesa"
                                : challenge.status === "counter_proposal"
                                ? "Modificata"
                                : challenge.status === "completed"
                                ? "Completata"
                                : "Rifiutata"}
                            </span>
                          </div>

                          {challenge.message && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                              "{challenge.message}"
                            </p>
                          )}

                          {challenge.booking && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                  <span>
                                    {new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                </div>
                                <span className="text-gray-300">•</span>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                                  <span>
                                    {new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <span className="text-gray-300">•</span>
                                <span>{challenge.booking.court}</span>
                              </div>
                              {!challenge.booking.manager_confirmed && (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                                    <svg className="mr-1 h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    In attesa conferma gestore
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canRespond && (
                            <>
                              <button
                                onClick={() => handleChallengeAction(challenge.id, "accept")}
                                className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                                title="Accetta sfida"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleChallengeAction(challenge.id, "decline")}
                                className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                                title="Rifiuta sfida"
                              >
                                <XIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {challenge.status === "accepted" && !challenge.booking_id && (
                            <button
                              onClick={() => handleBookMatch(challenge)}
                              className="px-3 py-2 bg-frozen-500 text-white text-xs font-medium rounded-lg hover:bg-frozen-600 transition-colors"
                            >
                              Prenota Campo
                            </button>
                          )}

                          <button
                            onClick={() => router.push(`/dashboard/atleta/mail?recipient=${opponent?.id}`)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Invia messaggio"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Classifica
            </h2>
          </div>
          
          {/* Rank Filter */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {["Tutti", "Bronzo", "Argento", "Oro", "Platino", "Diamante"].map((rank) => (
                <button
                  key={rank}
                  onClick={() => setSelectedRank(rank)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    selectedRank === rank
                      ? "bg-frozen-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {rank === "Tutti" ? "🏆 Tutti" : 
                   rank === "Bronzo" ? "🥉 Bronzo" :
                   rank === "Argento" ? "🥈 Argento" :
                   rank === "Oro" ? "🥇 Oro" :
                   rank === "Platino" ? "💎 Platino" : "💠 Diamante"}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6">
            {(() => {
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
                const isCurrentUser = entry.userId === userId;
                const displayPosition = selectedRank === "Tutti" ? entry.ranking : (index + 1);

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      entry.ranking <= 3
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
                        : isCurrentUser
                        ? "bg-frozen-50 border-frozen-300 ring-2 ring-frozen-200"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => !isCurrentUser && handleViewProfile(entry)}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm flex-shrink-0 ${
                        displayPosition === 1
                          ? "bg-yellow-500 text-white"
                          : displayPosition === 2
                          ? "bg-gray-400 text-white"
                          : displayPosition === 3
                          ? "bg-orange-500 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {displayPosition}
                    </div>

                    <div className="w-10 h-10 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-frozen-700">
                          {entry.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {entry.name || "Giocatore"}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-medium text-frozen-600">(Tu)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-600">
                          {entry.wins}W - {entry.losses}L
                        </span>
                        {selectedRank === "Tutti" && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium border ${getLevelColor(
                              entry.level
                            )}`}
                          >
                            {entry.level}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{entry.points}</p>
                      <p className="text-xs text-gray-500">punti</p>
                    </div>

                    {!isCurrentUser && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChallengePlayer(entry);
                          }}
                          className="p-2 bg-frozen-500 text-white rounded-lg hover:bg-frozen-600 transition-colors"
                          title="Lancia sfida"
                        >
                          <Swords className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(entry);
                          }}
                          className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          title="Vedi profilo"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              );
            })()}
          </div>
        </div>
      </div>
      )}

      {/* Classifica Tab */}
      {activeTab === "classifica" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              Classifica Arena
            </h2>
          </div>

          {/* Rank Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {["Tutti", "Bronzo", "Argento", "Oro", "Platino", "Diamante"].map((rank) => (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  selectedRank === rank
                    ? "bg-frozen-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {rank === "Tutti" ? "🏆 Tutti" : 
                 rank === "Bronzo" ? "🥉 Bronzo" :
                 rank === "Argento" ? "🥈 Argento" :
                 rank === "Oro" ? "🥇 Oro" :
                 rank === "Platino" ? "💎 Platino" : "💠 Diamante"}
              </button>
            ))}
          </div>
          
          {(() => {
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
                  const isCurrentUser = entry.userId === userId;
                  const displayPosition = selectedRank === "Tutti" ? entry.ranking : (index + 1);
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-frozen-50 to-blue-50 border-2 border-frozen-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
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
                        <p
                          className={`font-semibold truncate ${
                            isCurrentUser ? "text-frozen-700" : "text-gray-900"
                          }`}
                        >
                          {entry.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs font-normal text-frozen-600">
                              (Tu)
                            </span>
                          )}
                        </p>
                        {selectedRank === "Tutti" && (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelColor(
                              entry.level
                            )}`}
                          >
                            {entry.level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {entry.points} punti
                        </span>
                        <span>
                          {entry.wins}V - {entry.losses}S
                        </span>
                        {entry.winRate !== undefined && (
                          <span className="text-xs">
                            {entry.winRate.toFixed(0)}% vittorie
                          </span>
                        )}
                      </div>
                    </div>

                    {!isCurrentUser && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleChallengePlayer(entry)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-colors"
                        >
                          Sfida
                        </button>
                        <button
                          onClick={() => handleViewProfile(entry)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Profilo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      )}

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-frozen-500" />
            Come funziona l'Arena
          </h2>
          
          <div className="space-y-6">
            {/* Sistema di Punteggio */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-frozen-500" />
                Sistema di Punteggio (Tennis)
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  <strong className="text-frozen-600">Vittoria:</strong> +50 punti
                </p>
                <p className="text-sm text-gray-700">
                  <strong className="text-red-600">Sconfitta:</strong> -20 punti (minimo 0)
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">
                  ⚠️ Nel tennis non esistono pareggi - ogni partita deve avere un vincitore
                </p>
              </div>
            </div>

            {/* Livelli */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Livelli
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="font-medium text-orange-700">🥉 Bronzo</p>
                  <p className="text-xs text-orange-600">0-799 punti</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
                  <p className="font-medium text-gray-700">🥈 Argento</p>
                  <p className="text-xs text-gray-600">800-1499 punti</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-300">
                  <p className="font-medium text-amber-700">🥇 Oro</p>
                  <p className="text-xs text-amber-600">1500-1999 punti</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-300">
                  <p className="font-medium text-purple-700">💎 Platino</p>
                  <p className="text-xs text-purple-600">2000-2499 punti</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-300 sm:col-span-2">
                  <p className="font-medium text-blue-700">💠 Diamante</p>
                  <p className="text-xs text-blue-600">2500+ punti</p>
                </div>
              </div>
            </div>

            {/* Tipi di Sfida */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Tipi di Sfida
              </h3>
              <div className="space-y-2">
                <div className="bg-frozen-50 rounded-lg p-3">
                  <p className="font-medium text-frozen-700">⚔️ Sfida Diretta</p>
                  <p className="text-sm text-gray-600">Sfida un giocatore specifico 1 contro 1</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="font-medium text-blue-700">👥 Sfida di Coppia</p>
                  <p className="text-sm text-gray-600">Forma una coppia e sfida un'altra coppia 2 contro 2</p>
                </div>
              </div>
            </div>

            {/* Regole */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Regole Generali
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-frozen-500 mt-0.5">•</span>
                  <span>Le sfide devono essere confermate dall'avversario</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-frozen-500 mt-0.5">•</span>
                  <span>Ogni sfida richiede la prenotazione di un campo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-frozen-500 mt-0.5">•</span>
                  <span>Il risultato deve essere inserito entro 24 ore dalla sfida</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-frozen-500 mt-0.5">•</span>
                  <span>In caso di controversie, contattare lo staff</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Statistiche Tab */}
      {activeTab === "statistiche" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-frozen-500" />
            Le Tue Statistiche
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Win Rate */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500 rounded-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-green-600">
                  {stats.winRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">Win Rate</p>
              <p className="text-xs text-gray-600 mt-1">
                {stats.wins} vittorie su {stats.totalMatches} match
              </p>
            </div>

            {/* Current Streak */}
            <div className={`p-6 rounded-xl border ${
              stats.streak > 0 
                ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' 
                : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stats.streak > 0 ? 'bg-orange-500' : 'bg-gray-400'}`}>
                  <Flame className="h-6 w-6 text-white" />
                </div>
                <span className={`text-3xl font-bold ${stats.streak > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {Math.abs(stats.streak)}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {stats.streak > 0 ? 'Serie Positiva' : stats.streak < 0 ? 'Serie Negativa' : 'Nessuna Serie'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {stats.streak > 0 ? 'Vittorie consecutive' : stats.streak < 0 ? 'Sconfitte consecutive' : 'Inizia a giocare'}
              </p>
            </div>

            {/* Total Points */}
            <div className="p-6 bg-gradient-to-br from-frozen-50 to-blue-50 rounded-xl border border-frozen-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-frozen-500 rounded-lg">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-frozen-600">
                  {stats.points}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">Punti Totali</p>
              <p className="text-xs text-gray-600 mt-1">
                Ranking #{stats.ranking || 'N/A'}
              </p>
            </div>

            {/* Wins */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-green-700">
                  {stats.wins}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">Vittorie</p>
              <p className="text-xs text-gray-600 mt-1">
                Match vinti
              </p>
            </div>

            {/* Losses */}
            <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500 rounded-lg">
                  <XIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-red-600">
                  {stats.losses}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">Sconfitte</p>
              <p className="text-xs text-gray-600 mt-1">
                Match persi
              </p>
            </div>

            {/* Level Progress */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-purple-600">
                  {stats.level}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">Livello Attuale</p>
              <p className="text-xs text-gray-600 mt-1">
                {stats.level === "Diamante" 
                  ? "Livello massimo raggiunto!" 
                  : `${getPointsToNextLevel(stats.points, stats.level)} punti al prossimo`}
              </p>
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Prestazioni nel Tempo</h3>
            <div className="h-48 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Grafici disponibili a breve</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      <div className="bg-gradient-to-br from-frozen-500 to-frozen-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Continua così!</h3>
              <p className="text-frozen-100 text-sm">
                {stats.level === "Diamante"
                  ? "Hai raggiunto il massimo livello!"
                  : `Sei a ${getPointsToNextLevel(stats.points, stats.level)} punti dal livello successivo`}
              </p>
            </div>
          </div>
          {stats.level !== "Diamante" && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.points}</p>
                <p className="text-frozen-100 text-xs">
                  / {getNextLevelPoints(stats.level)} punti
                </p>
              </div>
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{
                    width: `${(stats.points / getNextLevelPoints(stats.level)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
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
