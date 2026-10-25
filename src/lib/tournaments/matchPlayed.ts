/**
 * Partita "giocata": ha un risultato (set, vincitore) o è chiusa con esito (anche walkover).
 * Le partite annullate o solo programmate non contano. Condivisa tra API e UI per
 * sostituzione dei partecipanti e rigenerazione del calendario del campionato.
 */
export interface MatchResultFields {
  status?: string | null;
  match_status?: string | null;
  winner_id?: string | null;
  sets?: unknown;
}

export const MATCH_PLAYED_COLUMNS = 'status, match_status, winner_id, sets';

export function isMatchPlayed(match: MatchResultFields): boolean {
  if (match.winner_id) return true;
  if (Array.isArray(match.sets) && match.sets.length > 0) return true;
  if (match.status === 'completata' || match.status === 'walkover') return true;
  return match.match_status === 'completed';
}

/** Id dei partecipanti che hanno giocato almeno una partita. */
export function getParticipantsWithPlayedMatches(
  matches: (MatchResultFields & { player1_id?: string | null; player2_id?: string | null })[],
): Set<string> {
  const ids = new Set<string>();
  for (const m of matches) {
    if (!isMatchPlayed(m)) continue;
    if (m.player1_id) ids.add(m.player1_id);
    if (m.player2_id) ids.add(m.player2_id);
  }
  return ids;
}
