'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, Calendar, RotateCw } from 'lucide-react';
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
  onDeleteMatches?: () => Promise<void>;
}

export default function EliminationBracket({
  tournamentId,
  maxParticipants,
  participants,
  bestOf = 3,
  onMatchUpdate,
  onBracketGenerated,
  onDeleteMatches
}: EliminationBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
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
    if (!confirm('Sei sicuro di voler rigenerare il bracket? Questa operazione eliminerà tutti i match esistenti e i risultati.')) {
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
      <div className="flex items-center justify-center p-6 sm:p-8 md:p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
        <Trophy className="mx-auto h-12 w-12 text-secondary/40 mb-4" />
        <h3 className="text-lg font-semibold text-secondary mb-2">Bracket non ancora generato</h3>
        <p className="text-sm text-secondary/60 mb-6">
          Hai {participants.length} partecipanti su {maxParticipants} massimi.
          {participants.length >= 2 && ' Puoi generare il bracket.'}
        </p>
        {participants.length >= 2 && (
          <button
            onClick={generateBracket}
            disabled={generating}
            className="rounded-md bg-secondary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
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
      {/* Visualizzazione bracket */}
      <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex gap-4 sm:gap-6 md:gap-8 pb-4" style={{ minWidth: 'fit-content' }}>
          {rounds.map(roundNum => {
            const roundMatches = matchesByRound[roundNum] || [];
            return (
              <div key={roundNum} className="space-y-3 sm:space-y-4" style={{ minWidth: '240px' }}>
                <h4 className="text-center text-sm font-semibold text-secondary">
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
