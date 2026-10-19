import { supabaseServer } from '@/lib/supabase/serverClient';
import {
  canUserBookTournamentMatch,
  isMatchOpenForBooking,
  isTournamentInProgress,
  type BookableTournament,
  type BookableTournamentMatch,
  type PublicScheduledTournamentMatch,
  type TournamentMatchBooking,
  type TournamentMatchPlayer,
} from '@/lib/bookings/tournamentBookings';

/**
 * Accesso dati per le prenotazioni "torneo". Usa la service role (bypassa RLS):
 * ogni funzione filtra esplicitamente per ruolo/partecipazione del viewer.
 */

interface TournamentBookingViewer {
  userId: string;
  isPrivileged: boolean;
}

interface MatchRow {
  id: string;
  tournament_id: string;
  phase: string | null;
  round_name: string | null;
  round_number: number | null;
  match_number: number | null;
  status: string | null;
  match_status: string | null;
  player1_id: string | null;
  player2_id: string | null;
}

interface ParticipantRow {
  id: string;
  tournament_id: string;
  user_id: string | null;
  player_name: string | null;
}

interface TournamentRow {
  id: string;
  title: string | null;
  tournament_type: string | null;
  status: string | null;
}

const MATCH_SELECT =
  'id, tournament_id, phase, round_name, round_number, match_number, status, match_status, player1_id, player2_id';

async function loadProfilesById(userIds: string[]) {
  const profiles = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length === 0) return profiles;

  const { data, error } = await supabaseServer
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);
  if (error) throw error;

  for (const profile of data ?? []) {
    profiles.set(profile.id, { full_name: profile.full_name, email: profile.email });
  }
  return profiles;
}

async function loadActiveBookingsByMatch(matchIds: string[]) {
  const bookings = new Map<string, TournamentMatchBooking>();
  if (matchIds.length === 0) return bookings;

  const { data, error } = await supabaseServer
    .from('bookings')
    .select('id, court, start_time, end_time, tournament_match_id')
    .in('tournament_match_id', matchIds)
    .not('status', 'in', '(cancelled,rejected)');
  if (error) throw error;

  for (const booking of data ?? []) {
    bookings.set(booking.tournament_match_id, {
      id: booking.id,
      court: booking.court,
      start_time: booking.start_time,
      end_time: booking.end_time,
    });
  }
  return bookings;
}

async function hydrateMatches(
  matches: MatchRow[],
  participants: ParticipantRow[],
): Promise<BookableTournamentMatch[]> {
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const userIds = [
    ...new Set(participants.map((p) => p.user_id).filter((id): id is string => Boolean(id))),
  ];

  const [profiles, bookings] = await Promise.all([
    loadProfilesById(userIds),
    loadActiveBookingsByMatch(matches.map((m) => m.id)),
  ]);

  const toPlayer = (participantId: string): TournamentMatchPlayer => {
    const participant = participantsById.get(participantId);
    const profile = participant?.user_id ? profiles.get(participant.user_id) : undefined;
    return {
      participant_id: participantId,
      user_id: participant?.user_id ?? null,
      full_name: profile?.full_name || participant?.player_name || 'Giocatore',
      email: profile?.email ?? null,
    };
  };

  return matches.map((match) => ({
    id: match.id,
    tournament_id: match.tournament_id,
    phase: match.phase,
    round_name: match.round_name,
    round_number: match.round_number,
    match_number: match.match_number,
    player1: toPlayer(match.player1_id as string),
    player2: toPlayer(match.player2_id as string),
    booking: bookings.get(match.id) ?? null,
  }));
}

async function findInProgressTournaments(): Promise<TournamentRow[]> {
  const { data, error } = await supabaseServer
    .from('tournaments')
    .select('id, title, tournament_type, status')
    .ilike('status', 'in corso');
  if (error) throw error;
  return ((data ?? []) as TournamentRow[]).filter((t) => isTournamentInProgress(t.status));
}

/**
 * Elenco leggero dei tornei "in corso" prenotabili dal viewer (nessuna partita): serve a decidere
 * se mostrare il tipo "Torneo". Atleti/maestri: solo i tornei a cui sono iscritti.
 * Admin/gestore: tutti i tornei in corso.
 */
