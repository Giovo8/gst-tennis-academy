'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Award, Users, Target, BarChart3, Loader2 } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rankings' | 'tournaments'>('overview');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tournaments/reports');
      
      if (!response.ok) {
        setError('Impossibile caricare il report dei tornei.');
        setReport(null);
        return;
      }

      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      console.error('Error loading report:', error);
      setError('Errore durante il caricamento del report dei tornei.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !loading) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 flex items-start gap-3">
        <div className="mt-1 h-2 w-2 rounded-full bg-red-500" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button
            type="button"
            onClick={loadReport}
            className="inline-flex items-center rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-all"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/70">Caricamento statistiche...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20 rounded-xl bg-white">
        <BarChart3 className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
        <h3 className="text-xl font-semibold text-secondary mb-2">Nessun dato disponibile</h3>
        <p className="text-secondary/70">Le statistiche verranno visualizzate qui</p>
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
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'text-white bg-secondary'
              : 'bg-white text-secondary/70 hover:bg-secondary/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Panoramica
        </button>
        <button
          onClick={() => setActiveTab('rankings')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'rankings'
              ? 'text-white bg-secondary'
              : 'bg-white text-secondary/70 hover:bg-secondary/5'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Classifiche
        </button>
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'tournaments'
              ? 'text-white bg-secondary'
              : 'bg-white text-secondary/70 hover:bg-secondary/5'
          }`}
        >
          <Target className="w-4 h-4" />
          Tornei
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-md p-5 border-l-4 border-secondary">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">Tornei Totali</p>
                  <p className="text-3xl font-bold text-secondary mt-2">{report.overview.total_tournaments}</p>
                  <p className="text-xs text-secondary/60 mt-1">
                    {report.overview.active_tournaments} attivi · {report.overview.completed_tournaments} completati
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-secondary/40" />
              </div>
            </div>

            <div className="bg-white rounded-md p-5 border-l-4 border-emerald-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">Giocatori</p>
                  <p className="text-3xl font-bold text-secondary mt-2">{report.overview.total_players}</p>
                  <p className="text-xs text-secondary/60 mt-1">
                    {report.overview.active_players} attivi
                  </p>
                </div>
                <Users className="w-8 h-8 text-emerald-500/40" />
              </div>
            </div>

            <div className="bg-white rounded-md p-5 border-l-4 border-purple-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">Match Totali</p>
                  <p className="text-3xl font-bold text-secondary mt-2">{report.overview.total_matches}</p>
                  <p className="text-xs text-secondary/60 mt-1">
                    {report.overview.completed_matches} completati
                  </p>
                </div>
                <Target className="w-8 h-8 text-purple-500/40" />
              </div>
            </div>

            <div className="bg-white rounded-md p-5 border-l-4 border-orange-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">Set Giocati</p>
                  <p className="text-3xl font-bold text-secondary mt-2">{report.overview.total_sets}</p>
                  <p className="text-xs text-secondary/60 mt-1">
                    Totali
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500/40" />
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most Tournament Wins */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Più Tornei Vinti
              </h3>
              <div className="space-y-3">
                {report.top_performers.most_tournaments_won.length === 0 ? (
                  <p className="text-sm text-secondary/60 text-center py-4">Nessun torneo completato</p>
                ) : (
                  report.top_performers.most_tournaments_won.map((player, idx) => (
                    <div key={player.player_id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-secondary/60 w-6">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-secondary">{player.player_name}</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-600">{player.tournaments_won} 🏆</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Highest Win Rate */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Miglior Win Rate
              </h3>
              <div className="space-y-3">
                {report.top_performers.highest_win_rate.length === 0 ? (
                  <p className="text-sm text-secondary/60 text-center py-4">Dati insufficienti (min 5 match)</p>
                ) : (
                  report.top_performers.highest_win_rate.map((player, idx) => (
                    <div key={player.player_id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-secondary/60 w-6">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-secondary">{player.player_name}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{player.win_rate.toFixed(1)}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Most Active Players */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-secondary" />
                Più Attivi
              </h3>
              <div className="space-y-3">
                {report.top_performers.most_matches_played.length === 0 ? (
                  <p className="text-sm text-secondary/60 text-center py-4">Nessun match giocato</p>
                ) : (
                  report.top_performers.most_matches_played.map((player, idx) => (
                    <div key={player.player_id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-secondary/60 w-6">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-secondary">{player.player_name}</span>
                      </div>
                      <span className="text-sm font-bold text-secondary">{player.matches_played} match</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Tab */}
      {activeTab === 'rankings' && (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-white rounded-lg px-5 py-3 mb-3">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1 text-xs font-bold text-secondary/60 uppercase">#</div>
              <div className="col-span-3 text-xs font-bold text-secondary/60 uppercase">Giocatore</div>
              <div className="col-span-1 text-center text-xs font-bold text-secondary/60 uppercase">Tornei</div>
              <div className="col-span-1 text-center text-xs font-bold text-secondary/60 uppercase">🏆</div>
              <div className="col-span-2 text-center text-xs font-bold text-secondary/60 uppercase">Match V/P</div>
              <div className="col-span-1 text-center text-xs font-bold text-secondary/60 uppercase">Win %</div>
              <div className="col-span-2 text-center text-xs font-bold text-secondary/60 uppercase">Set V/P</div>
              <div className="col-span-1 text-center text-xs font-bold text-secondary/60 uppercase">Game V/P</div>
            </div>
          </div>

          {/* Data Rows */}
          {report.player_rankings.length === 0 ? (
            <div className="text-center py-20 rounded-xl bg-white">
              <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
              <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna classifica disponibile</h3>
              <p className="text-secondary/70">Le classifiche verranno visualizzate quando ci saranno match completati</p>
            </div>
          ) : (
            report.player_rankings.map((player, idx) => {
              const borderColor = idx === 0 ? 'border-yellow-500' : idx === 1 ? 'border-gray-400' : idx === 2 ? 'border-orange-600' : 'border-secondary';
              return (
                <div
                  key={player.player_id}
                  className={`bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 ${borderColor}`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <span className="text-sm font-bold text-secondary">
                        #{idx + 1}
                        {idx === 0 && ' 🥇'}
                        {idx === 1 && ' 🥈'}
                        {idx === 2 && ' 🥉'}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <div className="font-bold text-secondary">{player.player_name}</div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-semibold text-secondary">{player.tournaments_played}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-bold text-yellow-600">
                        {player.tournaments_won > 0 ? player.tournaments_won : '-'}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm text-secondary">
                        <span className="font-bold text-emerald-600">{player.matches_won}</span> / <span className="text-red-600">{player.matches_lost}</span>
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-sm font-bold ${
                        player.win_rate >= 70 ? 'text-emerald-600' :
                        player.win_rate >= 50 ? 'text-secondary' :
                        'text-secondary/60'
                      }`}>
                        {player.win_rate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm text-secondary">
                        {player.sets_won} / {player.sets_lost}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs text-secondary/70">
                        {player.games_won}/{player.games_lost}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tournaments Tab */}
      {activeTab === 'tournaments' && (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-white rounded-lg px-5 py-3 mb-3">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4 text-xs font-bold text-secondary/60 uppercase">Torneo</div>
              <div className="col-span-2 text-center text-xs font-bold text-secondary/60 uppercase">Tipo</div>
              <div className="col-span-1 text-center text-xs font-bold text-secondary/60 uppercase">Stato</div>
              <div className="col-span-2 text-center text-xs font-bold text-secondary/60 uppercase">Data</div>
              <div className="col-span-1 text-center text-xs font-bold text-secondary/60 uppercase">Partecip.</div>
              <div className="col-span-2 text-center text-xs font-bold text-secondary/60 uppercase">Completamento</div>
            </div>
          </div>

          {/* Data Rows */}
          {report.tournament_stats.length === 0 ? (
            <div className="text-center py-20 rounded-xl bg-white">
              <Target className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
              <h3 className="text-xl font-semibold text-secondary mb-2">Nessun torneo disponibile</h3>
              <p className="text-secondary/70">Le statistiche dei tornei verranno visualizzate qui</p>
            </div>
          ) : (
            report.tournament_stats.map((tournament) => {
              let borderColor = '#034863'; // secondary - default
              if (tournament.status === 'Aperto') {
                borderColor = '#10b981'; // emerald
              } else if (tournament.status === 'In Corso' || tournament.status === 'In corso') {
                borderColor = '#034863'; // secondary
              } else if (tournament.status === 'Completato' || tournament.status === 'Concluso' || tournament.status === 'Chiuso') {
                borderColor = '#6b7280'; // gray
              }

              return (
                <div
                  key={tournament.id}
                  className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <div className="font-bold text-secondary">{tournament.title}</div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-xs px-2 py-1 rounded-md bg-secondary/10 text-secondary font-medium">
                        {getTournamentTypeLabel(tournament.tournament_type)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        tournament.status === 'Completato' || tournament.status === 'Concluso'
                          ? 'bg-gray-100 text-gray-700'
                          : tournament.status === 'In Corso' || tournament.status === 'In corso'
                          ? 'bg-secondary/10 text-secondary'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-sm text-secondary/70">
                      {new Date(tournament.start_date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="col-span-1 text-center text-sm font-semibold text-secondary">
                      {tournament.participants_count}
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-secondary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(tournament.completion_rate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-secondary w-12 text-right">
                          {tournament.completion_rate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-secondary/60 text-center mt-1">
                        {tournament.matches_completed}/{tournament.matches_total} match
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
