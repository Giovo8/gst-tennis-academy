import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { logActivityServer } from '@/lib/activity/logActivity';
import { sanitizeObject } from '@/lib/security/sanitize-server';
import { addTournamentParticipantSchema } from '@/lib/validation/schemas';
import { planNewParticipantMatches } from '@/lib/tournaments/championshipSchedule';
import logger from '@/lib/logger/secure-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST — admin/gestore: iscrive un atleta (Body: { user_id }) o un ospite senza account
 * (Body: { player_name }) a un campionato già in corso.
 * Inserisce l'iscritto e una partita contro ciascun altro iscritto (vedi
 * planNewParticipantMatches); le partite esistenti, giocate o no, non vengono toccate.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;

    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = addTournamentParticipantSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dati non validi' },
        { status: 400 },
      );
    }
    const { user_id, player_name } = parsed.data;

    const { data: tournament } = await supabaseServer
      .from('tournaments')
      .select('title, tournament_type, status, max_participants')
      .eq('id', tournamentId)
      .single();
    if (!tournament) {
      return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });
    }
    if (tournament.tournament_type !== 'campionato') {
      return NextResponse.json(
        { error: 'Aggiunta possibile solo nei campionati' },
        { status: 400 },
      );
    }
    if (String(tournament.status).toLowerCase() === 'concluso') {
      return NextResponse.json({ error: 'Il campionato è concluso' }, { status: 400 });
    }

    if (user_id) {
      const { data: newProfile } = await supabaseServer
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user_id)
        .single();
      if (!newProfile || String(newProfile.role).toLowerCase() !== 'atleta') {
        return NextResponse.json({ error: 'Atleta non trovato' }, { status: 404 });
      }
    }

    const [{ data: participants, error: pErr }, { data: matches, error: mErr }] = await Promise.all(
      [
        supabaseServer
          .from('tournament_participants')
          .select('id, user_id, player_name')
          .eq('tournament_id', tournamentId),
        supabaseServer
          .from('tournament_matches')
          .select('round_number, match_number, player1_id, player2_id')
          .eq('tournament_id', tournamentId),
      ],
    );
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: 'Calendario non ancora generato' }, { status: 400 });
    }
    const alreadyEnrolled = (participants || []).some((p) =>
      user_id
        ? p.user_id === user_id
        : p.player_name?.trim().toLowerCase() === player_name?.toLowerCase(),
    );
    if (alreadyEnrolled) {
      return NextResponse.json(
        { error: user_id ? 'Atleta già iscritto' : 'Ospite già iscritto' },
        { status: 409 },
      );
    }

    const { data: participant, error: insertErr } = await supabaseServer
      .from('tournament_participants')
      .insert([
        user_id
          ? { user_id, tournament_id: tournamentId }
          : { player_name, tournament_id: tournamentId },
      ])
      .select()
      .single();
    if (insertErr || !participant) {
      return NextResponse.json(
        { error: insertErr?.message || 'Iscrizione non riuscita' },
        { status: 400 },
      );
    }

    const planned = planNewParticipantMatches(
      (participants || []).map((p) => p.id),
      matches,
    );
    let matchNumber = Math.max(0, ...matches.map((m) => m.match_number ?? 0));
    const newMatches = planned.map(({ opponentId, roundNumber }) => ({
      tournament_id: tournamentId,
      phase: 'gironi',
      round_name: `Giornata ${roundNumber}`,
      round_number: roundNumber,
      match_number: ++matchNumber,
      player1_id: participant.id,
      player2_id: opponentId,
      status: 'programmata',
      scheduled_at: null,
    }));

    if (newMatches.length > 0) {
      const { error: matchesErr } = await supabaseServer
        .from('tournament_matches')
        .insert(newMatches);
      if (matchesErr) {
        // Niente iscritto senza partite: si annulla l'iscrizione appena creata
        await supabaseServer.from('tournament_participants').delete().eq('id', participant.id);
        logger.error('Errore nella creazione delle partite del nuovo iscritto', matchesErr);
        return NextResponse.json(
          { error: 'Errore nella creazione delle partite' },
          { status: 500 },
        );
      }
    }

    const participantsCount = (participants?.length ?? 0) + 1;
    if (participantsCount > (tournament.max_participants ?? 0)) {
      await supabaseServer
        .from('tournaments')
        .update({ max_participants: participantsCount })
        .eq('id', tournamentId);
    }

    // Gli ospiti non hanno un account: niente notifica
    if (user_id) {
      const { error: notifyErr } = await supabaseServer.from('notifications').insert({
        user_id,
        type: 'tournament',
        title: 'Iscrizione al campionato',
        message: `Sei stato iscritto a ${tournament.title}: ${
          newMatches.length === 1 ? 'hai 1 partita' : `hai ${newMatches.length} partite`
        } da giocare.`,
        link: `/dashboard/atleta/tornei/${tournamentId}`,
        is_read: false,
      });
      if (notifyErr) logger.error('Errore nella notifica al nuovo iscritto', notifyErr);
    }

    await logActivityServer({
      userId: auth.data.user.id,
      action: 'tournament.add_participant',
      entityType: 'tournament',
      entityId: tournamentId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        participantId: participant.id,
        newUserId: user_id ?? null,
        newPlayerName: player_name ?? null,
        matchesCreated: newMatches.length,
        addedBy: auth.data.user.id,
        addedByName: auth.data.profile?.full_name ?? null,
      },
    });

    return NextResponse.json({ participant, matches_created: newMatches.length }, { status: 201 });
  } catch (error) {
    logger.error("Errore nell'aggiunta dell'iscritto al campionato", error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
