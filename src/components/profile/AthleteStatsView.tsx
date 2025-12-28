"use client";

import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Target, Flame, Calendar, Award, Activity, Medal } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AthleteStats {
  user_id: string;
  total_matches: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  total_sets: number;
  sets_won: number;
  sets_lost: number;
  total_games: number;
  games_won: number;
  games_lost: number;
  aces: number;
  double_faults: number;
  first_serve_percentage: number;
  first_serve_points_won: number;
  second_serve_points_won: number;
  break_points_won: number;
  break_points_total: number;
  return_games_won: number;
  winners: number;
  unforced_errors: number;
  total_points_won: number;
  longest_win_streak: number;
  current_win_streak: number;
  best_victory: string;
  total_bookings: number;
  total_lessons: number;
  total_tournaments: number;
  last_match_date: string;
}

export default function AthleteStatsView() {
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("athlete_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Nessuna Statistica Disponibile
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Partecipa ai tornei per iniziare a tracciare le tue statistiche!
        </p>
      </div>
    );
  }

  const setDifferential = stats.sets_won - stats.sets_lost;
  const gameDifferential = stats.games_won - stats.games_lost;
  const breakPointConversion = stats.break_points_total > 0
    ? ((stats.break_points_won / stats.break_points_total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Matches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Partite Totali</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total_matches}
              </p>
              <p className="text-sm text-blue-400 mt-1">
                {stats.matches_won}V - {stats.matches_lost}S
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <Trophy className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Percentuale Vittorie</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.win_rate?.toFixed(1) || "0.0"}%
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <p className="text-sm text-blue-400">
                  {stats.current_win_streak > 0 ? `${stats.current_win_streak} consecutive` : "In crescita"}
                </p>
              </div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <Target className="w-8 h-8 text-blue-400 dark:text-blue-300" />
            </div>
          </div>
        </div>

        {/* Sets Record */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Set</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total_sets}
              </p>
              <p className={`text-sm mt-1 ${setDifferential >= 0 ? "text-blue-400" : "text-cyan-400"}`}>
                {setDifferential >= 0 ? "+" : ""}{setDifferential} Set Diff
              </p>
            </div>
            <div className="bg-cyan-100 dark:bg-cyan-900 p-3 rounded-lg">
              <Activity className="w-8 h-8 text-cyan-400 dark:text-cyan-300" />
            </div>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Striscia Record</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.longest_win_streak}
              </p>
              <p className="text-sm text-blue-400 mt-1">vittorie consecutive</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
              <Flame className="w-8 h-8 text-blue-400 dark:text-blue-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Statistiche Servizio
          </h3>

          <div className="space-y-4">
            {/* First Serve % */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Prima di Servizio</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {stats.first_serve_percentage?.toFixed(1) || "0.0"}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.first_serve_percentage || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Aces vs Double Faults */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Aces</p>
                <p className="text-2xl font-bold text-blue-400 dark:text-blue-300">
                  {stats.aces}
                </p>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Doppi Falli</p>
                <p className="text-2xl font-bold text-cyan-400 dark:text-cyan-300">
                  {stats.double_faults}
                </p>
              </div>
            </div>

            {/* First/Second Serve Points Won */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Punti Vinti 1° Servizio</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.first_serve_points_won}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Punti Vinti 2° Servizio</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.second_serve_points_won}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Statistiche Risposta
          </h3>

          <div className="space-y-4">
            {/* Break Points Conversion */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversione Palle Break</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {breakPointConversion}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${breakPointConversion}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.break_points_won} / {stats.break_points_total} palle break convertite
              </p>
            </div>

            {/* Return Games Won */}
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Game di Risposta Vinti</p>
              <p className="text-3xl font-bold text-cyan-400 dark:text-cyan-300 mt-1">
                {stats.return_games_won}
              </p>
            </div>

            {/* Games Differential */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Game Differenziale</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Vinti</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.games_won}</p>
                </div>
                <div className="text-2xl font-bold text-gray-400">vs</div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Persi</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.games_lost}</p>
                </div>
              </div>
              <p className={`text-sm mt-2 font-semibold ${gameDifferential >= 0 ? "text-blue-400" : "text-cyan-400"}`}>
                {gameDifferential >= 0 ? "+" : ""}{gameDifferential} differenziale
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Point Quality Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-400" />
          Qualità dei Punti
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Winners vs Errors */}
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Colpi Vincenti</p>
              <p className="text-3xl font-bold text-blue-400 dark:text-blue-300">{stats.winners}</p>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Errori Non Forzati</p>
              <p className="text-3xl font-bold text-cyan-400 dark:text-cyan-300">{stats.unforced_errors}</p>
            </div>
          </div>

          {/* Ratio Visualization */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Rapporto W/UE</p>
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(stats.winners / (stats.winners + stats.unforced_errors || 1)) * 351.86} 351.86`}
                    className="text-blue-400 dark:text-blue-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {((stats.winners / (stats.winners + stats.unforced_errors || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Points Won */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Punti Totali Vinti</p>
              <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total_points_won}
              </p>
              <p className="text-sm text-gray-500 mt-2">in {stats.total_matches} partite</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Riepilogo Attività
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <Trophy className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Tornei</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_tournaments}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <Activity className="w-8 h-8 text-blue-400 dark:text-blue-300 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Lezioni</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_lessons}</p>
          </div>

          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
            <Calendar className="w-8 h-8 text-cyan-400 dark:text-cyan-300 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Prenotazioni</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_bookings}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <Medal className="w-8 h-8 text-blue-400 dark:text-blue-300 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Ultima Partita</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.last_match_date
                ? new Date(stats.last_match_date).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                  })
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Best Victory */}
      {stats.best_victory && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            <div className="bg-cyan-100 dark:bg-blue-900 p-3 rounded-lg">
              <Medal className="w-8 h-8 text-blue-400 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Miglior Vittoria
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{stats.best_victory}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
