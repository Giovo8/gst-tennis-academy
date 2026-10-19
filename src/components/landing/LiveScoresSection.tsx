'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Flags, SetCells } from '@/components/live-tennis/MatchScore';
import Reveal from '@/components/landing/Reveal';
import DateNavigator from '@/components/bookings/DateNavigator';
import {
  romeDay,
  type LiveMatch,
  type LiveMatchState,
  type LivePlayer,
} from '@/lib/live-tennis/espn';

const REFRESH_MS = 60_000;
const PAGE_SIZE = 12;
const LIVE = 'live';
/** YYYY-MM-DD -> Date a mezzogiorno locale (formato usato da DateNavigator) */
function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Date locale -> YYYY-MM-DD */
function dateToDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type Group = {
  key: string;
  tour: string;
  tournament: string;
  category: string;
  round?: string;
  matches: LiveMatch[];
};

function groupMatches(matches: LiveMatch[]): Group[] {
  const groups = new Map<string, Group>();
  for (const m of matches) {
    const key = `${m.tour}|${m.tournament}|${m.category}|${m.round ?? ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        tour: m.tour,
        tournament: m.tournament,
        category: m.category,
        round: m.round,
        matches: [],
      });
    }
    groups.get(key)!.matches.push(m);
  }
  return Array.from(groups.values());
}

function PlayerRow({ player, state }: { player: LivePlayer; state: LiveMatchState }) {
  const dimmed = state === 'finished' && !player.winner;
  return (
    <div className="flex items-center gap-2 min-w-0 h-7">
      <Flags player={player} size="sm" />
      <span
        className={`truncate text-sm ${dimmed ? 'text-gray-400' : 'text-secondary font-semibold'}`}
      >
        {player.name}
      </span>
      {player.rank && (
        <span className="text-[11px] text-gray-400 flex-shrink-0">({player.rank})</span>
      )}
      {player.serving && (
        <span
          className="w-2 h-2 rounded-full bg-[#023047] flex-shrink-0"
          title="Al servizio"
          aria-label="Al servizio"
        />
      )}
    </div>
  );
}

/** Link alla pagina della partita: la data serve a ritrovarla nello scoreboard ESPN */
function matchHref(match: LiveMatch): string {
  return `/live/${encodeURIComponent(match.id)}?date=${romeDay(match.startTime)}`;
}

function MatchRow({ match }: { match: LiveMatch }) {
  const [p1, p2] = match.players;
  const isLive = match.state === 'live';
  return (
    <Link
      href={matchHref(match)}
      aria-label={`Dettagli partita ${p1.name} contro ${p2.name}`}
      className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 first:border-t-0 cursor-pointer hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:bg-gray-50"
    >
      {/* Centrato sulle due righe dei giocatori (2 × h-7), non sulla riga del turno */}
      <div className="w-16 h-14 flex-shrink-0 self-start flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            isLive ? 'text-[#023047]' : 'text-gray-400'
          }`}
        >
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#023047] animate-pulse flex-shrink-0" />
          )}
          {match.statusLabel}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <PlayerRow player={p1} state={match.state} />
        <PlayerRow player={p2} state={match.state} />
      </div>
      {match.state !== 'scheduled' && (
        <div className="flex-shrink-0 self-start">
          <SetCells player={p1} opponent={p2} state={match.state} />
          <SetCells player={p2} opponent={p1} state={match.state} />
        </div>
      )}
    </Link>
  );
}

