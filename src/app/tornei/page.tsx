"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Target, Users, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto bg-white min-h-screen">
      <PublicNavbar home flush />
      <main>
        <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
              Competizioni
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
              Tornei e campionati
            </h1>
            <p className="text-base sm:text-lg max-w-2xl text-gray-500">
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
            <div className="max-w-xl mx-auto bg-red-50 text-red-800 rounded-lg px-4 py-3 text-sm text-center">
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
                <div className="space-y-2">
                  {filteredTournaments.map((t) => {
                    const type = t.tournament_type || t.competition_type;
                    const TypeIcon = type === "campionato" ? Users : type === "girone_eliminazione" ? Target : Trophy;
                    const status = t.status?.toLowerCase();
                    const phaseLabel =
                      status === "aperto" ? "Iscrizioni aperte" :
                      status === "in corso" ? "In corso" :
                      t.status || "In preparazione";

                    return (
                      <Link
                        key={t.id}
                        href={`/tornei/${t.id}`}
                        className="block rounded-lg overflow-hidden hover:opacity-95 transition-opacity"
                        style={{ background: status === "in corso" ? "#023047" : "var(--secondary)" }}
                      >
                        <div className="flex items-center gap-4 py-3 px-3">
                          <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                            <TypeIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{t.title}</p>
                            {t.description && (
                              <p className="text-xs text-white/70 mt-0.5 truncate">{t.description}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                            {phaseLabel}
                          </span>
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
    </div>
  );
}
