"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { BookableTournament, BookableTournamentMatch } from "@/lib/bookings/tournamentBookings";

// Riferimento stabile: evita ricalcoli a cascata nei consumer mentre le partite non sono ancora arrivate.
const NO_MATCHES: BookableTournamentMatch[] = [];

async function fetchTournamentApi<T>(query = ""): Promise<T | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return null;

  const res = await fetch(`/api/bookings/tournament-matches${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * Tornei in corso prenotabili dall'utente corrente (tipo prenotazione "torneo").
 * Elenco leggero: lista vuota = il tipo "Torneo" non va mostrato.
 */
export function useBookableTournaments() {
  const [tournaments, setTournaments] = useState<BookableTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchTournamentApi<{ tournaments: BookableTournament[] }>();
        if (!cancelled) setTournaments(data?.tournaments ?? []);
      } catch (err) {
        console.error("Errore caricamento tornei prenotabili:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tournaments, loading };
}

/** Partite prenotabili di un torneo, caricate alla selezione e tenute in cache per torneo. */
export function useTournamentMatches(tournamentId: string | undefined) {
  const [cache, setCache] = useState<Record<string, BookableTournamentMatch[]>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!tournamentId || cache[tournamentId]) return;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchTournamentApi<{ matches: BookableTournamentMatch[] }>(
          `?tournament_id=${encodeURIComponent(tournamentId)}`
        );
        if (cancelled) return;
        if (data) {
          setCache((prev) => ({ ...prev, [tournamentId]: data.matches ?? [] }));
        } else {
          setFailed((prev) => ({ ...prev, [tournamentId]: true }));
        }
      } catch (err) {
        console.error("Errore caricamento partite del torneo:", err);
        if (!cancelled) setFailed((prev) => ({ ...prev, [tournamentId]: true }));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, cache]);

  const matches = tournamentId ? cache[tournamentId] : undefined;
  return {
    matches: matches ?? NO_MATCHES,
    loading: Boolean(tournamentId) && !matches && !(tournamentId && failed[tournamentId]),
    failed: Boolean(tournamentId && failed[tournamentId]),
  };
}
