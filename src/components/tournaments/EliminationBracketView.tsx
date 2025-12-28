'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Calendar } from 'lucide-react';

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
  onMatchUpdate?: () => void;
}

export default function EliminationBracket({
  tournamentId,
  maxParticipants,
  participants,
  onMatchUpdate
}: EliminationBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [tournamentId]);

  const loadMatches = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/group-matches?phase=eliminazione`);
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBracket = async () => {
    setGenerating(true);
    try {
      // TODO: Implementare API per generare bracket
      // Per ora usa logica locale
      
      // Calcola numero di turni
      const numRounds = Math.log2(maxParticipants);
      const roundNames = ['Finale', 'Semifinale', 'Quarti', 'Ottavi', 'Sedicesimi', 'Trentaduesimi'];
      
      // Shuffle participants per il seeding casuale o usa seed esistente
      const seededParticipants = [...participants].sort((a, b) => 
        (a.seed || 0) - (b.seed || 0)
      );
      
      alert('Generazione bracket in sviluppo - implementare API endpoint');
      
    } catch (error) {
      console.error('Error generating bracket:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
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

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Tabellone Eliminazione Diretta</h3>
        <span className="text-sm text-muted">{participants.length} partecipanti</span>
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
                    <MatchCard
                      key={match.id}
                      match={match}
                      onUpdate={onMatchUpdate}
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

function MatchCard({ match, onUpdate }: { match: Match; onUpdate?: () => void }) {
  const isCompleted = match.status === 'completata';
  
  return (
    <div className="rounded-lg border border-border bg-surface-lighter overflow-hidden">
      {/* Player 1 */}
      <div className={`flex items-center justify-between p-3 ${
        isCompleted && match.winner_id === match.player1?.id 
          ? 'bg-accent/20 border-l-4 border-l-accent' 
          : ''
      }`}>
        <span className="text-sm text-white flex-1">
          {match.player1?.user_id || 'TBD'}
        </span>
        {isCompleted && (
          <span className="text-sm font-bold text-white ml-2">
            {match.player1_score}
          </span>
        )}
      </div>
      
      <div className="h-px bg-border" />
      
      {/* Player 2 */}
      <div className={`flex items-center justify-between p-3 ${
        isCompleted && match.winner_id === match.player2?.id 
          ? 'bg-accent/20 border-l-4 border-l-accent' 
          : ''
      }`}>
        <span className="text-sm text-white flex-1">
          {match.player2?.user_id || 'TBD'}
        </span>
        {isCompleted && (
          <span className="text-sm font-bold text-white ml-2">
            {match.player2_score}
          </span>
        )}
      </div>
      
      {/* Status */}
      {!isCompleted && match.player1 && match.player2 && (
        <div className="border-t border-border bg-surface p-2 text-center">
          <span className="text-xs text-muted">
            {match.status === 'programmata' ? 'Da giocare' : 
             match.status === 'in_corso' ? 'In corso' : match.status}
          </span>
        </div>
      )}
    </div>
  );
}
