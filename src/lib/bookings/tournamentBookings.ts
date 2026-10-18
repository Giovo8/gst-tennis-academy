/**
 * Prenotazioni di tipo "torneo": tipi e logica pura condivisa tra API e UI.
 * Il caricamento dati (service role) è in tournamentBookingsServer.ts.
 */

export const TOURNAMENT_BOOKING_TYPE = 'torneo' as const;

// Partite di torneo: sfumatura più scura del blu delle lezioni (#023047), coerente in timeline e liste.
export const TOURNAMENT_BOOKING_BACKGROUND = '#02283a';

// tournament_matches.status (it) e match_status (en, alias legacy) che chiudono una partita.
const CLOSED_MATCH_STATUSES = new Set([
  'completata',
  'annullata',
  'walkover',
  'completed',
  'cancelled',
]);

export interface TournamentMatchPlayer {
  participant_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
}

export interface TournamentMatchBooking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
}

export interface BookableTournamentMatch {
  id: string;
  tournament_id: string;
  phase: string | null;
  round_name: string | null;
  round_number: number | null;
  match_number: number | null;
  player1: TournamentMatchPlayer;
  player2: TournamentMatchPlayer;
  /** Prenotazione attiva già esistente per la partita (null = da prenotare). */
  booking: TournamentMatchBooking | null;
}

/** Partita prenotata visibile pubblicamente ("In programma"): solo nomi, turno, campo e orari. */
export interface PublicScheduledTournamentMatch {
  id: string;
  round_name: string | null;
  player1: { full_name: string };
  player2: { full_name: string };
  booking: { court: string; start_time: string; end_time: string };
}

/** Torneo in corso prenotabile (elenco leggero: le partite si caricano alla selezione). */
export interface BookableTournament {
  id: string;
  name: string;
  tournament_type: string | null;
}

export interface TournamentRound {
  key: string;
  label: string;
  matches: BookableTournamentMatch[];
}

/** tournaments.status è testo libero ("In Corso" / "In corso" a seconda del flusso). */
export function isTournamentInProgress(status: string | null | undefined): boolean {
  return (status ?? '').trim().toLowerCase() === 'in corso';
}

/** Una partita è prenotabile se ha entrambi i giocatori e non è chiusa. */
export function isMatchOpenForBooking(match: {
  status?: string | null;
  match_status?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
}): boolean {
  if (!match.player1_id || !match.player2_id) return false;
  if (match.status && CLOSED_MATCH_STATUSES.has(match.status)) return false;
  if (match.match_status && CLOSED_MATCH_STATUSES.has(match.match_status)) return false;
  return true;
}

/** Admin/gestore prenotano qualsiasi partita; gli altri solo quelle in cui giocano. */
export function canUserBookTournamentMatch(
  match: Pick<BookableTournamentMatch, 'player1' | 'player2'>,
  userId: string,
  isPrivileged: boolean,
): boolean {
  if (isPrivileged) return true;
  return match.player1.user_id === userId || match.player2.user_id === userId;
}

const PHASE_ORDER: Record<string, number> = { gironi: 0, eliminazione: 1 };

/**
 * Raggruppa le partite per giornata/turno: nel campionato round_name è "Giornata N",
 * nei gironi è il nome del girone, nell'eliminazione il nome del turno.
 */
export function groupTournamentMatchesByRound(
  matches: BookableTournamentMatch[],
): TournamentRound[] {
  const rounds = new Map<string, TournamentRound & { phaseOrder: number; roundNumber: number }>();

  for (const match of matches) {
    const key = `${match.phase ?? ''}|${match.round_number ?? ''}|${match.round_name ?? ''}`;
    let round = rounds.get(key);
    if (!round) {
      round = {
        key,
        label:
          match.round_name || (match.round_number ? `Giornata ${match.round_number}` : 'Partite'),
        matches: [],
        phaseOrder: PHASE_ORDER[match.phase ?? ''] ?? 99,
        roundNumber: match.round_number ?? 0,
      };
      rounds.set(key, round);
    }
    round.matches.push(match);
  }

  return [...rounds.values()]
    .sort(
      (a, b) =>
        a.phaseOrder - b.phaseOrder ||
        a.roundNumber - b.roundNumber ||
        a.label.localeCompare(b.label, 'it', { numeric: true }),
    )
    .map(({ key, label, matches: roundMatches }) => ({
      key,
      label,
      matches: [...roundMatches].sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)),
    }));
}

/** Prima giornata con almeno una partita ancora da prenotare (altrimenti la prima). */
export function getDefaultRoundKey(rounds: TournamentRound[]): string {
  const firstOpen = rounds.find((round) => round.matches.some((match) => !match.booking));
  return (firstOpen ?? rounds[0])?.key ?? '';
}
