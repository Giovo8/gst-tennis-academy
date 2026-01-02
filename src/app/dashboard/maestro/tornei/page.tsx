'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Award, Eye } from 'lucide-react';
import StatCard from "@/components/dashboard/StatCard";

interface Tournament {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  tournament_type: string;
  max_participants: number;
  status: string;
  participant_count?: number;
}

export default function MaestroTorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Aperto' | 'In Corso' | 'Completato'>('all');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        const tournamentsWithCounts = await Promise.all(
          (data.tournaments || []).map(async (tournament: Tournament) => {
            const countRes = await fetch(`/api/tournament_participants?tournament_id=${tournament.id}`);
            if (countRes.ok) {
              const countData = await countRes.json();
              return {
                ...tournament,
                participant_count: countData.participants?.length || 0
              };
            }
            return { ...tournament, participant_count: 0 };
          })
        );
        setTournaments(tournamentsWithCounts);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTournamentTypeLabel = (type?: string) => {
    switch(type) {
      case 'eliminazione_diretta': return 'Eliminazione Diretta';
      case 'girone_eliminazione': return 'Girone + Eliminazione';
      case 'campionato': return 'Campionato';
      default: return 'Torneo';
    }
  };

  const getTournamentTypeIcon = (type?: string) => {
    switch(type) {
      case 'campionato': return Award;
      default: return Trophy;
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Aperto': return 'bg-frozen-500/10 text-frozen-400 border-frozen-500/30';
      case 'In Corso':
      case 'In corso': return 'bg-frozen-600/10 text-frozen-400 border-frozen-600/30';
      case 'Completato':
      case 'Concluso': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'In Corso') return t.status === 'In Corso' || t.status === 'In corso';
    if (filterStatus === 'Completato') return t.status === 'Completato' || t.status === 'Concluso';
    return t.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-16 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-accent to-accent-dark" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Area Maestro</p>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Visualizzazione Tornei
        </h1>
        <p className="text-sm text-muted max-w-2xl">
          Monitora tutti i tornei e i campionati dell'accademia
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Tornei Totali"
          value={tournaments.length}
          icon={<Trophy className="h-8 w-8 text-frozen-300" />}
          color="blue"
        />

        <StatCard
          title="Aperti"
          value={tournaments.filter(t => t.status === 'Aperto').length}
          icon={<Calendar className="h-8 w-8 text-frozen-300" />}
          color="green"
        />

        <StatCard
          title="In Corso"
          value={tournaments.filter(t => t.status === 'In Corso' || t.status === 'In corso').length}
          icon={<Trophy className="h-8 w-8 text-frozen-300" />}
          color="yellow"
        />

        <StatCard
          title="Completati"
          value={tournaments.filter(t => t.status === 'Completato' || t.status === 'Concluso').length}
          icon={<Award className="h-8 w-8 text-slate-300" />}
          color="neutral"
        />
      </div>

      {/* Filters */}
      <div className="flex justify-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-accent text-white'
              : 'bg-surface border border-border text-muted hover:text-white'
          }`}
        >
          Tutti
        </button>
        <button
          onClick={() => setFilterStatus('Aperto')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
            filterStatus === 'Aperto'
              ? 'bg-accent text-white'
              : 'bg-surface border border-border text-muted hover:text-white'
          }`}
        >
          Aperti
        </button>
        <button
          onClick={() => setFilterStatus('In Corso')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
            filterStatus === 'In Corso'
              ? 'bg-accent text-white'
              : 'bg-surface border border-border text-muted hover:text-white'
          }`}
        >
          In Corso
        </button>
        <button
          onClick={() => setFilterStatus('Completato')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
            filterStatus === 'Completato'
              ? 'bg-accent text-white'
              : 'bg-surface border border-border text-muted hover:text-white'
          }`}
        >
          Completati
        </button>
      </div>

      {/* Tournaments List */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold text-white">
            Tornei ({filteredTournaments.length})
          </h2>
        </div>
        
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">Nessun torneo trovato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTournaments.map((tournament) => {
              const Icon = getTournamentTypeIcon(tournament.tournament_type);
              
              return (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-5 rounded-xl bg-surface-secondary border border-border hover:border-accent/30 transition-all"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="rounded-lg bg-accent/10 p-3">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-2">{tournament.title}</h3>
                      {tournament.description && (
                        <p className="text-xs text-muted mb-2 line-clamp-1">{tournament.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs overflow-x-auto">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent font-semibold border border-accent/30 whitespace-nowrap">
                          <Icon className="h-4 w-4" />
                          {getTournamentTypeLabel(tournament.tournament_type)}
                        </span>
                        <span className={`px-3 py-1.5 rounded-full font-semibold border whitespace-nowrap ${getStatusColor(tournament.status)}`}>
                          {tournament.status}
                        </span>
                        <span className="text-muted flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(tournament.start_date).toLocaleDateString('it-IT')}
                        </span>
                        <span className="text-muted flex items-center gap-1.5 whitespace-nowrap">
                          <Users className="h-3.5 w-3.5" />
                          {tournament.participant_count || 0}/{tournament.max_participants}
                        </span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/tornei/${tournament.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-semibold whitespace-nowrap"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Visualizza</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
