import { NextResponse } from 'next/server';
import { loadPublicScheduledTournamentMatches } from '@/lib/bookings/tournamentBookingsServer';
import { sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/app';

/**
 * GET /api/tournaments/[id]/scheduled-matches
 * Pubblico: partite prenotate in arrivo di un torneo in corso (sezione "In programma").
 * Restituisce solo nomi dei giocatori, turno, campo e orari.
 */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!sanitizeUuid(id)) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.INVALID_INPUT },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  try {
    const matches = await loadPublicScheduledTournamentMatches(id);
    return NextResponse.json({ matches });
  } catch (err: unknown) {
    logger.error('Error loading scheduled tournament matches', err, { tournamentId: id });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
