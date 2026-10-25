import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { sanitizeUuid } from '@/lib/security/sanitize-server';
import { HTTP_STATUS, ERROR_MESSAGES, COMPETITION_TYPE } from '@/lib/constants/app';
import type { CompetitionType } from '@/lib/constants/app';
import logger from '@/lib/logger/secure-logger';

/**
 * GET /api/tournaments — pubblico (usato anche dalle pagine /tornei).
 *   ?id=<uuid>           dettaglio + numero di iscritti
 *   ?upcoming=true       solo "Aperte le Iscrizioni" / "In Corso"
 *   ?type=torneo|campionato
 *   ?includeCounts=true  aggiunge current_participants a ogni torneo
 * La creazione passa da POST /api/tournaments/create.
 */
export async function GET(req: Request) {
  const startTime = Date.now();
  const requestTimeout = 8000;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const upcoming = url.searchParams.get('upcoming');
    const type = url.searchParams.get('type') as CompetitionType | null;
    const includeCounts = url.searchParams.get('includeCounts') === 'true';

    // Validate UUID if provided
    if (id && !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (id) {
      const { data, error } = await supabase.from('tournaments').select(`*`).eq('id', id).single();

      if (error || !data) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.NOT_FOUND },
          { status: HTTP_STATUS.NOT_FOUND },
        );
      }

      const { count, error: countErr } = await supabase
        .from('tournament_participants')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', id);

      if (countErr) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.SERVER_ERROR },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
        );
      }

      return NextResponse.json({ tournament: data, current_participants: count ?? 0 });
    }

    // Build query for list of tournaments
    let query = supabase.from('tournaments').select('*').order('start_date', { ascending: true });

    if (upcoming === 'true') {
      query = query.in('status', ['Aperte le Iscrizioni', 'In Corso']);
    }

    if (type && (type === COMPETITION_TYPE.TORNEO || type === COMPETITION_TYPE.CAMPIONATO)) {
      query = query.eq('competition_type', type);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[API/tournaments] Database error', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // Check timeout before processing results
    if (Date.now() - startTime > requestTimeout) {
      return NextResponse.json({ tournaments: data || [] });
    }

    // Only add participant counts if explicitly requested AND time permits
    let result = data || [];
    if (includeCounts && result.length > 0 && Date.now() - startTime < requestTimeout - 2000) {
      result = await Promise.all(
        result.map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);
          return { ...tournament, current_participants: count ?? 0 };
        }),
      );
    }

    return NextResponse.json({ tournaments: result });
  } catch (error) {
    logger.error('[API/tournaments] GET failed', error, { duration: Date.now() - startTime });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

/** DELETE /api/tournaments?id=<uuid> — elimina il torneo (iscritti e partite a cascata). */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const auth = await verifyAuth(req, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    const { error } = await supabase.from('tournaments').delete().eq('id', id);

    if (error) {
      logger.error('[API/tournaments] DELETE failed', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[API/tournaments] DELETE exception', error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
