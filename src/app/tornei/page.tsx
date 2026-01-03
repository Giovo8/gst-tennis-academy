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
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{backgroundColor: 'rgba(3, 72, 99, 0.1)', color: 'var(--secondary)'}}>
                <Trophy className="h-4 w-4" />
                Competizioni
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold" style={{color: 'var(--secondary)'}}>
                Tornei e Campionati
              </h1>
              <p className="text-lg max-w-xl" style={{color: 'var(--secondary)', opacity: 0.8}}>
                Partecipa alle nostre competizioni e metti alla prova le tue abilità
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white" style={{borderColor: 'rgba(3, 72, 99, 0.2)'}}>
                <Trophy className="h-4 w-4" style={{color: 'var(--secondary)'}} />
                <span style={{color: 'var(--secondary)'}}>{tournaments.length} tornei</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin" style={{color: 'var(--secondary)'}} />
            <p className="mt-4" style={{color: 'var(--secondary)', opacity: 0.8}}>Caricamento tornei...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border p-8 text-center" style={{borderColor: 'rgba(3, 72, 99, 0.2)', backgroundColor: 'rgba(3, 72, 99, 0.05)'}}>
            <p style={{color: 'var(--secondary)', opacity: 0.8}}>{error}</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border mb-6" style={{backgroundColor: 'rgba(3, 72, 99, 0.1)', borderColor: 'rgba(3, 72, 99, 0.2)'}}>
              <Trophy className="w-10 h-10" style={{color: 'var(--secondary)'}} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{color: 'var(--secondary)'}}>Nessun torneo programmato</h3>
            <p style={{color: 'var(--secondary)', opacity: 0.8}}>Torna presto per scoprire i nuovi tornei!</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tornei/${t.id}`}
                className="group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all duration-200"
                style={{borderColor: 'rgba(3, 72, 99, 0.2)'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(3, 72, 99, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(3, 72, 99, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = 'rgba(3, 72, 99, 0.2)';
                }}
              >
                <div className="relative">
                  {/* Icon and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200" style={{backgroundColor: 'var(--secondary)'}}>
                      {t.tournament_type === 'campionato' ? (
                        <Award className="w-6 h-6" style={{color: 'white', opacity: 0.9}} />
                      ) : (
                        <Trophy className="w-6 h-6" style={{color: 'white', opacity: 0.9}} />
                      )}
                    </div>
                    {t.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-xl font-bold mb-2 transition-colors" style={{color: 'var(--secondary)'}}>
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-sm line-clamp-2 mb-4" style={{color: 'var(--secondary)', opacity: 0.8}}>{t.description}</p>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {t.start_date && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{backgroundColor: 'rgba(3, 72, 99, 0.1)', borderColor: 'rgba(3, 72, 99, 0.2)', color: 'var(--secondary)'}}>
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(t.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    {t.max_participants && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{backgroundColor: 'rgba(3, 72, 99, 0.1)', borderColor: 'rgba(3, 72, 99, 0.2)', color: 'var(--secondary)'}}>
                        <Users className="h-3.5 w-3.5" />
                        {t.max_participants} partecipanti
                      </div>
                    )}
                    {t.category && (
                      <span className="px-2.5 py-1 rounded-lg border" style={{backgroundColor: 'rgba(3, 72, 99, 0.1)', borderColor: 'rgba(3, 72, 99, 0.2)', color: 'var(--secondary)'}}>
                        {t.category}
                      </span>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                    <ArrowRight className="h-5 w-5" style={{color: 'var(--secondary)'}} />
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
