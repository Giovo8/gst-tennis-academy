'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

interface TournamentStats {
  total: number;
  active: number;
  completed: number;
  upcoming: number;
  totalParticipants: number;
  totalMatches: number;
  completedMatches: number;
  byType: {
    eliminazione_diretta: number;
    girone_eliminazione: number;
    campionato: number;
  };
}

export default function TournamentStats() {
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/tournaments/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6 animate-pulse">
            <div className="h-4 w-20 bg-surface-secondary rounded mb-4" />
            <div className="h-8 w-16 bg-surface-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Tornei Totali"
          value={stats.total}
          icon={<Trophy className="h-8 w-8 text-frozen-300" />}
          color="blue"
        />
        <StatCard
          title="In Corso"
          value={stats.active}
          icon={<TrendingUp className="h-8 w-8 text-emerald-300" />}
          color="green"
        />
        <StatCard
          title="Completati"
          value={stats.completed}
          icon={<Award className="h-8 w-8 text-amber-300" />}
          color="yellow"
        />
        <StatCard
          title="In Arrivo"
          value={stats.upcoming}
          icon={<Calendar className="h-8 w-8 text-violet-300" />}
          color="violet"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Partecipanti"
          value={stats.totalParticipants}
          icon={<Users className="h-8 w-8 text-teal-300" />}
          color="teal"
          size="sm"
        />
        <StatCard
          title="Match Totali"
          value={stats.totalMatches}
          icon={<Target className="h-8 w-8 text-orange-300" />}
          color="orange"
          size="sm"
        />
        <StatCard
          title="Match Completati"
          value={stats.completedMatches}
          icon={<Trophy className="h-8 w-8 text-lime-300" />}
          color="lime"
          size="sm"
        />
        <StatCard
          title="Eliminazione Diretta"
          value={stats.byType.eliminazione_diretta}
          icon={<Trophy className="h-8 w-8 text-red-300" />}
          color="red"
          size="sm"
        />
      </div>

      {/* Tournament Types Breakdown */}
      <div className="rounded-2xl border-2 border-frozen-400/50 bg-frozen-500/25 backdrop-blur-sm p-6 hover:border-frozen-400/70 hover:shadow-xl hover:shadow-frozen-500/30 transition-all duration-300">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-frozen-400" />
          Distribuzione per Tipo
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium">Eliminazione Diretta</span>
              <span className="text-sm font-bold text-frozen-300">{stats.byType.eliminazione_diretta}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-frozen-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.byType.eliminazione_diretta / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium">Girone + Eliminazione</span>
              <span className="text-sm font-bold text-frozen-300">{stats.byType.girone_eliminazione}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-frozen-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.byType.girone_eliminazione / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium">Campionato</span>
              <span className="text-sm font-bold text-frozen-300">{stats.byType.campionato}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-frozen-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.byType.campionato / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
