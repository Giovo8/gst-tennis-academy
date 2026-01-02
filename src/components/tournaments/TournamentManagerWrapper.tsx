'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import TournamentManager from './TournamentManager';

interface TournamentManagerWrapperProps {
  tournamentId: string;
  isAdmin?: boolean;
}

export default function TournamentManagerWrapper({ tournamentId, isAdmin = true }: TournamentManagerWrapperProps) {
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

  const loadTournament = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments?id=${tournamentId}`);
      const data = await res.json();
      
      if (res.ok && data.tournament) {
        // Normalizza il torneo per compatibilità
        const tournament = data.tournament;
        
        // Se ha 'format' ma non 'tournament_type', copia il valore
        if (!tournament.tournament_type && tournament.format) {
          tournament.tournament_type = tournament.format;
        }
        
        // Se ha 'competition_type' ma manca 'tournament_type', usa un default
        if (!tournament.tournament_type) {
          tournament.tournament_type = 'eliminazione_diretta';
        }
        
        // Assicura che abbia 'status' e 'current_phase'
        if (!tournament.status) {
          tournament.status = 'Aperto';
        }
        if (!tournament.current_phase) {
          tournament.current_phase = 'iscrizioni';
        }
        
        setTournament(tournament);
      } else {
        setError(data.error || 'Errore caricamento torneo');
      }
    } catch (err) {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-tournament-primary" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-300">{error || 'Torneo non trovato'}</p>
      </div>
    );
  }

  return <TournamentManager tournament={tournament} isAdmin={isAdmin} />;
}
