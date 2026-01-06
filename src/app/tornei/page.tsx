"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Calendar, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import PublicNavbar from "@/components/layout/PublicNavbar";
import PromoBanner from "@/components/layout/PromoBanner";

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
        const res = await fetch('/api/tournaments?upcoming=true');
        let json: any = {};
        try {
          json = await res.json();
        } catch (e) {
          json = {};
        }
        if (res.ok) {
          if (mounted) setTournaments(json.tournaments ?? []);
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
              {/* Filtri per stato */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 sm:mb-12">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`text-sm px-4 py-2 border transition-colors ${
                    activeFilter === "all"
                      ? "border-secondary bg-white text-secondary font-medium"
                      : "border-transparent text-secondary/70 hover:text-secondary"
                  }`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setActiveFilter("open")}
                  className={`text-sm px-4 py-2 border transition-colors ${
                    activeFilter === "open"
                      ? "border-secondary bg-white text-secondary font-medium"
                      : "border-transparent text-secondary/70 hover:text-secondary"
                  }`}
                >
                  Iscrizioni aperte
                </button>
                <button
                  onClick={() => setActiveFilter("running")}
                  className={`text-sm px-4 py-2 border transition-colors ${
                    activeFilter === "running"
                      ? "border-secondary bg-white text-secondary font-medium"
                      : "border-transparent text-secondary/70 hover:text-secondary"
                  }`}
                >
                  In corso
                </button>
                <button
                  onClick={() => setActiveFilter("closed")}
                  className={`text-sm px-4 py-2 border transition-colors ${
                    activeFilter === "closed"
                      ? "border-secondary bg-white text-secondary font-medium"
                      : "border-transparent text-secondary/70 hover:text-secondary"
                  }`}
                >
                  Conclusi
                </button>
              </div>

              {/* Lista tornei */}
              {filteredTournaments.length === 0 ? (
                <div className="text-center py-12 bg-secondary/5 rounded-lg">
                  <p className="text-sm text-secondary/70">Nessun torneo trovato per questa categoria.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
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
                      ? format(startDate, "MMM yyyy", { locale: it })
                      : "Data da definire";

                    return (
                      <article
                        key={t.id}
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
                          <p className="text-xs font-semibold uppercase tracking-wide text-secondary/60 mb-1">
                            {typeLabel}
                          </p>
                          <h2 className="text-base sm:text-lg font-semibold text-secondary">
                            {t.title}
                          </h2>
                          <div className="mt-1">
                            {t.status && (
                              <p className="text-xs text-secondary/60">
                                {t.category || (t.tournament_type === "campionato" ? "Team" : "Open")} - {t.status}
                              </p>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-sm text-secondary/70 mt-2 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {/* Azione a destra */}
                        <div className="sm:pl-4 flex-shrink-0">
                          <Link
                            href={`/tornei/${t.id}`}
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
            </>
          )}
        </div>
        </section>
      </main>
    </div>
  );
}
