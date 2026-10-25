import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { isMatchPlayed, MATCH_PLAYED_COLUMNS } from '@/lib/tournaments/matchPlayed';

/**
 * API per eliminare tutti i match di un torneo
 * DELETE /api/tournaments/[id]/delete-matches
 * Rifiutata se almeno una partita è già stata giocata (i risultati andrebbero persi).
 */

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const auth = await verifyAuth(req, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    // Await params if it's a Promise (Next.js 15+)
    const params = context.params instanceof Promise ? await context.params : context.params;
    const tournamentId = params.id;

    const { data: matches, error: matchesError } = await supabaseServer
      .from('tournament_matches')
      .select(MATCH_PLAYED_COLUMNS)
      .eq('tournament_id', tournamentId);

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    const count = matches?.length ?? 0;
    if (count === 0) {
      return NextResponse.json(
        { message: 'Nessun match da eliminare', deleted: 0 },
        { status: 200 },
      );
    }

    if (matches.some((m) => isMatchPlayed(m))) {
      return NextResponse.json(
        { error: 'Ci sono partite già giocate: calendario non rigenerabile' },
        { status: 409 },
      );
    }

    // Elimina tutti i match del torneo
    const { error: deleteError } = await supabaseServer
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (deleteError) {
      console.error('Error deleting matches:', deleteError);
      return NextResponse.json(
        { error: "Errore nell'eliminazione dei match: " + deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `${count} match eliminati con successo`,
      deleted: count,
    });
  } catch (error) {
    console.error('Error in DELETE /api/tournaments/[id]/delete-matches:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 },
    );
  }
}
