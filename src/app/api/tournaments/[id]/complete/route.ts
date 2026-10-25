import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    const supabase = supabaseServer;

    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });
    }

    // Update tournament status to completed
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({
        status: 'Concluso',
        current_phase: 'completato',
      })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Error completing tournament:', updateError);
      return NextResponse.json({ error: 'Errore nella conclusione del torneo' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Torneo concluso con successo',
      tournament_id: tournamentId,
    });
  } catch (error) {
    console.error('Error completing tournament:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
