/**
 * Struttura di un torneo (tipo, partecipanti, gironi): regole condivise da creazione
 * (POST /api/tournaments/create) e modifica (PATCH /api/tournaments/[id]).
 */
export type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

const TOURNAMENT_TYPES: TournamentType[] = [
  'eliminazione_diretta',
  'girone_eliminazione',
  'campionato',
];

const ELIMINATION_SIZES = [2, 4, 8, 16, 32, 64, 128];

export interface TournamentStructure {
  tournament_type: string;
  max_participants: number;
  num_groups?: number | null;
  teams_per_group?: number | null;
  teams_advancing?: number | null;
}

/** Messaggio d'errore se la struttura non è valida, altrimenti null. */
export function getTournamentStructureError(s: TournamentStructure): string | null {
  if (!TOURNAMENT_TYPES.includes(s.tournament_type as TournamentType)) {
    return `tournament_type deve essere uno di: ${TOURNAMENT_TYPES.join(', ')}`;
  }

  if (s.tournament_type === 'eliminazione_diretta') {
    if (!ELIMINATION_SIZES.includes(s.max_participants)) {
      return `Per eliminazione diretta, max_participants deve essere: ${ELIMINATION_SIZES.join(
        ', ',
      )}`;
    }
  }

  if (s.tournament_type === 'girone_eliminazione') {
    if (!s.num_groups || s.num_groups < 1) {
      return 'Per girone_eliminazione, num_groups deve essere almeno 1';
    }
    if (!s.teams_per_group || s.teams_per_group < 3) {
      return 'Per girone_eliminazione, teams_per_group deve essere almeno 3';
    }
    if (!s.teams_advancing || s.teams_advancing < 1 || s.teams_advancing >= s.teams_per_group) {
      return 'teams_advancing deve essere tra 1 e teams_per_group-1';
    }
    const expectedMax = s.num_groups * s.teams_per_group;
    if (s.max_participants !== expectedMax) {
      return `Per ${s.num_groups} gironi con ${s.teams_per_group} squadre, max_participants deve essere ${expectedMax}`;
    }
  }

  if (s.tournament_type === 'campionato' && s.max_participants < 3) {
    return 'Per un campionato, max_participants deve essere almeno 3';
  }

  return null;
}
