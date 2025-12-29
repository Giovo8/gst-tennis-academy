'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Calendar } from 'lucide-react';
import BracketMatchCard from './BracketMatchCard';

interface Participant {
  id: string;
  user_id: string;
  seed?: number;
  stats?: {
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    sets_won: number;
    sets_lost: number;
    games_won: number;
    games_lost: number;
    points: number;
  };
}

interface Match {
  id: string;
  round_name: string;
  round_number: number;
  match_number: number;
  player1?: Participant;
  player2?: Participant;
  player1_score: number;
  player2_score: number;
  score_details?: any;
  winner_id?: string;
  status: string;
  scheduled_at?: string;
}

interface EliminationBracketProps {
  tournamentId: string;
  maxParticipants: number;
  participants: Participant[];
  bestOf?: number;
  onMatchUpdate?: () => void;
  onBracketGenerated?: () => void;
}

export default function EliminationBracket({
  tournamentId,
  maxParticipants,
  participants,
  bestOf = 3,
  onMatchUpdate,
  onBracketGenerated
}: EliminationBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('EliminationBracket mounted/updated, tournamentId:', tournamentId);
    loadMatches();
    checkAdminRole();
  }, [tournamentId]);

  const checkAdminRole = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(['admin', 'gestore'].includes(profile?.role?.toLowerCase() || ''));
      }
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  const handleScoreSubmit = async (matchId: string, sets: Array<{ player1_score: number; player2_score: number }>) => {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Non autenticato');
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sets })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore nell\'aggiornamento del punteggio');
      }

      await loadMatches();
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    try {
      const url = `/api/tournaments/${tournamentId}/group-matches?phase=eliminazione`;
      console.log('Loading matches from:', url);
      const res = await fetch(url);
      const data = await res.json();
      console.log('API Response:', data);
      console.log('Matches loaded:', data.matches?.length || 0);
      if (res.ok) {
        setMatches(data.matches || []);
      } else {
        console.error('Error response:', data);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBracket = async () => {
    if (!confirm('Sei sicuro di voler generare il bracket? Assicurati che tutti i partecipanti siano iscritti.')) {
      return;
    }
    
    setGenerating(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        setGenerating(false);
        return;
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/generate-bracket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Bracket generated successfully, reloading matches...');
        // Aspetta un attimo prima di ricaricare
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadMatches(); // Ricarica i match
        if (onBracketGenerated) onBracketGenerated(); // Cambia al tab bracket
        if (onMatchUpdate) onMatchUpdate();
        alert(data.message || 'Bracket generato con successo!');
      } else {
        // Se dice che è già generato, prova a ricaricare comunque
        if (data.error?.includes('già stato generato')) {
          await loadMatches();
          if (onBracketGenerated) onBracketGenerated();
        }
        alert(data.error || 'Errore nella generazione del bracket');
      }
    } catch (error) {
      console.error('Error generating bracket:', error);
      alert('Errore nella generazione del bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteMatches = async () => {
    if (!confirm('⚠️ ATTENZIONE: Sei sicuro di voler eliminare tutti i match del bracket?\n\nQuesta azione eliminerà tutti i risultati e dovrai rigenerare il bracket.')) {
      return;
    }
    
    setDeleting(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/delete-matches`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Match eliminati con successo!');
        await loadMatches(); // Ricarica (dovrebbe essere vuoto)
        if (onMatchUpdate) onMatchUpdate();
      } else {
        alert(data.error || 'Errore nell\'eliminazione dei match');
      }
    } catch (error) {
      console.error('Error deleting matches:', error);
      alert('Errore nell\'eliminazione dei match');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  console.log('Matches count:', matches.length); // Debug
  console.log('Participants count:', participants.length); // Debug

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <Trophy className="mx-auto h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Bracket non ancora generato</h3>
        <p className="text-sm text-muted mb-6">
          Hai {participants.length} partecipanti su {maxParticipants} massimi.
          {participants.length >= 2 && ' Puoi generare il bracket.'}
        </p>
        {participants.length >= 2 && (
          <button
            onClick={generateBracket}
            disabled={generating}
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {generating ? 'Generazione...' : 'Genera Bracket'}
          </button>
        )}
      </div>
    );
  }

  // Organizza le partite per round
  const matchesByRound: Record<number, Match[]> = {};
  matches.forEach(match => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = [];
    }
    matchesByRound[match.round_number].push(match);
  });

  // Ordina i round in ordine CRESCENTE (1, 2, 3... verso la finale)
  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Tabellone Eliminazione Diretta</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{participants.length} partecipanti</span>
          {isAdmin && matches.length > 0 && (
            <button
              onClick={handleDeleteMatches}
              disabled={deleting}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              {deleting ? 'Eliminazione...' : 'Rigenera Bracket'}
            </button>
          )}
        </div>
      </div>

      {/* Visualizzazione bracket */}
      <div className="overflow-x-auto">
        <div className="flex gap-8 pb-4" style={{ minWidth: 'fit-content' }}>
          {rounds.map(roundNum => {
            const roundMatches = matchesByRound[roundNum] || [];
            return (
              <div key={roundNum} className="space-y-4" style={{ minWidth: '280px' }}>
                <h4 className="text-center text-sm font-semibold text-accent">
                  {roundMatches[0]?.round_name || `Round ${roundNum}`}
                </h4>
                
                <div className="space-y-3">
                  {roundMatches.map(match => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      isAdmin={isAdmin}
                      bestOf={bestOf}
                      onScoreSubmit={handleScoreSubmit}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