export async function loadBookableTournamentList(
  viewer: TournamentBookingViewer,
): Promise<BookableTournament[]> {
  let tournaments = await findInProgressTournaments();
  if (tournaments.length === 0) return [];

  if (!viewer.isPrivileged) {
    const { data, error } = await supabaseServer
      .from('tournament_participants')
      .select('tournament_id')
      .eq('user_id', viewer.userId)
      .in(
        'tournament_id',
        tournaments.map((t) => t.id),
      );
    if (error) throw error;

    const enrolled = new Set((data ?? []).map((row) => row.tournament_id));
    tournaments = tournaments.filter((t) => enrolled.has(t.id));
  }

  return tournaments
    .map((tournament) => ({
      id: tournament.id,
      name: (tournament.title ?? '').trim() || 'Torneo',
      tournament_type: tournament.tournament_type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

type LoadTournamentMatchesResult =
  | { matches: BookableTournamentMatch[]; error?: never; status?: never }
  | { matches?: never; error: string; status: number };

/**
 * Partite ancora aperte di un torneo che il viewer può prenotare.
 * Atleti/maestri: solo le proprie e solo se iscritti. Admin/gestore: tutte.
 */
export async function loadTournamentMatchesForBooking(
  tournamentId: string,
  viewer: TournamentBookingViewer,
): Promise<LoadTournamentMatchesResult> {
  const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
    supabaseServer.from('tournaments').select('id, status').eq('id', tournamentId).maybeSingle(),
    supabaseServer
      .from('tournament_participants')
      .select('id, tournament_id, user_id, player_name')
      .eq('tournament_id', tournamentId),
    supabaseServer
      .from('tournament_matches')
      .select(MATCH_SELECT)
      .eq('tournament_id', tournamentId),
  ]);
  if (tournamentRes.error) throw tournamentRes.error;
  if (participantsRes.error) throw participantsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  if (!tournamentRes.data) return { status: 404, error: 'Torneo non trovato' };
  if (!isTournamentInProgress(tournamentRes.data.status)) {
    return { status: 400, error: 'Il torneo non è in corso' };
  }

  const participants = (participantsRes.data ?? []) as ParticipantRow[];
  const myParticipantIds = new Set(
    participants.filter((p) => p.user_id === viewer.userId).map((p) => p.id),
  );
  if (!viewer.isPrivileged && myParticipantIds.size === 0) {
    return { status: 403, error: 'Non sei iscritto a questo torneo' };
  }

  const visibleMatches = ((matchesRes.data ?? []) as MatchRow[]).filter(
    (match) =>
      isMatchOpenForBooking(match) &&
      (viewer.isPrivileged ||
        myParticipantIds.has(match.player1_id as string) ||
        myParticipantIds.has(match.player2_id as string)),
  );

  return { matches: await hydrateMatches(visibleMatches, participants) };
}

type ResolveTournamentMatchResult =
  | { match: BookableTournamentMatch; error?: never; status?: never }
  | { match?: never; error: string; status: number };

/**
 * Verifica che la partita sia prenotabile dal viewer: torneo in corso, partita aperta,
 * viewer giocatore della partita (se non admin/gestore) e nessuna prenotazione attiva
 * (in modifica si esclude la prenotazione stessa con `excludeBookingId`).
 */
export async function resolveTournamentMatchForBooking(
  matchId: string,
  viewer: TournamentBookingViewer,
  options: { excludeBookingId?: string } = {},
): Promise<ResolveTournamentMatchResult> {
  const { data: matchData, error: matchError } = await supabaseServer
    .from('tournament_matches')
    .select(MATCH_SELECT)
    .eq('id', matchId)
    .maybeSingle();
  if (matchError) throw matchError;
  if (!matchData) return { status: 404, error: 'Partita del torneo non trovata' };
  const match = matchData as MatchRow;

  const [tournamentRes, participantsRes] = await Promise.all([
    supabaseServer
      .from('tournaments')
      .select('id, status')
      .eq('id', match.tournament_id)
      .maybeSingle(),
    supabaseServer
      .from('tournament_participants')
      .select('id, tournament_id, user_id, player_name')
      .in('id', [match.player1_id, match.player2_id]),
  ]);
  if (tournamentRes.error) throw tournamentRes.error;
  if (participantsRes.error) throw participantsRes.error;

  if (!tournamentRes.data || !isTournamentInProgress(tournamentRes.data.status)) {
    return { status: 400, error: 'Il torneo non è in corso' };
  }

  if (!isMatchOpenForBooking(match)) {
    return { status: 400, error: 'La partita è già conclusa o non ha ancora entrambi i giocatori' };
  }

  const [hydrated] = await hydrateMatches(
    [match],
    (participantsRes.data ?? []) as ParticipantRow[],
  );

  if (!canUserBookTournamentMatch(hydrated, viewer.userId, viewer.isPrivileged)) {
    return { status: 403, error: 'Puoi prenotare solo le tue partite del torneo' };
  }

  if (hydrated.booking && hydrated.booking.id !== options.excludeBookingId) {
    return { status: 409, error: 'Partita già prenotata' };
  }

  return { match: hydrated };
}

/**
 * Partite di un torneo in corso con prenotazione campo non ancora terminata, in ordine cronologico.
 * Pubblico (sezione "In programma" della pagina torneo): non espone email, id utente né id prenotazione.
 */
export async function loadPublicScheduledTournamentMatches(
  tournamentId: string,
): Promise<PublicScheduledTournamentMatch[]> {
  const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
    supabaseServer.from('tournaments').select('id, status').eq('id', tournamentId).maybeSingle(),
    supabaseServer
      .from('tournament_participants')
      .select('id, tournament_id, user_id, player_name')
      .eq('tournament_id', tournamentId),
    supabaseServer
      .from('tournament_matches')
      .select(MATCH_SELECT)
      .eq('tournament_id', tournamentId),
  ]);
  if (tournamentRes.error) throw tournamentRes.error;
  if (participantsRes.error) throw participantsRes.error;
  if (matchesRes.error) throw matchesRes.error;
  if (!tournamentRes.data || !isTournamentInProgress(tournamentRes.data.status)) return [];

  const openMatches = ((matchesRes.data ?? []) as MatchRow[]).filter(isMatchOpenForBooking);
  const hydrated = await hydrateMatches(
    openMatches,
    (participantsRes.data ?? []) as ParticipantRow[],
  );
  const now = Date.now();

  return hydrated
    .filter((match) => match.booking && new Date(match.booking.end_time).getTime() > now)
    .sort(
      (a, b) => new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime(),
    )
    .map((match) => ({
      id: match.id,
      round_name: match.round_name,
      player1: { full_name: match.player1.full_name },
      player2: { full_name: match.player2.full_name },
      booking: {
        court: match.booking.court,
        start_time: match.booking.start_time,
        end_time: match.booking.end_time,
      },
    }));
}
