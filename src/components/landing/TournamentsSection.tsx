"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  max_participants?: number;
  tournament_type?: TournamentType;
  competition_type?: TournamentType;
  status?: string;
};


export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/tournaments", {
          headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
          if (mounted) {
            setError(`Errore nel caricamento (${res.status})`);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        const tournaments = json.tournaments || [];

        const activeTournaments = (Array.isArray(tournaments) ? tournaments : []).filter(
          (t: Tournament) =>
            t.status !== 'Concluso' &&
            t.status !== 'Completato' &&
            t.status !== 'Chiuso'
        );

        if (mounted) {
          setItems(activeTournaments);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError("Errore nel caricamento dei tornei");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="tornei" className="pt-6 pb-20 sm:py-24 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Competizioni
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Scopri i prossimi eventi in programma alla GST Academy e trova il torneo giusto per te.
          </p>
        </div>

        {/* Lista eventi stile "Events" */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-secondary mb-2" />
            <p className="text-xs text-secondary/50">Caricamento tornei...</p>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 py-10 rounded-lg px-4 bg-red-50 border border-red-200">
            <p className="font-semibold mb-2">❌ {error}</p>
            <p className="text-xs text-red-500">
              Se il problema persiste, contatta l&apos;amministratore.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-secondary/70 py-10 rounded-lg px-4 bg-secondary/5 border border-secondary/10">
            <p className="font-semibold mb-1">📭 Al momento non ci sono tornei in programma</p>
            <p className="text-xs text-secondary/60">
              Torna presto a controllare i prossimi eventi!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((tournament) => {
              const date = tournament.start_date ? new Date(tournament.start_date) : null;
              const monthStr = date
                ? date.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
                : null;
              const dayStr = date ? date.getDate().toString() : null;

              const getTypeLabel = () => {
                const type = tournament.tournament_type || tournament.competition_type;
                if (type === 'campionato') return 'Campionato';
                if (type === 'girone_eliminazione') return 'Girone';
                return 'Torneo';
              };

              const bgColor = tournament.status?.toLowerCase() === 'in corso'
                ? '#023047'
                : 'var(--secondary)';

              return (
                <Link
                  key={tournament.id}
                  href={`/tornei/${tournament.id}`}
                  className="block rounded-lg overflow-hidden hover:opacity-95 transition-opacity"
                  style={{ background: bgColor }}
                >
                  <div className="flex items-center gap-4 py-3 px-3">
                    {/* Date box */}
                    <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                      {date ? (
                        <>
                          <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                            {monthStr}
                          </span>
                          <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                            {dayStr}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-white/70 leading-none">TBD</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{tournament.title}</p>
                      {tournament.description && (
                        <p className="text-xs text-white/70 mt-0.5 truncate">{tournament.description}</p>
                      )}
                    </div>

                    {/* Type label */}
                    <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                      {getTypeLabel()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pulsante "Vedi tutti" */}
        <div className="text-center mt-8 sm:mt-10">
          <Link
            href="/tornei"
            className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3.5 sm:py-3 text-sm font-medium text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all"
          >
            Vedi tutti i tornei
          </Link>
        </div>
      </div>
    </section>
  );
}
