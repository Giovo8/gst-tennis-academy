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
  status?: string;
};

const defaultTournaments: Tournament[] = [
  {
    id: "1",
    title: "Torneo Sociale di Primavera 2026",
    description: "Torneo open maschile e femminile. Formula a eliminazione diretta con tabelloni separati. Iscrizioni aperte fino al 20 marzo.",
    start_date: "2026-04-05",
    tournament_type: "eliminazione_diretta",
    status: "upcoming"
  },
  {
    id: "2",
    title: "Campionato Invernale a Squadre",
    description: "Competizione a squadre con formula girone all'italiana. Incontri ogni sabato pomeriggio. Aperto a giocatori di tutti i livelli.",
    start_date: "2026-02-15",
    tournament_type: "girone_eliminazione",
    status: "upcoming"
  }
];

type FilterKey = "all" | "tornei" | "campionati";

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "tornei", label: "Tornei" },
  { id: "campionati", label: "Campionati" },
];

export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>(defaultTournaments);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/tournaments?upcoming=true");
        const json = await res.json();
        if (res.ok && json.tournaments && json.tournaments.length > 0) {
          // Filtra tornei validi (con titolo non numerico e descrizione presente)
          const validTournaments = json.tournaments.filter((t: Tournament) => 
            t.title && 
            t.title.length > 10 && 
            !/^\d+$/.test(t.title) && // Escludi titoli che sono solo numeri
            t.description && 
            t.description.length > 20
          );
          
          if (mounted) {
            setItems(validTournaments.length > 0 ? validTournaments : defaultTournaments);
          }
        } else {
          if (mounted) {
            setItems(defaultTournaments);
          }
        }
      } catch (err) {
        if (mounted) {
          setItems(defaultTournaments);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const getTournamentTypeLabel = (type?: TournamentType) => {
    switch(type) {
      case "eliminazione_diretta": return "Torneo";
      case "girone_eliminazione": return "Torneo";
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

  const filterByCategory = (tournament: Tournament): boolean => {
    if (activeFilter === "all") return true;
    if (activeFilter === "campionati") {
      return tournament.tournament_type === "campionato";
    }
    // "tornei": tutti gli altri tipi
    return (
      tournament.tournament_type === "eliminazione_diretta" ||
      tournament.tournament_type === "girone_eliminazione" ||
      !tournament.tournament_type
    );
  };

  const filteredItems = items.filter(filterByCategory).slice(0, 3);

  return (
    <section id="tornei" className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary/70">
            Competizioni
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
            Tornei e campionati
          </h2>
          <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto text-secondary/70">
            Scopri i prossimi eventi in programma alla GST Tennis Academy e trova il torneo giusto per il tuo livello.
          </p>
        </div>

        {/* Filtri categoria */}
        <div className="flex flex-wrap items-center justify-center gap-3 pb-4 mb-6 sm:mb-8 text-center">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`text-sm px-3 py-1.5 rounded-sm transition-colors ${
                activeFilter === filter.id
                  ? "bg-secondary text-white"
                  : "text-secondary/70 hover:text-secondary"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Lista eventi stile "Events" */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-secondary/70 py-10 rounded-md px-4 bg-secondary/5">
            Al momento non ci sono tornei imminenti.
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
            {filteredItems.map((tournament) => {
              const typeLabel = getTournamentTypeLabel(tournament.tournament_type);
              const statusInfo = getStatusInfo(tournament.status);
              const date = tournament.start_date ? new Date(tournament.start_date) : null;
              const weekday = date ? format(date, "EEE", { locale: it }) : "";
              const day = date ? format(date, "dd", { locale: it }) : "";
              const monthYear = date ? format(date, "MMM yyyy", { locale: it }) : "Data da definire";

              return (
                <article
                  key={tournament.id}
                  className="bg-secondary/5 rounded-md px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6"
                >
                  {/* Colonna data */}
                  <div className="flex flex-col items-center justify-center sm:w-32">
                    <p className="text-xs font-semibold uppercase text-secondary/50 text-center">
                      {weekday}
                    </p>
                    <p className="text-3xl sm:text-4xl font-bold text-secondary leading-none text-center">
                      {day}
                    </p>
                    <p className="text-xs text-secondary/60 mt-1 text-center">
                      {monthYear}
                    </p>
                  </div>

                  {/* Contenuto centrale */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-secondary/60">
                        {typeLabel}
                      </span>
                      {statusInfo && (
                        <span className={statusInfo.className}>{statusInfo.label}</span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-secondary truncate">
                      {tournament.title}
                    </h3>
                    <p className="text-xs text-secondary/60 mt-1">
                      Presso GST Tennis Academy
                    </p>
                    {tournament.description && (
                      <p className="text-sm text-secondary/70 mt-2 line-clamp-2">
                        {tournament.description}
                      </p>
                    )}
                  </div>

                  {/* Azione a destra */}
                  <div className="sm:pl-4 flex-shrink-0">
                    <Link
                      href={`/tornei/${tournament.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border border-secondary/40 text-secondary rounded-sm hover:bg-secondary hover:text-white transition-colors whitespace-nowrap"
                    >
                      Vedi dettagli
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pulsante "Vedi tutti" */}
        <div className="text-center">
          <Link
            href="/tornei"
            className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 text-sm font-semibold rounded-sm bg-secondary text-white hover:opacity-90 transition-colors"
          >
            Vedi tutti i tornei
          </Link>
        </div>
      </div>
    </section>
  );
}
