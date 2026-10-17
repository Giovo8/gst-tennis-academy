import type { LiveMatch, LiveMatchState, LivePlayer, LiveSet } from '@/lib/live-tennis/espn';

/** Esito di un set: 'current' se è il set in corso */
function setOutcome(
  set: LiveSet | undefined,
  opponentSet: LiveSet | undefined,
  isCurrent: boolean,
): 'current' | 'won' | 'lost' {
  if (isCurrent) return 'current';
  const won = set?.won ?? (set && opponentSet ? set.games > opponentSet.games : false);
  return won ? 'won' : 'lost';
}

/** Colonne set della griglia, come livescore (fino al quinto set) */
const GRID_SETS = 5;

const OUTCOME_CLASS = {
  current: 'text-[#023047] font-bold',
  won: 'text-secondary font-bold',
  lost: 'text-gray-400',
};

export function SetCells({
  player,
  opponent,
  state,
}: {
  player: LivePlayer;
  opponent: LivePlayer;
  state: LiveMatchState;
}) {
  const total = Math.max(player.sets.length, opponent.sets.length);
  return (
    <div className="flex items-center gap-1 h-7">
      {Array.from({ length: total }).map((_, i) => {
        const set = player.sets[i];
        const outcome = setOutcome(set, opponent.sets[i], state === 'live' && i === total - 1);
        return (
          <span
            key={i}
            className={`w-6 text-center text-sm tabular-nums ${OUTCOME_CLASS[outcome]}`}
          >
            {set ? set.games : ''}
            {set?.tiebreak !== undefined && <sup className="text-[9px] ml-px">{set.tiebreak}</sup>}
          </span>
        );
      })}
    </div>
  );
}

/** Set vinti: per le partite in corso non conta il set ancora da finire */
function setsWon(player: LivePlayer, opponent: LivePlayer, isLive: boolean): number {
  const total = Math.max(player.sets.length, opponent.sets.length);
  return player.sets.filter(
    (set, i) => setOutcome(set, opponent.sets[i], isLive && i === total - 1) === 'won',
  ).length;
}

function formatDay(iso: string): string {
  const formatted = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(new Date(iso));
  return formatted.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  }).format(new Date(iso));
}

/** Stato compatto per la colonna a sinistra (es. "S2", "Fin.", "14:30") */
function shortStatus(match: LiveMatch, totalSets: number): string {
  if (match.state === 'live') {
    return match.statusLabel === 'Interrotta' ? 'Int.' : `S${Math.max(totalSets, 1)}`;
  }
  if (match.state === 'scheduled') return match.statusLabel;
  if (match.statusLabel === 'Finale') return 'Fin.';
  if (match.statusLabel === 'Ritiro') return 'Rit.';
  return match.statusLabel;
}

