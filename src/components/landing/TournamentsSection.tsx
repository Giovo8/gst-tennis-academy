"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy, Award } from "lucide-react";

type CompetitionType = 'torneo' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  start_date?: string;
  max_participants?: number;
  competition_type?: CompetitionType;
  format?: string;
  status?: string;
};

export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | CompetitionType>('all');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/tournaments?upcoming=true");
        const json = await res.json();
        if (res.ok) {
          if (mounted) setItems(json.tournaments ?? []);
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Filter items based on selected tab
  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.competition_type === filter);

  const torneiCount = items.filter(t => t.competition_type === 'torneo' || !t.competition_type).length;
  const campionatiCount = items.filter(t => t.competition_type === 'campionato').length;

  return (
    <section id="tornei" className="py-20">
      <div className="container section">
        <div className="section-header space-y-2 mb-12">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-amber-400">Competizioni</p>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent leading-tight">
            Tornei e Campionati
          </h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-amber-500/10 text-gray-400 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20'
            }`}
          >
            Tutte ({items.length})
          </button>
          <button
            onClick={() => setFilter('torneo')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filter === 'torneo'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-amber-500/10 text-gray-400 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Tornei ({torneiCount})
          </button>
          <button
            onClick={() => setFilter('campionato')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filter === 'campionato'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-amber-500/10 text-gray-400 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20'
            }`}
          >
            <Award className="w-4 h-4" />
            Campionati ({campionatiCount})
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <p className="text-sm text-muted-2">
              {filter === 'all' 
                ? 'Nessuna competizione imminente.' 
                : filter === 'torneo'
                ? 'Nessun torneo imminente.'
                : 'Nessun campionato imminente.'}
            </p>
          </div>
        ) : (
          filteredItems.slice(0, 6).map(t => {
            const isTorneo = t.competition_type === 'torneo' || !t.competition_type;
            
            return (
              <article 
                key={t.id} 
                className="group rounded-2xl border border-amber-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 space-y-4 hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-2 transition-all duration-300"
              >
                {/* Header with icon and type badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isTorneo ? (
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-300 group-hover:scale-110 transition-transform">
                        <Award className="w-5 h-5" />
                      </div>
                    )}
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isTorneo ? 'text-amber-300' : 'text-yellow-300'
                    }`}>
                      {isTorneo ? 'Torneo' : 'Campionato'}
                    </span>
                  </div>
                  {t.status && (
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                      t.status === 'Aperto' 
                        ? 'bg-blue-500/20 text-green-300 border border-blue-500/40'
                        : t.status === 'In corso'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                    }`}>
                      {t.status}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:text-amber-300 transition-colors">{t.title}</h3>
                </div>

                {/* Info */}
                <div className="space-y-2.5 text-sm">
                  {t.start_date && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(t.start_date).toLocaleDateString('it-IT', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                  {t.max_participants && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{t.max_participants} partecipanti</span>
                    </div>
                  )}
                  {t.format && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="capitalize">{t.format.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <Link 
                    href={`/tornei/${t.id}`} 
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 group-hover:scale-105"
                  >
                    Vedi Dettagli
                  </Link>
                </div>
              </article>
            );
          })
        )}
        </div>

        {/* View All Link */}
        {!loading && filteredItems.length > 6 && (
          <div className="mt-8 text-center">
            <Link 
              href="/tornei" 
              className="inline-flex items-center gap-2 text-[#7de3ff] hover:text-[#4fb3ff] font-semibold transition-colors"
            >
              Vedi tutte le competizioni
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