/** `embedded`: senza titolo e padding da landing, per stare dentro una card della dashboard */
export default function LiveScoresSection({ embedded = false }: { embedded?: boolean }) {
  const [today] = useState(() => romeDay(Date.now()));
  // Partite per giorno (YYYY-MM-DD); undefined = non ancora caricate
  const [byDay, setByDay] = useState<Record<string, LiveMatch[]>>({});
  // Giorno il cui ultimo caricamento è fallito (null = nessun errore)
  const [failedDay, setFailedDay] = useState<string | null>(null);
  // null = scelta automatica (Live se c'è qualcosa in corso, altrimenti Risultati)
  const [mode, setMode] = useState<'live' | 'results' | null>(null);
  const [day, setDay] = useState(today);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const todayMatches = byDay[today];
  const liveMatches = useMemo(
    () => (todayMatches ?? []).filter((m) => m.state === 'live'),
    [todayMatches],
  );

  const activeMode = mode ?? (liveMatches.length > 0 ? 'live' : 'results');
  const active = activeMode === 'live' ? LIVE : day;
  const fetchDay = active === LIVE ? today : active;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/live-tennis?date=${fetchDay}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (mounted) {
          setByDay((prev) => ({
            ...prev,
            [fetchDay]: Array.isArray(json.matches) ? json.matches : [],
          }));
          setFailedDay((prev) => (prev === fetchDay ? null : prev));
        }
      } catch {
        if (mounted) setFailedDay(fetchDay);
      }
    }

    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchDay]);

  const ready = todayMatches !== undefined;

  const dayMatches = byDay[fetchDay];
  const filtered = useMemo(() => {
    if (!dayMatches) return [];
    if (active === LIVE) return dayMatches.filter((m) => m.state === 'live');
    // Le partite in corso iniziate in un altro giorno restano solo nel loro giorno
    return dayMatches.filter((m) => romeDay(m.startTime) === active);
  }, [dayMatches, active]);
  const groups = useMemo(() => groupMatches(filtered.slice(0, visible)), [filtered, visible]);

  function selectMode(next: 'live' | 'results') {
    setMode(next);
    setVisible(PAGE_SIZE);
  }

  function selectDay(date: Date) {
    setDay(dateToDay(date));
    setVisible(PAGE_SIZE);
  }

  const tabs: { key: 'live' | 'results'; label: string; count?: number }[] = [
    { key: 'live', label: 'Live', count: liveMatches.length },
    { key: 'results', label: 'Risultati' },
  ];

  // Indicatore della tab attiva: un solo elemento che scorre con una transizione
  // CSS su left/width (prima era un layoutId di framer-motion).
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const liveCount = liveMatches.length;
  useLayoutEffect(() => {
    function measure() {
      const el = tabRefs.current[activeMode];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeMode, ready, liveCount]);

  // Se il provider non risponde la sezione viene nascosta
  if (failedDay === today && !ready) return null;

  // Nella dashboard un div: il CSS globale aggiunge padding a ogni <section> su mobile
  const Root = embedded ? 'div' : 'section';

  return (
    <Root
      id={embedded ? undefined : 'live'}
      className={embedded ? undefined : 'py-20 sm:py-24 md:py-28'}
    >
      <div className={embedded ? undefined : 'max-w-5xl mx-auto px-6 lg:px-8'}>
        {!embedded && (
          <Reveal className="mb-6 text-center flex flex-col items-center">
            <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
              Live
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl max-w-5xl text-gray-500">
              Risultati in tempo reale dei tornei ATP e WTA.
            </p>
          </Reveal>
        )}

        <Reveal delay={embedded ? 0 : 0.1}>
          {!ready ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : (
            <>
              <div
                className={`w-full max-w-full mx-auto ${
                  activeMode === 'results' ? 'mb-4' : 'mb-6'
                } ${embedded ? '' : 'sm:w-fit'}`}
              >
                <div className="relative flex gap-1 p-1 rounded-lg bg-secondary shadow-sm">
                  {pill && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 bottom-1 rounded-md bg-[#023047] shadow-sm transition-[left,width] duration-300 ease-out"
                      style={{ left: pill.left, width: pill.width }}
                    />
                  )}
                  {tabs.map((t) => {
                    const selected = t.key === activeMode;
                    return (
                      <button
                        key={t.key}
                        ref={(el) => {
                          tabRefs.current[t.key] = el;
                        }}
                        type="button"
                        onClick={() => selectMode(t.key)}
                        className={`relative flex-1 ${
                          embedded ? '' : 'sm:flex-none'
                        } justify-center inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selected ? 'text-white' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        <span className="relative z-10">{t.label}</span>
                        {t.count !== undefined && (
                          <span
                            className={`relative z-10 text-xs ${
                              selected ? 'text-white/70' : 'text-white/50'
                            }`}
                          >
                            {t.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data (solo per i risultati): stesso selettore di timeline e prenotazioni, largo come le card */}
              {activeMode === 'results' && (
                <div className="mb-6">
                  <DateNavigator selectedDate={dayToDate(day)} onSelectDate={selectDay} />
                </div>
              )}

              {dayMatches === undefined && failedDay === fetchDay ? (
                <div className="text-center py-12 border border-black/10 rounded-lg bg-gray-50">
                  <p className="text-secondary/80 font-medium">
                    Risultati non disponibili al momento, riprova tra poco.
                  </p>
                </div>
              ) : dayMatches === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 border border-black/10 rounded-lg bg-gray-50">
                  <p className="text-secondary/80 font-medium">
                    {active === LIVE
                      ? 'Nessuna partita in corso al momento.'
                      : 'Nessuna partita in questa giornata.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div
                      key={g.key}
                      className="border border-black/10 rounded-lg overflow-hidden bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-black/10">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-secondary rounded px-1.5 py-0.5">
                          {g.tour}
                        </span>
                        <span className="text-sm font-bold text-secondary truncate">
                          {g.tournament}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          · {[g.category, g.round].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      {g.matches.map((m) => (
                        <MatchRow key={m.id} match={m} />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {filtered.length > visible && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3.5 sm:py-3 text-sm font-medium text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all"
                  >
                    Mostra altre partite
                  </button>
                </div>
              )}

              <p className="text-center text-[11px] text-gray-400 mt-6">
                Dati: ESPN · aggiornamento automatico ogni minuto
              </p>
            </>
          )}
        </Reveal>
      </div>
    </Root>
  );
}
