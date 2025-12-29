'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Target, Award, Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Tournament {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  tournament_type: string;
  max_participants: number;
  status: string;
  participant_count?: number;
  is_enrolled?: boolean;
  enrollment_status?: string;
}

interface Match {
  id: string;
  tournament: {
    title: string;
    tournament_type: string;
  };
  scheduled_time?: string;
  status: string;
  player1?: { profiles?: { full_name: string } };
  player2?: { profiles?: { full_name: string } };
  winner_id?: string;
  sets?: Array<{ player1_score: number; player2_score: number }>;
}

export default function AtletaTorneiPage() {
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get all open tournaments
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['Aperto', 'In Corso', 'In corso'])
        .order('start_date', { ascending: true });

      if (tournamentsError) {
        console.error('Error loading tournaments:', tournamentsError);
        return;
      }

      // Get user's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('tournament_participants')
        .select('tournament_id, status')
        .eq('user_id', user.id);

      if (enrollmentsError) {
        console.error('Error loading enrollments:', enrollmentsError);
        return;
      }

      const enrollmentMap = new Map(
        enrollments?.map(e => [e.tournament_id, e.status]) || []
      );

      // Get participant counts
      const tournamentsWithData = await Promise.all(
        (tournaments || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          return {
            ...tournament,
            participant_count: count || 0,
            is_enrolled: enrollmentMap.has(tournament.id),
            enrollment_status: enrollmentMap.get(tournament.id)
          };
        })
      );

      const enrolled = tournamentsWithData.filter(t => t.is_enrolled);
      const available = tournamentsWithData.filter(t => !t.is_enrolled && t.status === 'Aperto');

      setMyTournaments(enrolled);
      setAvailableTournaments(available);

      // Load user's matches
      const { data: participantIds } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('user_id', user.id);

      if (participantIds && participantIds.length > 0) {
        const ids = participantIds.map(p => p.id);
        
        const { data: matches, error: matchesError } = await supabase
          .from('tournament_matches')
          .select(`
            *,
            tournament:tournaments!tournament_matches_tournament_id_fkey(title, tournament_type),
            player1:tournament_participants!tournament_matches_player1_id_fkey(profiles(full_name)),
            player2:tournament_participants!tournament_matches_player2_id_fkey(profiles(full_name))
          `)
          .or(`player1_id.in.(${ids.join(',')}),player2_id.in.(${ids.join(',')})`)
          .order('scheduled_time', { ascending: true, nullsFirst: false });

        if (!matchesError && matches) {
          setMyMatches(matches as any);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (tournamentId: string) => {
    if (!userId) return;
    
    setEnrolling(tournamentId);
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: userId,
          status: 'accepted'
        });

      if (error) {
        console.error('Error enrolling:', error);
        alert('Errore durante l\'iscrizione');
      } else {
        alert('Iscrizione effettuata con successo!');
        loadData();
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Errore durante l\'iscrizione');
    } finally {
      setEnrolling(null);
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

  const getMatchStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-500/10 text-green-400';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

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
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">I Miei Tornei</p>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Dashboard Tornei
        </h1>
        <p className="text-sm text-muted max-w-2xl">
          Iscriviti ai tornei disponibili e monitora i tuoi match
        </p>
      </div>

      {/* My Matches */}
      {myMatches.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold text-white">I Miei Match</h2>
          </div>
          
          <div className="space-y-3">
            {myMatches.slice(0, 5).map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-secondary border border-border hover:border-accent/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-accent font-semibold">
                      {match.tournament?.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getMatchStatusColor(match.status)}`}>
                      {match.status}
                    </span>
                  </div>
                  <div className="text-sm text-white">
                    {match.player1?.profiles?.full_name || 'TBD'} vs {match.player2?.profiles?.full_name || 'TBD'}
                  </div>
                  {match.sets && match.sets.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {match.sets.map((set, idx) => (
                        <span key={idx} className="text-xs text-muted">
                          {set.player1_score}-{set.player2_score}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {match.scheduled_time && (
                  <div className="text-right">
                    <div className="text-xs text-muted">
                      {new Date(match.scheduled_time).toLocaleDateString('it-IT')}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(match.scheduled_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Tournaments */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold text-white">Tornei a cui Partecipo ({myTournaments.length})</h2>
        </div>
        
        {myTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">Non sei iscritto a nessun torneo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="p-5 rounded-xl bg-surface-secondary border border-border hover:border-accent/30 transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">{tournament.title}</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {getTournamentTypeLabel(tournament.tournament_type)}
                      </span>
                      <span className="text-muted">
                        📅 {new Date(tournament.start_date).toLocaleDateString('it-IT')}
                      </span>
                      <span className="text-muted">
                        👥 {tournament.participant_count || 0}/{tournament.max_participants}
                      </span>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <a
                  href={`/tornei/${tournament.id}`}
                  className="block w-full text-center px-4 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-semibold"
                >
                  Visualizza Torneo
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Tournaments */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold text-white">Tornei Disponibili ({availableTournaments.length})</h2>
        </div>
        
        {availableTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">Nessun torneo disponibile al momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTournaments.map((tournament) => {
              const isFull = (tournament.participant_count || 0) >= tournament.max_participants;
              
              return (
                <div
                  key={tournament.id}
                  className="p-5 rounded-xl bg-surface-secondary border border-border hover:border-accent/30 transition-all"
                >
                  <h3 className="font-bold text-white mb-2">{tournament.title}</h3>
                  <p className="text-xs text-muted mb-3 line-clamp-2">{tournament.description}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs mb-4">
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {getTournamentTypeLabel(tournament.tournament_type)}
                    </span>
                    <span className="text-muted">
                      📅 {new Date(tournament.start_date).toLocaleDateString('it-IT')}
                    </span>
                    <span className={`text-muted ${isFull ? 'text-red-400' : ''}`}>
                      👥 {tournament.participant_count || 0}/{tournament.max_participants}
                    </span>
                  </div>

                  <button
                    onClick={() => handleEnroll(tournament.id)}
                    disabled={isFull || enrolling === tournament.id}
                    className="w-full px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrolling === tournament.id ? 'Iscrizione...' : isFull ? 'Torneo Completo' : 'Iscriviti'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
