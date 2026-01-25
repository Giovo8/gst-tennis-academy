"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Trophy,
  Star,
  Flame,
  Check,
  X as XIcon,
  Crown,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function StatistichePage() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    setLoading(false);
  }

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "oro":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "argento":
        return <Crown className="h-4 w-4 text-gray-600" />;
      case "bronzo":
        return <Trophy className="h-4 w-4 text-orange-600" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getPointsToNextLevel = (currentPoints: number, currentLevel: string): number => {
    const nextPoints = getNextLevelPoints(currentLevel);
    return nextPoints - currentPoints;
  };

  const getNextLevelPoints = (level: string): number => {
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
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href="/dashboard/atleta/arena" className="hover:text-secondary/80 transition-colors">Arena</Link>
        {" › "}
        <span>Statistiche</span>
      </p>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary">Statistiche</h1>
        <p className="text-secondary/70 text-sm mt-1">
          Il tuo resoconto nella Arena
        </p>
      </div>

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
  );
}
