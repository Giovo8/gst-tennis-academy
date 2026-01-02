'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Award, Users, Target, BarChart3 } from 'lucide-react';

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

interface TournamentStat {
  id: string;
  title: string;
  tournament_type: string;
  status: string;
  start_date: string;
  participants_count: number;
  matches_total: number;
  matches_completed: number;
  completion_rate: number;
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
  tournament_stats: TournamentStat[];
  top_performers: {
    most_tournaments_won: PlayerStats[];
    highest_win_rate: PlayerStats[];
    most_matches_played: PlayerStats[];
  };
}

export default function TournamentReports() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'rankings' | 'tournaments'>('overview');

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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nessun dato disponibile
      </div>
    );
  }

  const getTournamentTypeLabel = (type: string) => {
    switch (type) {
      case 'eliminazione_diretta': return 'Eliminazione Diretta';
      case 'girone_eliminazione': return 'Girone + Eliminazione';
      case 'campionato': return 'Campionato';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline-block w-5 h-5 mr-2" />
            Panoramica
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rankings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Trophy className="inline-block w-5 h-5 mr-2" />
            Classifiche
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tournaments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Target className="inline-block w-5 h-5 mr-2" />
            Tornei
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Tornei Totali</p>
                  <p className="text-2xl font-bold text-gray-900">{report.overview.total_tournaments}</p>
                  <p className="text-xs text-gray-500">
                    {report.overview.active_tournaments} attivi, {report.overview.completed_tournaments} completati
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Giocatori</p>
                  <p className="text-2xl font-bold text-gray-900">{report.overview.total_players}</p>
                  <p className="text-xs text-gray-500">
                    {report.overview.active_players} attivi
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Match</p>
                  <p className="text-2xl font-bold text-gray-900">{report.overview.total_matches}</p>
                  <p className="text-xs text-gray-500">
                    {report.overview.completed_matches} completati
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Set Totali</p>
                  <p className="text-2xl font-bold text-gray-900">{report.overview.total_sets}</p>
                  <p className="text-xs text-gray-500">
                    Giocati
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most Tournament Wins */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                Più Tornei Vinti
              </h3>
              <div className="space-y-3">
                {report.top_performers.most_tournaments_won.map((player, idx) => (
                  <div key={player.player_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500 w-6">#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{player.player_name}</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-600">{player.tournaments_won} 🏆</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Highest Win Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Miglior Win Rate
              </h3>
              <div className="space-y-3">
                {report.top_performers.highest_win_rate.map((player, idx) => (
                  <div key={player.player_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500 w-6">#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{player.player_name}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">{player.win_rate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Active Players */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-600" />
                Più Attivi
              </h3>
              <div className="space-y-3">
                {report.top_performers.most_matches_played.map((player, idx) => (
                  <div key={player.player_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500 w-6">#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{player.player_name}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{player.matches_played} match</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Tab */}
      {activeTab === 'rankings' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Classifica Generale Giocatori</h3>
            <p className="text-sm text-gray-600 mt-1">Top 50 giocatori per performance complessive</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giocatore</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tornei</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Vittorie</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Match V/S</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Set V/S</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Game V/S</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.player_rankings.map((player, idx) => (
                  <tr key={player.player_id} className={idx < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        #{idx + 1}
                        {idx === 0 && ' 🥇'}
                        {idx === 1 && ' 🥈'}
                        {idx === 2 && ' 🥉'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.player_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{player.tournaments_played}</div>
                      {player.tournaments_won > 0 && (
                        <div className="text-xs text-yellow-600 font-medium">{player.tournaments_won} 🏆</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-green-600">{player.matches_won}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">
                        {player.matches_won} / {player.matches_lost}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-bold ${
                        player.win_rate >= 70 ? 'text-green-600' :
                        player.win_rate >= 50 ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {player.win_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">
                        {player.sets_won} / {player.sets_lost}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">
                        {player.games_won} / {player.games_lost}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tournaments Tab */}
      {activeTab === 'tournaments' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Statistiche Tornei</h3>
            <p className="text-sm text-gray-600 mt-1">Dettagli su tutti i tornei organizzati</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Torneo</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Partecipanti</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Match</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completamento</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.tournament_stats.map((tournament) => (
                  <tr key={tournament.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tournament.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-xs text-gray-600">
                        {getTournamentTypeLabel(tournament.tournament_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tournament.status === 'Completato' || tournament.status === 'Concluso'
                          ? 'bg-blue-100 text-primary'
                          : tournament.status === 'In Corso' || tournament.status === 'In corso'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tournament.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {new Date(tournament.start_date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {tournament.participants_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {tournament.matches_completed} / {tournament.matches_total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${tournament.completion_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{tournament.completion_rate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
