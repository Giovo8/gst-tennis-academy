'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';

interface PlayerStats {
  player_id: string;
  player_name: string;
  tournaments_played: number;
  tournaments_won: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
}

interface ReportData {
  overview: {
    total_tournaments: number;
    active_tournaments: number;
    completed_tournaments: number;
    total_players: number;
    active_players: number;
    total_matches: number;
    completed_matches: number;
    total_sets: number;
  };
  player_rankings: PlayerStats[];
}

export default function ClassifichePage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments/reports');
      
      if (!response.ok) {
        throw new Error('Failed to load report');
      }

      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#1a3d5c] to-[#0a1929] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7de3ff]"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#1a3d5c] to-[#0a1929] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#1a3d5c] to-[#0a1929]">
      {/* Header */}
      <div className="relative border-b border-[#7de3ff]/10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[#7de3ff]/5 blur-3xl" />
          <div className="absolute right-1/4 top-20 h-48 w-48 rounded-full bg-[#4fb3ff]/5 blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff]" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7de3ff]">Tennis Academy</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-white via-[#7de3ff] to-white bg-clip-text text-transparent">
              Classifiche e Statistiche
            </span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Classifica generale dei giocatori basata su tornei giocati, vittorie e performance complessive
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-[#7de3ff]/30 to-[#4fb3ff]/30 rounded-lg ring-1 ring-[#7de3ff]/50">
                <Trophy className="w-6 h-6 text-[#7de3ff]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Tornei Completati</p>
                <p className="text-2xl font-bold text-white">{report.overview.completed_tournaments}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-lg ring-1 ring-green-500/50">
                <Award className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Giocatori Attivi</p>
                <p className="text-2xl font-bold text-white">{report.overview.active_players}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded-lg ring-1 ring-purple-500/50">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Match Giocati</p>
                <p className="text-2xl font-bold text-white">{report.overview.completed_matches}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-orange-500/30 to-orange-600/30 rounded-lg ring-1 ring-orange-500/50">
                <Trophy className="w-6 h-6 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Set Totali</p>
                <p className="text-2xl font-bold text-white">{report.overview.total_sets}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Podio
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 2nd Place */}
            {report.player_rankings[1] && (
              <div className="order-2 md:order-1">
                <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6 text-center">
                  <div className="text-6xl mb-3">🥈</div>
                  <div className="text-3xl font-bold text-gray-300 mb-2">2°</div>
                  <div className="text-xl font-bold text-white mb-4">{report.player_rankings[1].player_name}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Win Rate:</span>
                      <span className="font-bold text-[#7de3ff]">{report.player_rankings[1].win_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Tornei Vinti:</span>
                      <span className="font-bold text-yellow-400">{report.player_rankings[1].tournaments_won}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Match V/S:</span>
                      <span className="font-bold text-white">{report.player_rankings[1].matches_won}/{report.player_rankings[1].matches_lost}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {report.player_rankings[0] && (
              <div className="order-1 md:order-2 md:-mt-6">
                <div className="rounded-xl border-2 border-yellow-400/40 bg-gradient-to-br from-yellow-500/10 via-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6 text-center shadow-2xl shadow-yellow-500/20">
                  <div className="text-7xl mb-3">🥇</div>
                  <div className="text-4xl font-bold text-yellow-400 mb-2">1°</div>
                  <div className="text-2xl font-bold text-white mb-4">{report.player_rankings[0].player_name}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Win Rate:</span>
                      <span className="font-bold text-[#7de3ff]">{report.player_rankings[0].win_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Tornei Vinti:</span>
                      <span className="font-bold text-yellow-400">{report.player_rankings[0].tournaments_won}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Match V/S:</span>
                      <span className="font-bold text-white">{report.player_rankings[0].matches_won}/{report.player_rankings[0].matches_lost}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {report.player_rankings[2] && (
              <div className="order-3">
                <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 to-[#0a1929]/80 backdrop-blur-xl p-6 text-center">
                  <div className="text-6xl mb-3">🥉</div>
                  <div className="text-3xl font-bold text-orange-400 mb-2">3°</div>
                  <div className="text-xl font-bold text-white mb-4">{report.player_rankings[2].player_name}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Win Rate:</span>
                      <span className="font-bold text-[#7de3ff]">{report.player_rankings[2].win_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Tornei Vinti:</span>
                      <span className="font-bold text-yellow-400">{report.player_rankings[2].tournaments_won}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Match V/S:</span>
                      <span className="font-bold text-white">{report.player_rankings[2].matches_won}/{report.player_rankings[2].matches_lost}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Rankings */}
        <div className="rounded-xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#1a3d5c]/80 via-[#0a1929]/90 to-[#0a1929]/80 backdrop-blur-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#7de3ff]/10">
            <h2 className="text-xl font-bold text-white">Classifica Completa</h2>
            <p className="text-sm text-gray-400 mt-1">Tutti i giocatori ordinati per performance</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#0a1929]/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Posizione</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Giocatore</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Tornei</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Vittorie</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Match V/S</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Win Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Set V/S</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7de3ff]/10">
                {report.player_rankings.map((player, idx) => (
                  <tr 
                    key={player.player_id} 
                    className={`transition-colors hover:bg-[#7de3ff]/5 ${
                      idx < 3 ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-white">
                        #{idx + 1}
                        {idx === 0 && ' 🥇'}
                        {idx === 1 && ' 🥈'}
                        {idx === 2 && ' 🥉'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{player.player_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-300">{player.tournaments_played}</div>
                      {player.tournaments_won > 0 && (
                        <div className="text-xs text-yellow-400 font-medium">{player.tournaments_won} 🏆</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-green-400">{player.matches_won}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-300">
                        {player.matches_won} / {player.matches_lost}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-bold ${
                        player.win_rate >= 70 ? 'text-green-400' :
                        player.win_rate >= 50 ? 'text-[#7de3ff]' :
                        'text-gray-400'
                      }`}>
                        {player.win_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-300">
                        {player.sets_won} / {player.sets_lost}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/tornei"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] text-[#0a1929] font-bold transition-all hover:shadow-xl hover:shadow-[#7de3ff]/30 hover:scale-105"
          >
            ← Torna ai Tornei
          </Link>
        </div>
      </div>
    </div>
  );
}
