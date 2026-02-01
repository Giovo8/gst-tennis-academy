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


type FilterKey = "all" | "tornei" | "campionati";

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "tornei", label: "Tornei" },
  { id: "campionati", label: "Campionati" },
];

export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    let abortController: AbortController | null = null;

    async function load() {
      try {
        // Create abort controller with manual timeout (better browser support)
        abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController?.abort(), 9000);

        // Use upcoming=true to get only active tournaments for homepage
        const res = await fetch("/api/tournaments?upcoming=true", {
          signal: abortController.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);
        
        if (!res.ok) {
          console.error("[TournamentsSection] API error:", res.status, res.statusText);
          
          // Retry logic for 5xx errors
          if (res.status >= 500 && retryCount < maxRetries) {
            retryCount++;
            console.warn(`[TournamentsSection] Retrying (${retryCount}/${maxRetries})...`);
            setTimeout(load, 1000 * retryCount); // Exponential backoff
            return;
          }
          
          if (mounted) {
            setError("Errore nel caricamento dei tornei");
            setLoading(false);
          }
          return;
        }
        
        const json = await res.json();
        const tournaments = json.tournaments || [];
        
        // Filtra via i tornei conclusi/archiviati (backup filter)
        const activeTournaments = tournaments.filter(
          (t: Tournament) =>
            t.status !== 'Concluso' &&
            t.status !== 'Completato' &&
            t.status !== 'Chiuso'
        );
        
        if (mounted) {
          setItems(activeTournaments);
          setError(null); // Clear any previous errors
          setLoading(false);
        }
      } catch (err: any) {
        // Handle abort specifically
        if (err?.name === 'AbortError') {
          console.warn("[TournamentsSection] Request aborted/timed out");
        } else {
          console.error("[TournamentsSection] Fetch failed:", err?.message || err);
        }
        
        // Retry on timeout or network errors
        if ((err?.name === 'AbortError' || !navigator.onLine) && retryCount < maxRetries) {
          retryCount++;
          console.warn(`[TournamentsSection] Retrying (${retryCount}/${maxRetries})...`);
          setTimeout(load, 1000 * retryCount);
          return;
        }
        
        if (mounted) {
          setError("Errore nel caricamento dei tornei");
          setLoading(false);
        }
      }
    }
    
    load();
    
    return () => {
      mounted = false;
      abortController?.abort();
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

  const filterByCategory = (tournament: Tournament): boolean => {
    if (activeFilter === "all") return true;
    const type = tournament.tournament_type || tournament.competition_type;
    if (activeFilter === "campionati") {
      return type === "campionato";
    }
    // "tornei": tutti gli altri tipi
    return (
      type === "eliminazione_diretta" ||
      type === "girone_eliminazione" ||
      !type
    );
  };

  const filteredItems = items.filter(filterByCategory);

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

        {/* Lista eventi stile "Events" */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 py-10 rounded-md px-4 bg-red-50">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-secondary/70 py-10 rounded-md px-4 bg-secondary/5">
            Al momento non ci sono tornei in programma.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((tournament) => {
              const typeLabel = getTournamentTypeLabel(tournament);
              const date = tournament.start_date ? new Date(tournament.start_date) : null;
              const weekday = date ? format(date, "EEE", { locale: it }) : "";
              const day = date ? format(date, "dd", { locale: it }) : "";
              const monthYear = date ? format(date, "MMM yyyy", { locale: it }).toUpperCase() : "DATA DA DEFINIRE";
              
              // Determina il colore del bordo in base allo stato
              const getBorderColor = () => {
                const status = tournament.status?.toLowerCase();
                if (status === "aperto") return "#10b981"; // verde emerald
                if (status === "in corso") return "#0ea5e9"; // blu secondary
                if (status === "concluso" || status === "completato" || status === "chiuso") return "#6b7280"; // grigio
                return "#0ea5e9"; // default blu
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
            className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 text-sm font-semibold rounded-sm bg-secondary text-white hover:opacity-90 transition-colors"
          >
            Vedi tutti i tornei
          </Link>
        </div>
      </div>
    </section>
  );
}
