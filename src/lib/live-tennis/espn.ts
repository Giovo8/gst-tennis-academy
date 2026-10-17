/**
 * Normalizzazione dello scoreboard pubblico ESPN (ATP/WTA) in un formato
 * compatto per la sezione "Live" della home.
 * Endpoint: https://site.api.espn.com/apis/site/v2/sports/tennis/{atp|wta}/scoreboard
 */

export type LiveTour = 'ATP' | 'WTA';
export type LiveMatchState = 'live' | 'finished' | 'scheduled';

export type LiveSet = {
  games: number;
  tiebreak?: number;
  won?: boolean;
};

export type LivePlayer = {
  name: string;
  country?: string;
  /** Una bandiera per i singolari, una per giocatore nei doppi (può mancare in risposte in cache di versioni precedenti) */
  flags?: { url: string; country?: string }[];
  rank?: number;
  serving: boolean;
  winner: boolean;
  sets: LiveSet[];
};

export type LiveMatch = {
  id: string;
  tour: LiveTour;
  tournament: string;
  category: string;
  round?: string;
  court?: string;
  location?: string;
  startTime: string;
  state: LiveMatchState;
  statusLabel: string;
  players: [LivePlayer, LivePlayer];
};

type EspnFlag = { href?: string; alt?: string };
type EspnAthlete = { displayName?: string; shortName?: string; flag?: EspnFlag };
type EspnCompetitor = {
  order?: number;
  winner?: boolean;
  possession?: boolean;
  curatedRank?: { current?: number };
  linescores?: { value?: number; tiebreak?: number; winner?: boolean }[];
  athlete?: EspnAthlete;
  roster?: { displayName?: string; shortDisplayName?: string; athletes?: EspnAthlete[] };
};
type EspnCompetition = {
  id: string;
  date: string;
  status?: { period?: number; type?: { name?: string; state?: string; shortDetail?: string } };
  venue?: { court?: string; fullName?: string };
  competitors?: EspnCompetitor[];
  type?: { text?: string; slug?: string };
  round?: { displayName?: string };
};
type EspnEvent = {
  name?: string;
  groupings?: { grouping?: { displayName?: string }; competitions?: EspnCompetition[] }[];
};
export type EspnScoreboard = { events?: EspnEvent[] };

const CATEGORY_LABELS: Record<string, string> = {
  'mens-singles': 'Singolare maschile',
  'womens-singles': 'Singolare femminile',
  'mens-doubles': 'Doppio maschile',
  'womens-doubles': 'Doppio femminile',
  'mixed-doubles': 'Doppio misto',
};

const ROUND_LABELS: Record<string, string> = {
  Final: 'Finale',
  Semifinal: 'Semifinale',
  Quarterfinal: 'Quarti di finale',
  'Round of 16': 'Ottavi di finale',
  'Round of 32': 'Sedicesimi di finale',
  'Round of 64': 'Trentaduesimi di finale',
  'Round 1': 'Primo turno',
  'Round 2': 'Secondo turno',
  'Round 3': 'Terzo turno',
  'Round 4': 'Quarto turno',
  Qualifying: 'Qualificazioni',
  'Qualifying 1st Round': 'Qualificazioni 1° turno',
  'Qualifying 2nd Round': 'Qualificazioni 2° turno',
  'Qualifying Final Round': 'Qualificazioni turno finale',
};

const FINISHED_LABELS: Record<string, string> = {
  STATUS_RETIRED: 'Ritiro',
  STATUS_WALKOVER: 'Walkover',
  STATUS_ABANDONED: 'Sospesa',
  STATUS_CANCELED: 'Annullata',
  STATUS_POSTPONED: 'Rinviata',
};

function mapState(state: string | undefined): LiveMatchState {
  if (state === 'in') return 'live';
  if (state === 'post') return 'finished';
  return 'scheduled';
}

function statusLabel(c: EspnCompetition, state: LiveMatchState): string {
  const name = c.status?.type?.name ?? '';
  if (state === 'live') {
    if (name === 'STATUS_SUSPENDED' || name === 'STATUS_DELAYED') return 'Interrotta';
    const period = c.status?.period;
    return period ? `${period}° set` : 'In corso';
  }
  if (state === 'finished') return FINISHED_LABELS[name] ?? 'Finale';
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  }).format(new Date(c.date));
}

function countryFromFlag(flag?: EspnFlag): string | undefined {
  const match = flag?.href?.match(/\/([a-z]{3})\.png$/i);
  return match ? match[1].toUpperCase() : undefined;
}

function toPlayer(c: EspnCompetitor | undefined, isLive: boolean): LivePlayer {
  const athlete = c?.athlete ?? c?.roster?.athletes?.[0];
  const isTeam = !c?.athlete && !!c?.roster;
  const name = isTeam
    ? c?.roster?.shortDisplayName || c?.roster?.displayName || 'TBD'
    : athlete?.displayName || 'TBD';
  return {
    name,
    country: isTeam ? undefined : countryFromFlag(athlete?.flag),
    flags: (isTeam ? c?.roster?.athletes ?? [] : athlete ? [athlete] : [])
      .filter((a) => a.flag?.href)
      .map((a) => ({ url: a.flag!.href!, country: countryFromFlag(a.flag) })),
    rank: c?.curatedRank?.current && c.curatedRank.current < 99 ? c.curatedRank.current : undefined,
    serving: isLive && !!c?.possession,
    winner: !!c?.winner,
    sets: (c?.linescores ?? []).map((s) => ({
      games: s.value ?? 0,
      tiebreak: s.tiebreak,
      won: s.winner,
    })),
  };
}

/**
 * Giorno (YYYY-MM-DD) di una data nel fuso orario italiano.
 */
export function romeDay(date: Date | string | number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

/**
 * Estrae le partite in corso più quelle che iniziano nel giorno `day`
 * (YYYY-MM-DD, ora italiana). ESPN restituisce per ogni torneo attivo
 * tutte le sue partite, quindi il filtro per giorno va fatto qui.
 */
export function normalizeScoreboard(
  data: EspnScoreboard,
  tour: LiveTour,
  day: string,
): LiveMatch[] {
  const matches: LiveMatch[] = [];

  for (const event of data.events ?? []) {
    for (const group of event.groupings ?? []) {
      for (const c of group.competitions ?? []) {
        const state = mapState(c.status?.type?.state);
        const start = new Date(c.date).getTime();
        if (Number.isNaN(start)) continue;
        if (state !== 'live' && romeDay(start) !== day) continue;

        const sorted = [...(c.competitors ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (sorted.length < 2) continue;

        const players: [LivePlayer, LivePlayer] = [
          toPlayer(sorted[0], state === 'live'),
          toPlayer(sorted[1], state === 'live'),
        ];
        // Tabellone non ancora definito (es. "TBD vs TBD"): nessuna informazione utile
        if (players.every((p) => p.name === 'TBD')) continue;

        const slug = c.type?.slug ?? '';
        const round = c.round?.displayName;
        matches.push({
          id: `${tour}-${c.id}`,
          tour,
          tournament: event.name ?? 'Torneo',
          category: CATEGORY_LABELS[slug] ?? group.grouping?.displayName ?? c.type?.text ?? '',
          round: round ? ROUND_LABELS[round] ?? round : undefined,
          court: c.venue?.court,
          location: c.venue?.fullName,
          startTime: c.date,
          state,
          statusLabel: statusLabel(c, state),
          players,
        });
      }
    }
  }

  return matches;
}
