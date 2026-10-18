'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  TOURNAMENT_BOOKING_BACKGROUND,
  type BookableTournamentMatch,
  type PublicScheduledTournamentMatch,
  type TournamentMatchBooking,
} from '@/lib/bookings/tournamentBookings';

type ScheduledTournamentMatch = BookableTournamentMatch & {
  booking: TournamentMatchBooking;
};

/** Riga della sezione: con `booking.id` (solo admin) diventa un link alla prenotazione. */
type ScheduleItem = PublicScheduledTournamentMatch & { booking: { id?: string } };

async function loadAdminScheduledMatches(
  tournamentId: string,
): Promise<ScheduledTournamentMatch[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(
    `/api/bookings/tournament-matches?tournament_id=${encodeURIComponent(tournamentId)}`,
    {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    },
  );
  const json = res.ok ? await res.json() : null;
  const now = Date.now();
  return ((json?.matches ?? []) as BookableTournamentMatch[])
    .filter(
      (m): m is ScheduledTournamentMatch =>
        Boolean(m.booking) && new Date(m.booking.end_time).getTime() > now,
    )
    .sort(
      (a, b) => new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime(),
    );
}

async function loadPublicScheduledMatches(
  tournamentId: string,
): Promise<PublicScheduledTournamentMatch[]> {
  const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/scheduled-matches`);
  const json = res.ok ? await res.json() : null;
  return json?.matches ?? [];
}

/**
 * Partite del torneo con una prenotazione campo non ancora terminata, in ordine cronologico.
 * `admin`: /api/bookings/tournament-matches (include l'id prenotazione per il link);
 * `public`: /api/tournaments/[id]/scheduled-matches (senza login, solo dati pubblici).
 */
export function useScheduledTournamentMatches(
  tournamentId: string | null,
  enabled: boolean,
  reloadKey = 0,
  source: 'admin' | 'public' = 'admin',
) {
  const [matches, setMatches] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (!tournamentId || !enabled) return;
    let cancelled = false;

    const load = source === 'admin' ? loadAdminScheduledMatches : loadPublicScheduledMatches;
    load(tournamentId)
      .then((result) => {
        if (!cancelled) setMatches(result);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });

    return () => {
      cancelled = true;
    };
  }, [tournamentId, enabled, reloadKey, source]);

  return tournamentId && enabled ? matches : [];
}

const timeStr = (t: string) =>
  new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

interface TournamentScheduleSectionProps {
  matches: ScheduleItem[];
  /** Se presente (e la partita ha l'id prenotazione), ogni riga apre il dettaglio della prenotazione. */
  bookingBasePath?: string;
}

export default function TournamentScheduleSection({
  matches,
  bookingBasePath,
}: TournamentScheduleSectionProps) {
  return (
    <ul className="flex flex-col gap-2">
      {matches.map((match) => {
        const start = new Date(match.booking.start_time);
        const content = (
          <>
            <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
              <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                {start.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}
              </span>
              <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                {start.getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">
                {match.player1.full_name} vs {match.player2.full_name}
              </p>
              <p className="text-xs text-white/70 mt-0.5">
                {timeStr(match.booking.start_time)}–{timeStr(match.booking.end_time)} ·{' '}
                {match.booking.court}
              </p>
            </div>
            {match.round_name && (
              <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                {match.round_name}
              </span>
            )}
          </>
        );
        const rowClassName = 'flex items-center gap-4 py-3.5 px-3 rounded-lg';
        const rowStyle = { background: TOURNAMENT_BOOKING_BACKGROUND };

        return (
          <li key={match.id}>
            {bookingBasePath && match.booking.id ? (
              <Link
                href={`${bookingBasePath}/${match.booking.id}`}
                className={`${rowClassName} hover:opacity-90 transition-opacity`}
                style={rowStyle}
              >
                {content}
              </Link>
            ) : (
              <div className={rowClassName} style={rowStyle}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
