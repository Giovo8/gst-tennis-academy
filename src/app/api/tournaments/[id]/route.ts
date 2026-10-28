import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { logActivityServer } from '@/lib/activity/logActivity';
import { sanitizeObject } from '@/lib/security/sanitize-server';
import { updateTournamentSchema } from '@/lib/validation/schemas';
import { getBestOf } from '@/lib/tournaments/getBestOf';
import { isMatchPlayed, MATCH_PLAYED_COLUMNS } from '@/lib/tournaments/matchPlayed';
import { getTournamentStructureError } from '@/lib/tournaments/tournamentStructure';
import logger from '@/lib/logger/secure-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH — admin/gestore: modifica un torneo. Nome, descrizione, date e categoria sempre;
 * formato partita solo se nessuna partita è stata giocata (i risultati sono validati col
 * formato); tipo, partecipanti e gironi solo in fase iscrizioni (calendario e tabelloni
 * dipendono da questi). Un cambio di campo bloccato viene rifiutato con 409.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;

    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = updateTournamentSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dati non validi' },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const { data: tournament } = await supabaseServer
      .from('tournaments')
      .select(
        'title, tournament_type, current_phase, max_participants, num_groups, teams_per_group, teams_advancing, match_format, best_of',
      )
      .eq('id', tournamentId)
      .single();
    if (!tournament) {
      return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date,
      category: data.category,
    };

    // Struttura: tipo, partecipanti, gironi
    const isGroups = data.tournament_type === 'girone_eliminazione';
    const structure = {
      tournament_type: data.tournament_type,
      max_participants: data.max_participants,
      num_groups: isGroups ? data.num_groups ?? 0 : 0,
      teams_per_group: isGroups ? data.teams_per_group ?? 0 : 0,
      teams_advancing: isGroups ? data.teams_advancing ?? 0 : 0,
    };
    const typeOrSizeChanged =
      structure.tournament_type !== tournament.tournament_type ||
      structure.max_participants !== (tournament.max_participants ?? 0);
    const groupsChanged =
      isGroups &&
      (structure.num_groups !== (tournament.num_groups ?? 0) ||
        structure.teams_per_group !== (tournament.teams_per_group ?? 0) ||
        structure.teams_advancing !== (tournament.teams_advancing ?? 0));

    // A competizione avviata la struttura non si tocca: i gironi (che i tornei vecchi
    // possono avere vuoti) si ignorano, tipo e partecipanti diversi sono un errore
    const started = Boolean(tournament.current_phase) && tournament.current_phase !== 'iscrizioni';
    if (started && typeOrSizeChanged) {
      return NextResponse.json(
        { error: 'Tipo e numero partecipanti non sono modificabili a competizione avviata' },
        { status: 409 },
      );
    }

    if (!started && (typeOrSizeChanged || groupsChanged)) {
      const structureError = getTournamentStructureError(structure);
      if (structureError) return NextResponse.json({ error: structureError }, { status: 400 });

      const { count } = await supabaseServer
        .from('tournament_participants')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);
      if ((count ?? 0) > structure.max_participants) {
        return NextResponse.json(
          { error: `Ci sono già ${count} iscritti: aumenta il numero di partecipanti` },
          { status: 409 },
        );
      }
      Object.assign(update, structure);
    }

    // Formato partita: confronto sul "best of" effettivo (i tornei legacy non hanno match_format)
    const formatChanged = data.match_format !== `best_of_${getBestOf(tournament)}`;
    if (formatChanged) {
      const { data: matches, error: mErr } = await supabaseServer
        .from('tournament_matches')
        .select(MATCH_PLAYED_COLUMNS)
        .eq('tournament_id', tournamentId);
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
      if ((matches || []).some((m) => isMatchPlayed(m))) {
        return NextResponse.json(
          { error: 'Formato non modificabile: ci sono partite già giocate' },
          { status: 409 },
        );
      }
      update.match_format = data.match_format;
    }

    const { data: updated, error: uErr } = await supabaseServer
      .from('tournaments')
      .update(update)
      .eq('id', tournamentId)
      .select()
      .single();
    if (uErr) {
      logger.error('Errore nella modifica del torneo', uErr);
      return NextResponse.json({ error: 'Modifica non riuscita' }, { status: 500 });
    }

    await logActivityServer({
      userId: auth.data.user.id,
      action: 'tournament.update',
      entityType: 'tournament',
      entityId: tournamentId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        fields: Object.keys(update),
        previousTitle: tournament.title,
        updatedBy: auth.data.user.id,
        updatedByName: auth.data.profile?.full_name ?? null,
      },
    });

    return NextResponse.json({ tournament: updated });
  } catch (error) {
    logger.error('Errore nella modifica del torneo', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
