import { NextResponse } from "next/server";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import {
  loadBookableTournamentList,
  loadTournamentMatchesForBooking,
} from "@/lib/bookings/tournamentBookingsServer";
import { sanitizeUuid } from "@/lib/security/sanitize-server";
import logger from "@/lib/logger/secure-logger";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/lib/constants/app";

/**
 * GET /api/bookings/tournament-matches
 *   senza parametri      -> { tournaments }: elenco leggero dei tornei in corso prenotabili
 *   ?tournament_id=<uuid> -> { matches }: partite aperte prenotabili di quel torneo
 * Atleti/maestri: solo tornei a cui sono iscritti e solo le proprie partite.
 * Admin/gestore: tutti i tornei in corso e tutte le partite.
 */
export async function GET(req: Request) {
  const authResult = await verifyAuth(req);
  if (!authResult.success) {
    return authResult.response;
  }

  const { user, profile } = authResult.data;
  const viewer = { userId: user.id, isPrivileged: isAdminOrGestore(profile?.role) };

  try {
    const tournamentId = new URL(req.url).searchParams.get("tournament_id");

    if (tournamentId) {
      if (!sanitizeUuid(tournamentId)) {
        return NextResponse.json({ error: ERROR_MESSAGES.INVALID_INPUT }, { status: HTTP_STATUS.BAD_REQUEST });
      }

      const result = await loadTournamentMatchesForBooking(tournamentId, viewer);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ matches: result.matches });
    }

    const tournaments = await loadBookableTournamentList(viewer);
    return NextResponse.json({ tournaments });
  } catch (err: unknown) {
    logger.error("Error loading bookable tournament matches", err, { userId: user.id });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
