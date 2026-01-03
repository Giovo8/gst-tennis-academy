"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Calendar, Users, ArrowRight, Loader2, Award } from "lucide-react";

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

export default function TorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    switch (status?.toLowerCase()) {
      case 'aperto':
        return 'bg-frozen-50 text-frozen-600 border-frozen-200';
      case 'in corso':
        return 'bg-frozen-100 text-frozen-700 border-frozen-300';
      case 'completato':
      case 'concluso':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      default:
        return 'bg-frozen-50 text-frozen-600 border-frozen-200';
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-frozen-200 bg-frozen-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-frozen-600">
                <Trophy className="h-4 w-4" />
                Competizioni
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-frozen-900">
                Tornei e Campionati
              </h1>
              <p className="text-lg text-frozen-600 max-w-xl">
                Partecipa alle nostre competizioni e metti alla prova le tue abilità
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-frozen-100 bg-white">
                <Trophy className="h-4 w-4 text-frozen-500" />
                <span className="text-frozen-600">{tournaments.length} tornei</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-frozen-500" />
            <p className="mt-4 text-frozen-600">Caricamento tornei...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-frozen-200 bg-frozen-50 p-8 text-center">
            <p className="text-frozen-600">{error}</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-frozen-50 border border-frozen-100 mb-6">
              <Trophy className="w-10 h-10 text-frozen-500" />
            </div>
            <h3 className="text-xl font-bold text-frozen-900 mb-2">Nessun torneo programmato</h3>
            <p className="text-frozen-600">Torna presto per scoprire i nuovi tornei!</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tornei/${t.id}`}
                className="group relative overflow-hidden rounded-xl border border-frozen-100 bg-white p-6 shadow-sm shadow-frozen-100 hover:bg-frozen-50 hover:border-frozen-300 transition-all duration-200"
              >
                <div className="relative">
                  {/* Icon and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-frozen-50 flex items-center justify-center group-hover:bg-frozen-100 transition-colors duration-200">
                      {t.tournament_type === 'campionato' ? (
                        <Award className="w-6 h-6 text-frozen-500" />
                      ) : (
                        <Trophy className="w-6 h-6 text-frozen-500" />
                      )}
                    </div>
                    {t.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-xl font-bold text-frozen-900 mb-2 group-hover:text-frozen-700 transition-colors">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-sm text-frozen-600 line-clamp-2 mb-4">{t.description}</p>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-frozen-600">
                    {t.start_date && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-frozen-50 border border-frozen-100">
                        <Calendar className="h-3.5 w-3.5 text-frozen-500" />
                        {new Date(t.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    {t.max_participants && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-frozen-50 border border-frozen-100">
                        <Users className="h-3.5 w-3.5 text-frozen-500" />
                        {t.max_participants} partecipanti
                      </div>
                    )}
                    {t.category && (
                      <span className="px-2.5 py-1 rounded-lg bg-frozen-50 text-frozen-600 border border-frozen-100">
                        {t.category}
                      </span>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                    <ArrowRight className="h-5 w-5 text-frozen-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
