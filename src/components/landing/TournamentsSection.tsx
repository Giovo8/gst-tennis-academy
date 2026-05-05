"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

  const getTournamentTypeLabel = (tournament: Tournament) => {
    const type = tournament.tournament_type || tournament.competition_type;
    switch(type) {
      case "eliminazione_diretta": return "Torneo";
      case "girone_eliminazione": return "Torneo con fase a gironi";
      case "campionato": return "Campionato";
      default: return "Torneo";
    }
  };

  const getStatusInfo = (status?: string) => {
    if (!status) return null;
    const normalized = status.toLowerCase();
    if (normalized === "aperto") {
      return {
        label: "Iscrizioni aperte",
        className:
          "inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium bg-emerald-50 text-emerald-700",
      };
    }
    if (normalized === "chiuso" || normalized === "terminato") {
      return {
        label: "Iscrizioni chiuse",
        className:
          "inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium bg-secondary/5 text-secondary/70",
      };
    }
    return null;
  };



  return (
    <section id="tornei" className="py-20 sm:py-24 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
            Competizioni
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Tornei e campionati
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Scopri i prossimi eventi in programma alla GST Tennis Academy e trova il torneo giusto per il tuo livello.
          </p>
        </div>

        {/* Lista eventi stile "Events" */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-secondary mb-2" />
            <p className="text-xs text-secondary/50">Caricamento tornei...</p>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 py-10 rounded-md px-4 bg-red-50 border border-red-200">
            <p className="font-semibold mb-2">❌ {error}</p>
            <p className="text-xs text-red-500">
              Se il problema persiste, contatta l&apos;amministratore.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-secondary/70 py-10 rounded-md px-4 bg-secondary/5 border border-secondary/10">
            <p className="font-semibold mb-1">📭 Al momento non ci sono tornei in programma</p>
            <p className="text-xs text-secondary/60">
              Torna presto a controllare i prossimi eventi!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((tournament) => {
              const typeLabel = getTournamentTypeLabel(tournament);
              const date = tournament.start_date ? new Date(tournament.start_date) : null;
              const weekday = date ? format(date, "EEE", { locale: it }) : "";
              const day = date ? format(date, "dd", { locale: it }) : "";
              const monthYear = date ? format(date, "MMM yyyy", { locale: it }).toUpperCase() : "DATA DA DEFINIRE";

              const getBorderColor = () => {
                const status = tournament.status?.toLowerCase();
                if (status === "aperto") return "#10b981";
                if (status === "concluso" || status === "completato" || status === "chiuso") return "#6b7280";
                return "#034863";
              };

              return (
                <Link
                  key={tournament.id}
                  href={`/tornei/${tournament.id}`}
                  className="bg-white px-0 py-0 flex flex-row items-stretch border-l-4 border border-gray-200 rounded-md overflow-hidden hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderLeftColor: getBorderColor() }}
                >
                  {/* Colonna data */}
                  <div className="bg-secondary flex flex-col items-center justify-center w-20 sm:w-28 flex-shrink-0 px-3 py-5">
                    <p className="text-xs font-semibold uppercase text-white/70 text-center mb-1">
                      {weekday}
                    </p>
                    <p className="text-4xl sm:text-3xl md:text-4xl font-bold text-white leading-none text-center">
                      {day}
                    </p>
                    <p className="text-xs font-semibold uppercase text-white/70 mt-1.5 text-center whitespace-nowrap">
                      {monthYear}
                    </p>
                  </div>

                  {/* Barra separatrice */}
                  <div className="w-px bg-gray-200"></div>

                  {/* Contenuto centrale */}
                  <div className="flex-1 min-w-0 px-5 sm:px-6 py-5 sm:py-6">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-secondary/60">
                        {typeLabel}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-secondary truncate">
                      {tournament.title}
                    </h3>
                    {tournament.description && (
                      <p className="text-sm text-secondary/70 mt-2 line-clamp-2">
                        {tournament.description}
                      </p>
                    )}
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
            className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-md border border-secondary text-secondary hover:bg-secondary hover:text-white transition-all"
          >
            Vedi tutti i tornei
          </Link>
        </div>
      </div>
    </section>
  );
}
