import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = supabaseServer;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Torneo non trovato' },
        { status: 404 }
      );
    }

    // Check permissions (admin or gestore)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isGestore = profile?.role === 'gestore';

    if (!isAdmin && !isGestore) {
      return NextResponse.json(
        { error: 'Non hai i permessi per questa azione' },
        { status: 403 }
      );
    }

    // Update tournament status to completed
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ 
        status: 'Concluso',
        current_phase: 'completato'
      })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Error completing tournament:', updateError);
      return NextResponse.json(
        { error: 'Errore nella conclusione del torneo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Torneo concluso con successo',
      tournament_id: tournamentId
    });

  } catch (error) {
    console.error('Error completing tournament:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
