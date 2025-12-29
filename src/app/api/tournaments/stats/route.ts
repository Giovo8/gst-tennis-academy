import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

export async function GET() {
  try {
    const supabase = supabaseServer;

    // Get all tournaments
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, status, tournament_type, start_date');

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
      return NextResponse.json(
        { error: 'Errore nel recupero dei tornei' },
        { status: 500 }
      );
    }

    // Get total participants
    const { count: totalParticipants } = await supabase
      .from('tournament_participants')
      .select('*', { count: 'exact', head: true });

    // Get total matches
    const { count: totalMatches } = await supabase
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true });

    // Get completed matches
    const { count: completedMatches } = await supabase
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Calculate statistics
    const now = new Date();
    const stats = {
      total: tournaments?.length || 0,
      active: tournaments?.filter(t => 
        t.status === 'In Corso' || t.status === 'In corso'
      ).length || 0,
      completed: tournaments?.filter(t => 
        t.status === 'Completato' || t.status === 'Concluso'
      ).length || 0,
      upcoming: tournaments?.filter(t => {
        if (!t.start_date) return false;
        return new Date(t.start_date) > now && (t.status === 'Aperto' || t.status === 'Chiuso');
      }).length || 0,
      totalParticipants: totalParticipants || 0,
      totalMatches: totalMatches || 0,
      completedMatches: completedMatches || 0,
      byType: {
        eliminazione_diretta: tournaments?.filter(t => 
          t.tournament_type === 'eliminazione_diretta'
        ).length || 0,
        girone_eliminazione: tournaments?.filter(t => 
          t.tournament_type === 'girone_eliminazione'
        ).length || 0,
        campionato: tournaments?.filter(t => 
          t.tournament_type === 'campionato'
        ).length || 0,
      }
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error calculating stats:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
