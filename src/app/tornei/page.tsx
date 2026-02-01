"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Calendar, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import PublicNavbar from "@/components/layout/PublicNavbar";

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  level?: string;
  max_participants?: number;
  status?: string;
  tournament_type?: string;
  competition_type?: string;
};

type FilterKey = "all" | "open" | "running" | "closed";

export default function TorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/tournaments');
        let json: any = {};
        try {
          json = await res.json();
        } catch (e) {
          json = {};
        }
        if (res.ok) {
          // Filtra via i tornei conclusi/archiviati (come nella dashboard admin e homepage)
          const activeTournaments = (json.tournaments ?? []).filter(
            (t: Tournament) => 
              t.status !== 'Concluso' && 
              t.status !== 'Completato' && 
              t.status !== 'Chiuso'
          );
          if (mounted) setTournaments(activeTournaments);
        } else {
          setError(json.error || 'Impossibile caricare i tornei');
        }
      } catch (err: any) {
        setError(err.message || 'Errore rete');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const getStatusStyle = (status?: string) => {
    const normalized = status?.toLowerCase();
    if (normalized === "aperto") {
      return "border border-emerald-600 text-emerald-700 bg-white";
    }
    if (normalized === "in corso") {
      return "border border-amber-600 text-amber-700 bg-white";
    }
    if (normalized === "completato" || normalized === "concluso" || normalized === "chiuso") {
      return "border border-secondary/30 text-secondary/70 bg-white";
    }
    return "border border-secondary/30 text-secondary/70 bg-white";
  };

  const getTournamentTypeLabel = (type?: string) => {
    if (!type) return "Torneo";
    const normalized = type.toLowerCase();
    if (normalized === "campionato") return "Campionato";
    return "Torneo";
  };

  const matchFilter = (t: Tournament): boolean => {
    const status = t.status?.toLowerCase() ?? "";
    if (activeFilter === "all") return true;
    if (activeFilter === "open") return status === "aperto";
    if (activeFilter === "running") return status === "in corso";
    if (activeFilter === "closed") return (
      status === "completato" || status === "concluso" || status === "chiuso"
    );
    return true;
  };

  const filteredTournaments = tournaments.filter(matchFilter);

  return (
    <div className="min-h-screen bg-white">

      <PublicNavbar />
      <main>
        <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary">
              Competizioni
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
              Tornei e campionati
            </h1>
            <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto text-secondary opacity-80">
              Scopri tutti i tornei e i campionati organizzati dalla GST Tennis Academy e trova la competizione giusta per te.
            </p>
          </div>

          {/* Loading / error / empty states */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-secondary" />
              <p className="mt-4 text-sm text-secondary/70">Caricamento tornei...</p>
            </div>
          ) : error ? (
            <div className="max-w-xl mx-auto bg-red-50 text-red-800 rounded-md px-4 py-3 text-sm text-center">
              {error}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary/5 mb-6">
                <Trophy className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-secondary">Nessun torneo programmato</h3>
              <p className="text-sm text-secondary/70">Torna presto per scoprire i nuovi tornei!</p>
            </div>
          ) : (
            <>
              {/* Lista tornei */}
              {filteredTournaments.length === 0 ? (
                <div className="text-center py-12 bg-secondary/5 rounded-lg">
                  <p className="text-sm text-secondary/70">Nessun torneo trovato.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTournaments.map((t) => {
                    const typeLabel = getTournamentTypeLabel(t.tournament_type);
                    const startDate = t.start_date ? new Date(t.start_date) : null;
                    const weekday = startDate
                      ? format(startDate, "EEE", { locale: it })
                      : "";
                    const day = startDate
                      ? format(startDate, "dd", { locale: it })
                      : "";
                    const monthYear = startDate
                      ? format(startDate, "MMM yyyy", { locale: it }).toUpperCase()
                      : "DATA DA DEFINIRE";
                    
                    // Determina il colore del bordo in base allo stato
                    const getBorderColor = () => {
                      const status = t.status?.toLowerCase();
                      if (status === "aperto") return "#10b981"; // verde emerald
                      if (status === "in corso") return "#0ea5e9"; // blu secondary
                      if (status === "concluso" || status === "completato" || status === "chiuso") return "#6b7280"; // grigio
                      return "#0ea5e9"; // default blu
                    };

                    return (
                      <Link
                        key={t.id}
                        href={`/tornei/${t.id}`}
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
                            {t.title}
                          </h3>
                          {t.description && (
                            <p className="text-sm text-secondary/70 mt-2 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        </section>
      </main>
    </div>
  );
}
