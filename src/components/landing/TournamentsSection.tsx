"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy, Target, Users } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

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
    <section id="tornei" className="pt-6 pb-20 sm:py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <Reveal className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Competizioni
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl max-w-5xl text-gray-500">
            Scopri i prossimi eventi in programma alla GST Academy e trova il torneo giusto per te.
          </p>
        </Reveal>

        {/* Lista eventi stile "Events" */}
        <Reveal delay={0.1}>
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
              const type = tournament.tournament_type || tournament.competition_type;
              const TypeIcon = type === 'campionato' ? Users : type === 'girone_eliminazione' ? Target : Trophy;

              const getPhaseLabel = () => {
                const status = tournament.status?.toLowerCase();
                if (status === 'aperto') return 'Iscrizioni aperte';
                if (status === 'in corso') return 'In corso';
                return tournament.status || 'In preparazione';
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
                    {/* Icona competizione */}
                    <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{tournament.title}</p>
                      {tournament.description && (
                        <p className="text-xs text-white/70 mt-0.5 truncate">{tournament.description}</p>
                      )}
                    </div>

                    {/* Fase */}
                    <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                      {getPhaseLabel()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        </Reveal>

        {/* Pulsante "Vedi tutti" */}
        <Reveal className="text-center mt-8 sm:mt-10">
          <Link
            href="/tornei"
            className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3.5 sm:py-3 text-sm font-medium text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all"
          >
            Vedi tutti i tornei
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
