/**
 * Helper puri per le pagine di dettaglio di una sfida Arena (admin e atleta/maestro):
 * etichette, date e lettura del punteggio "6-4, 3-6, 7-5".
 */

type ChallengeLike = {
  challenger_id: string;
  opponent_id: string;
  winner_id?: string | null;
  scheduled_date?: string | null;
  challenger?: { full_name: string } | null;
  opponent?: { full_name: string } | null;
  booking?: { start_time: string } | null;
};

/** Punteggio valido: set separati da virgola, es. "6-4, 3-6, 7-5". */
export const SCORE_PATTERN = /^\d+-\d+(?:,\s*\d+-\d+)*$/;

/** Set del punteggio come coppie [sfidante, sfidato]; i set malformati sono scartati. */
function parseSets(score: string): [number, number][] {
  return score
    .split(',')
    .map((s) => s.trim().match(/^(\d+)-(\d+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [Number(m[1]), Number(m[2])]);
}

export function getPlayerInitial(name?: string) {
  return name?.trim().charAt(0).toUpperCase() || 'U';
}

export function getWinnerName(challenge: ChallengeLike) {
  if (!challenge.winner_id) return null;
  if (challenge.winner_id === challenge.challenger_id)
    return challenge.challenger?.full_name || 'Sfidante';
  if (challenge.winner_id === challenge.opponent_id)
    return challenge.opponent?.full_name || 'Sfidato';
  return 'Vincitore non riconosciuto';
}

/** True se il giorno della sfida è oggi o passato (o se la sfida non ha una data). */
export function hasChallengeDatePassed(challenge: ChallengeLike) {
  const challengeDateValue = challenge.booking?.start_time || challenge.scheduled_date;
  if (!challengeDateValue) return true;
  const today = new Date().toDateString();
  const challengeDay = new Date(challengeDateValue).toDateString();
  return challengeDay !== 'Invalid Date' && new Date(challengeDay) <= new Date(today);
}

export function getMatchFormatLabel(matchFormat?: string) {
  const formatMap: Record<string, string> = {
    best_of_3: 'Meglio dei 5',
    best_of_2: 'Meglio dei 3',
    single_set: 'Set Singolo',
  };
  return formatMap[matchFormat || ''] || matchFormat || '-';
}

function capitalizeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Data estesa in italiano con giorno e mese in maiuscolo ("Lunedì 3 Marzo 2026"). */
export function formatBookingDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .formatToParts(date)
    .map((part) =>
      part.type === 'weekday' || part.type === 'month' ? capitalizeLabel(part.value) : part.value,
    )
    .join('');
}

export function isDoublesMatch(matchType?: string) {
  const normalized = (matchType || '').toLowerCase();
  return normalized === 'doubles' || normalized === 'doppio';
}

export function getMatchTypeLabel(matchType?: string) {
  return isDoublesMatch(matchType) ? 'Doppio' : 'Singolo';
}

/** Vincitore dedotto dal punteggio (formato sfidante-sfidato); null se pari o non valido. */
export function getWinnerIdFromScore(scoreValue: string, challengerId: string, opponentId: string) {
  const sets = parseSets(scoreValue);
  if (sets.length === 0) return null;
  const challengerSetsWon = sets.filter(([c, o]) => c > o).length;
  const opponentSetsWon = sets.filter(([c, o]) => o > c).length;
  if (challengerSetsWon === opponentSetsWon) return null;
  return challengerSetsWon > opponentSetsWon ? challengerId : opponentId;
}

/** Griglia dei set per il tabellone del risultato. */
export function buildScoreGrid(score?: string) {
  if (!score) return null;
  const sets = parseSets(score).map(([winner, loser]) => ({ winner, loser }));
  if (sets.length === 0) return null;
  return {
    sets,
    totalWinner: sets.filter((s) => s.winner > s.loser).length,
    totalLoser: sets.filter((s) => s.loser > s.winner).length,
  };
}

/** Punti Arena assegnati a vincitore e sconfitto in base ai set (30-0, 25-5, 20-10). */
export function getPointsFromScore(
  scoreValue: string,
  winnerId: string,
  challengerId: string,
): { winnerPts: number; loserPts: number } | null {
  const sets = parseSets(scoreValue);
  if (sets.length === 0) return null;

  const isWinnerChallenger = winnerId === challengerId;
  let winnerSets = 0;
  let loserSets = 0;
  for (const [left, right] of sets) {
    const wonByWinner = isWinnerChallenger ? left > right : right > left;
    if (wonByWinner) winnerSets++;
    else loserSets++;
  }

  if (loserSets === 0) return { winnerPts: 30, loserPts: 0 };
  if (winnerSets === 3 && loserSets === 1) return { winnerPts: 25, loserPts: 5 };
  return { winnerPts: 20, loserPts: 10 };
}
