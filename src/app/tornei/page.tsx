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
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in corso':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completato':
      case 'concluso':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-frozen-500/20 text-frozen-400 border-frozen-500/30';
    }
  };

  return (
    <main className="min-h-screen bg-frozen-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/4 top-20 h-72 w-72 rounded-full bg-frozen-500/10 blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
          <div className="absolute right-1/4 top-10 h-56 w-56 rounded-full bg-frozen-500/10 blur-3xl animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 py-12 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-frozen-500/30 bg-frozen-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-frozen-400">
                <Trophy className="h-4 w-4" />
                Tornei GST Academy
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                <span className="bg-gradient-to-r from-white via-frozen-200 to-white bg-clip-text text-transparent">
                  Tornei in Arrivo
                </span>
              </h1>
              <p className="text-lg text-white/60 max-w-xl">
                Partecipa ai nostri tornei e metti alla prova le tue abilità. 
                Sfida altri giocatori e scala la classifica!
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5">
                <Trophy className="h-4 w-4 text-frozen-400" />
                <span className="text-white/70">{tournaments.length} tornei</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-frozen-500/20 blur-xl animate-pulse" />
              <Loader2 className="relative w-12 h-12 animate-spin text-frozen-400" />
            </div>
            <p className="mt-4 text-white/50 animate-pulse">Caricamento tornei...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <Trophy className="w-10 h-10 text-white/30" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nessun torneo programmato</h3>
            <p className="text-white/50">Torna presto per scoprire i nuovi tornei!</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tornei/${t.id}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-frozen-500/30 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-frozen-500/10"
              >
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-frozen-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative">
                  {/* Icon and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-frozen-500/20 to-frozen-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {t.tournament_type === 'campionato' ? (
                        <Award className="w-6 h-6 text-frozen-400" />
                      ) : (
                        <Trophy className="w-6 h-6 text-frozen-400" />
                      )}
                    </div>
                    {t.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-frozen-300 transition-colors">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-sm text-white/50 line-clamp-2 mb-4">{t.description}</p>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                    {t.start_date && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5">
                        <Calendar className="h-3.5 w-3.5 text-frozen-400" />
                        {new Date(t.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    {t.max_participants && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5">
                        <Users className="h-3.5 w-3.5 text-frozen-400" />
                        {t.max_participants} partecipanti
                      </div>
                    )}
                    {t.category && (
                      <span className="px-2.5 py-1 rounded-lg bg-frozen-500/10 text-frozen-400">
                        {t.category}
                      </span>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="h-5 w-5 text-frozen-400" />
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
