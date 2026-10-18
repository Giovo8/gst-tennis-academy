'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type BookingTournamentInfo = {
  tournament: {
    id: string;
    title: string;
    type: string | null;
    category: string | null;
    level: string | null;
    matchFormat: string | null;
    bestOf: number | null;
    status: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  match: {
    roundName: string | null;
    matchNumber: number | null;
    status: string | null;
    scheduledAt: string | null;
    player1: string;
    player2: string;
    player1Score: number | null;
    player2Score: number | null;
    winner: string | null;
  };
};

type ParticipantHint = { full_name: string; user_id?: string | null };

/**
 * Carica torneo e partita collegati a una prenotazione di tipo "torneo".
 * Il torneo passa dall'API pubblica (la RLS di `tournaments` nasconde ai non-admin quelli "In Corso"),
 * la partita dalla tabella `tournament_matches` (lettura pubblica).
 */
export function useBookingTournament(
  matchId: string | null | undefined,
  participants: ParticipantHint[] | undefined,
) {
  const [info, setInfo] = useState<BookingTournamentInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId) {
      setInfo(null);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data: match } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('id', matchId)
          .maybeSingle();
        if (!match) return;

        const playerIds = [match.player1_id, match.player2_id].filter(Boolean) as string[];
        const [tournamentRes, playersRes] = await Promise.all([
          fetch(`/api/tournaments?id=${encodeURIComponent(match.tournament_id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          playerIds.length > 0
            ? supabase
                .from('tournament_participants')
                .select('id, user_id, player_name')
                .in('id', playerIds)
            : Promise.resolve({
                data: [] as { id: string; user_id: string | null; player_name: string | null }[],
              }),
        ]);

        const tournament = tournamentRes?.tournament;
        if (!tournament) return;

        const nameByParticipantId = new Map<string, string>();
        for (const p of playersRes.data ?? []) {
          const fromBooking = participants?.find(
            (bp) => p.user_id && bp.user_id === p.user_id,
          )?.full_name;
          nameByParticipantId.set(
            p.id,
            p.player_name?.trim() || fromBooking?.trim() || 'Giocatore',
          );
        }
        const nameOf = (id: string | null) =>
          id ? nameByParticipantId.get(id) ?? 'Giocatore' : 'Da definire';

        if (cancelled) return;
        setInfo({
          tournament: {
            id: tournament.id,
            title: tournament.title,
            // tournament_type distingue il formato reale (campionato, eliminazione...); competition_type è spesso solo "torneo".
            type: tournament.tournament_type ?? tournament.competition_type ?? null,
            category: tournament.category ?? null,
            level: tournament.level ?? null,
            matchFormat: tournament.match_format ?? null,
            bestOf: tournament.best_of ?? null,
            status: tournament.status ?? null,
            startDate: tournament.start_date ?? null,
            endDate: tournament.end_date ?? null,
          },
          match: {
            roundName: match.round_name ?? null,
            matchNumber: match.match_number ?? null,
            status: match.status ?? match.match_status ?? null,
            scheduledAt: match.scheduled_at ?? null,
            player1: nameOf(match.player1_id),
            player2: nameOf(match.player2_id),
            player1Score: match.player1_score ?? null,
            player2Score: match.player2_score ?? null,
            winner: match.winner_id ? nameOf(match.winner_id) : null,
          },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  return { info, loading };
}

function capitalize(value: string) {
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const TOURNAMENT_TYPE_LABELS: Record<string, string> = {
  eliminazione_diretta: 'Eliminazione Diretta',
  girone_eliminazione: 'Gironi + Eliminazione',
  campionato: 'Campionato',
};

type TournamentBookingSectionProps = {
  info: BookingTournamentInfo;
  className: string;
  headerClassName: string;
};

export function TournamentBookingSection({
  info,
  className,
  headerClassName,
}: TournamentBookingSectionProps) {
  const { tournament, match } = info;
  const hasScore =
    match.player1Score !== null &&
    match.player2Score !== null &&
    (match.player1Score > 0 || match.player2Score > 0);

  const rows = (
    [
      ['Competizione', tournament.title],
      [
        'Tipo',
        tournament.type
          ? TOURNAMENT_TYPE_LABELS[tournament.type] ?? capitalize(tournament.type)
          : null,
      ],
      ['Categoria', tournament.category],
      ['Livello', tournament.level],
      [
        'Formato',
        tournament.matchFormat
          ? capitalize(tournament.matchFormat)
          : tournament.bestOf
          ? `Al meglio dei ${tournament.bestOf} set`
          : null,
      ],
      [
        'Turno',
        [match.roundName, match.matchNumber ? `Partita ${match.matchNumber}` : null]
          .filter(Boolean)
          .join(' · ') || null,
      ],
      ['Risultato', hasScore ? `${match.player1Score} - ${match.player2Score}` : null],
      ['Vincitore', match.winner],
    ] as Array<[string, string | null]>
  ).filter(([, value]) => value);

  return (
    <div className={className}>
      <div className={headerClassName}>
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli Competizione</h2>
      </div>
      <div className="px-6 py-6">
        <div className="space-y-6">
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 ${
                index < rows.length - 1 ? 'pb-6 border-b border-gray-200' : ''
              }`}
            >
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                {label}
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
