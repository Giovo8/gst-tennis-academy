'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Target, TrendingUp, Calendar, Award } from 'lucide-react';

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

  const statCards = [
    {
      title: 'Tornei Totali',
      value: stats.total,
      icon: Trophy,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'In Corso',
      value: stats.active,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    {
      title: 'Completati',
      value: stats.completed,
      icon: Award,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'In Arrivo',
      value: stats.upcoming,
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      title: 'Partecipanti',
      value: stats.totalParticipants,
      icon: Users,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Match Totali',
      value: stats.totalMatches,
      icon: Target,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    },
    {
      title: 'Match Completati',
      value: stats.completedMatches,
      icon: Trophy,
      color: 'from-teal-500 to-green-500',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30'
    },
    {
      title: 'Eliminazione Diretta',
      value: stats.byType.eliminazione_diretta,
      icon: Trophy,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-2xl border ${stat.borderColor} ${stat.bgColor} backdrop-blur-xl p-6 transition-all hover:scale-105 hover:shadow-lg`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {stat.title}
                  </p>
                  <Icon className="h-5 w-5 text-accent opacity-60" />
                </div>
                
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.slice(4).map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`rounded-xl border ${stat.borderColor} ${stat.bgColor} p-4 transition-all hover:scale-105`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg ${stat.bgColor} p-2`}>
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted">{stat.title}</p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tournament Types Breakdown */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
          Distribuzione per Tipo
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">Eliminazione Diretta</span>
              <span className="text-sm font-bold text-accent">{stats.byType.eliminazione_diretta}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${(stats.byType.eliminazione_diretta / stats.total) * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">Girone + Eliminazione</span>
              <span className="text-sm font-bold text-accent">{stats.byType.girone_eliminazione}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                style={{ width: `${(stats.byType.girone_eliminazione / stats.total) * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">Campionato</span>
              <span className="text-sm font-bold text-accent">{stats.byType.campionato}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${(stats.byType.campionato / stats.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