function TennisBall({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M5 4.6a10 10 0 0 1 0 14.8M19 4.6a10 10 0 0 0 0 14.8"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** Bandiere del giocatore (due affiancate per le coppie di doppio) */
export function Flags({ player, size = 'md' }: { player: LivePlayer; size?: 'sm' | 'md' }) {
  const width = size === 'sm' ? 'w-5' : 'w-6';
  const height = size === 'sm' ? 'h-3.5' : 'h-4';
  const flags = player.flags ?? [];
  if (flags.length === 0) return <span className={`${width} flex-shrink-0`} />;
  return (
    <span className="flex flex-shrink-0 gap-0.5">
      {flags.map((flag, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={flag.url}
          alt={flag.country ?? ''}
          className={`${width} ${height} object-cover rounded-[2px]`}
          loading="lazy"
        />
      ))}
    </span>
  );
}

/** Scheda di una partita (pagina /live/[id]), sul modello di livescore */
export function MatchDetail({ match }: { match: LiveMatch }) {
  const isLive = match.state === 'live';
  const [p1, p2] = match.players;
  const totalSets = Math.max(p1.sets.length, p2.sets.length);
  const started = match.state !== 'scheduled';
  const rows: [LivePlayer, LivePlayer][] = [
    [p1, p2],
    [p2, p1],
  ];
  const city = match.location?.split(',')[0]?.trim();
  const venue = match.court && city ? `${match.court} (${city})` : match.court || city;
  const infoRows: { label: string; value: string }[] = [
    { label: 'Torneo', value: match.tournament },
    { label: 'Categoria', value: match.category },
    ...(match.round ? [{ label: 'Turno', value: match.round }] : []),
    {
      label: 'Data e ora',
      value: `${formatDay(match.startTime)} · ${formatTime(match.startTime)}`,
    },
    ...(venue ? [{ label: 'Campo', value: venue }] : []),
    { label: 'Stato', value: match.statusLabel },
  ];

  return (
    <div className="space-y-4">
      {/* Torneo */}
      <div className="flex items-center gap-3 rounded-lg bg-secondary px-5 py-4 shadow-sm">
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-secondary bg-white rounded px-1.5 py-1">
          {match.tour}
        </span>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white truncate">{match.tournament}</h1>
          <p className="text-xs text-white/70 truncate">
            {match.category}
            {match.round ? ` · ${match.round}` : ''}
          </p>
        </div>
      </div>

      {/* Punteggio */}
      <div className="flex rounded-lg border border-black/10 bg-white overflow-hidden">
        <div className="w-16 flex-shrink-0 flex items-center justify-center">
          <span
            className={`text-sm font-bold ${isLive ? 'text-[#023047]' : 'text-gray-400'}`}
            title={match.statusLabel}
          >
            {shortStatus(match, totalSets)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          {rows.map(([player, opponent], idx) => {
            const dimmed = match.state === 'finished' && !player.winner;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 pr-5 py-4 border-t border-gray-100 first:border-t-0"
              >
                <span className="w-5 flex-shrink-0 flex justify-center">
                  {player.serving && <TennisBall className="w-5 h-5 text-[#023047]" />}
                </span>
                <Flags player={player} />
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span
                    className={`truncate text-base ${
                      dimmed ? 'text-gray-400' : 'text-secondary font-bold'
                    }`}
                  >
                    {player.name}
                  </span>
                  {player.rank && (
                    <span className="text-xs text-gray-400 flex-shrink-0">({player.rank})</span>
                  )}
                </div>
                {started && (
                  <span
                    className={`text-lg tabular-nums font-bold ${
                      dimmed ? 'text-gray-400' : 'text-secondary'
                    }`}
                  >
                    {setsWon(player, opponent, isLive)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Griglia set, separata dai partecipanti */}
      <div className="rounded-lg border border-black/10 bg-white overflow-hidden">
        <div className="grid grid-cols-6 text-center text-xs font-semibold text-gray-500 py-3 bg-gray-50 border-b border-black/10">
          {Array.from({ length: GRID_SETS }).map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
          <span>SET</span>
        </div>
        <div>
          {rows.map(([player, opponent], idx) => {
            const dimmed = match.state === 'finished' && !player.winner;
            return (
              <div
                key={idx}
                className="grid grid-cols-6 text-center py-3.5 border-t border-gray-100 first:border-t-0 tabular-nums"
              >
                {Array.from({ length: GRID_SETS }).map((_, i) => {
                  const set = player.sets[i];
                  const outcome = setOutcome(set, opponent.sets[i], isLive && i === totalSets - 1);
                  return (
                    <span key={i} className={`text-sm ${set ? OUTCOME_CLASS[outcome] : ''}`}>
                      {set ? set.games : ''}
                      {set?.tiebreak !== undefined && (
                        <sup className="text-[9px] ml-px">{set.tiebreak}</sup>
                      )}
                    </span>
                  );
                })}
                <span
                  className={`text-sm font-bold ${dimmed ? 'text-gray-400' : 'text-secondary'}`}
                >
                  {started ? setsWon(player, opponent, isLive) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Informazioni */}
      <div className="page-card">
        <div className="px-6 py-4 border-b border-black/10 bg-gray-50">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Info sulla partita */}
          {infoRows.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 ${
                i < infoRows.length - 1 ? 'pb-6 border-b border-gray-200' : ''
              }`}
            >
              <span className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                {row.label}
              </span>
              <p className="flex-1 text-secondary font-semibold">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
