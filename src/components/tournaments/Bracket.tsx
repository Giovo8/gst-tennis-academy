"use client";

import React from "react";

type RawParticipant = any;

interface BracketProps {
  participants: RawParticipant[];
  tournamentId: string;
  maxParticipants: number;
  roundsData?: any[];
}

interface Match {
  player1: string;
  player2: string;
  winner?: string;
  score?: string;
  isBye: boolean;
}

function nextPowerOfTwo(n: number) {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(1, n))));
}

function displayName(p: RawParticipant) {
  if (!p) return 'TBD';
  if (typeof p === 'string') return p;
  if (p.name) return p.name;
  if (p.full_name) return p.full_name;
  if (p.profiles && p.profiles.full_name) return p.profiles.full_name;
  if (p.user?.full_name) return p.user.full_name;
  if (p.user_id) return p.user_id;
  return 'TBD';
}

function getRoundName(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndex;
  if (fromEnd === 1) return 'Finale';
  if (fromEnd === 2) return 'Semifinale';
  if (fromEnd === 3) return 'Quarti';
  if (fromEnd === 4) return 'Ottavi';
  return `Turno ${roundIndex + 1}`;
}

export default function Bracket({ 
  participants, 
  tournamentId,
  maxParticipants,
  roundsData = []
}: BracketProps) {
  const names = (participants || []).map(displayName).filter(Boolean);
  const total = names.length;
  
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 text-center">
        <p className="text-muted-2">
          Nessun partecipante ancora. Il tabellone verrà generato quando ci saranno iscrizioni.
        </p>
      </div>
    );
  }

  const size = nextPowerOfTwo(maxParticipants || total);
  const padded = [...names];
  
  // Add BYE spots if needed
  while (padded.length < size) {
    padded.push('BYE');
  }

  // Build rounds structure
  const rounds: Match[][] = [];
  let currentRound = padded.slice();
  
  // First round - pair up participants
  const firstRoundMatches: Match[] = [];
  for (let i = 0; i < currentRound.length; i += 2) {
    const player1 = currentRound[i] || 'TBD';
    const player2 = currentRound[i + 1] || 'TBD';
    const isBye = player1 === 'BYE' || player2 === 'BYE';
    
    // If one player is BYE, the other automatically advances
    let winner: string | undefined;
    if (player1 === 'BYE' && player2 !== 'TBD' && player2 !== 'BYE') {
      winner = player2;
    } else if (player2 === 'BYE' && player1 !== 'TBD' && player1 !== 'BYE') {
      winner = player1;
    }
    
    firstRoundMatches.push({
      player1,
      player2,
      winner,
      isBye
    });
  }
  rounds.push(firstRoundMatches);

  // Subsequent rounds - create structure for winners
  let previousRound = firstRoundMatches;
  while (previousRound.length > 1) {
    const nextRound: Match[] = [];
    for (let i = 0; i < previousRound.length; i += 2) {
      const match1 = previousRound[i];
      const match2 = previousRound[i + 1];
      
      const player1 = match1?.winner || 'TBD';
      const player2 = match2?.winner || 'TBD';
      
      nextRound.push({
        player1,
        player2,
        isBye: false
      });
    }
    rounds.push(nextRound);
    previousRound = nextRound;
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-4 md:gap-8 min-w-max">
          {rounds.map((round, roundIndex) => {
            const roundName = getRoundName(roundIndex, rounds.length);
            
            return (
              <div key={roundIndex} className="min-w-[160px] md:min-w-[200px]">
                <div className="mb-3 md:mb-4 sticky top-0 bg-[#031226]/95 backdrop-blur py-2 z-10">
                  <h4 className="text-xs md:text-sm font-semibold text-white">{roundName}</h4>
                  <p className="text-[10px] md:text-xs text-muted-2">{round.length} {round.length === 1 ? 'match' : 'matches'}</p>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  {round.map((match, matchIndex) => {
                    const isFinished = !!match.winner;
                    const hasBye = match.isBye;
                    
                    return (
                      <div 
                        key={matchIndex} 
                        className={`rounded-lg md:rounded-xl border p-3 md:p-4 transition-all ${
                          hasBye 
                            ? 'border-cyan-500/30 bg-cyan-500/5'
                            : isFinished
                            ? 'border-blue-500/30 bg-blue-500/5'
                            : 'border-[#2f7de1]/30 bg-[#1a3d5c]/60'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Player 1 */}
                          <div 
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              match.player1 === 'BYE'
                                ? 'bg-cyan-500/10 text-cyan-400'
                                : match.winner === match.player1
                                ? 'bg-[#7de3ff]/15 text-[#7de3ff] font-semibold'
                                : match.player1 === 'TBD'
                                ? 'bg-[#0c1424]/40 text-muted-2 italic'
                                : 'bg-[#0c1424]/60 text-white'
                            }`}
                          >
                            <span className="text-xs md:text-sm truncate">{match.player1}</span>
                            {match.winner === match.player1 && (
                              <span className="ml-2 text-xs">✓</span>
                            )}
                          </div>
                          
                          {/* VS divider */}
                          <div className="text-center">
                            <span className="text-[10px] md:text-xs text-muted-2 uppercase tracking-wider">vs</span>
                          </div>
                          
                          {/* Player 2 */}
                          <div 
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              match.player2 === 'BYE'
                                ? 'bg-cyan-500/10 text-cyan-400'
                                : match.winner === match.player2
                                ? 'bg-[#7de3ff]/15 text-[#7de3ff] font-semibold'
                                : match.player2 === 'TBD'
                                ? 'bg-[#0c1424]/40 text-muted-2 italic'
                                : 'bg-[#0c1424]/60 text-white'
                            }`}
                          >
                            <span className="text-xs md:text-sm truncate">{match.player2}</span>
                            {match.winner === match.player2 && (
                              <span className="ml-2 text-xs">✓</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Score display if available */}
                        {match.score && (
                          <div className="mt-2 pt-2 border-t border-[#2f7de1]/20 text-center">
                            <span className="text-xs text-muted-2">{match.score}</span>
                          </div>
                        )}
                        
                        {/* BYE indicator */}
                        {hasBye && (
                          <div className="mt-2 pt-2 border-t border-cyan-500/20 text-center">
                            <span className="text-xs text-cyan-400">Auto-avanzamento</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#7de3ff]/15 border border-[#7de3ff]/30"></div>
          <span>Vincitore</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500/10 border border-cyan-500/30"></div>
          <span>BYE (Passaggio automatico)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#0c1424]/40 border border-[#2f7de1]/30"></div>
          <span>Da determinare</span>
        </div>
      </div>
    </div>
  );
}
