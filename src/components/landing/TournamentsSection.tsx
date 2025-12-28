"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy, Award } from "lucide-react";

type CompetitionType = 'torneo' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  starts_at?: string;
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
    <section id="tornei">
      <div className="section-header">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2">Competizioni</p>
        <h2 className="text-2xl font-semibold text-white">Tornei e Campionati</h2>
      </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 md:gap-3 mb-4 md:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-[#7de3ff]/20 text-[#7de3ff] border border-[#7de3ff]/50'
                : 'bg-[#1a3d5c]/40 text-muted-2 border border-[#2f7de1]/20 hover:border-[#2f7de1]/40'
            }`}
          >
            Tutte ({items.length})
          </button>
          <button
            onClick={() => setFilter('torneo')}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === 'torneo'
                ? 'bg-[#7de3ff]/20 text-[#7de3ff] border border-[#7de3ff]/50'
                : 'bg-[#1a3d5c]/40 text-muted-2 border border-[#2f7de1]/20 hover:border-[#2f7de1]/40'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Tornei ({torneiCount})
          </button>
          <button
            onClick={() => setFilter('campionato')}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === 'campionato'
                ? 'bg-[#7de3ff]/20 text-[#7de3ff] border border-[#7de3ff]/50'
                : 'bg-[#1a3d5c]/40 text-muted-2 border border-[#2f7de1]/20 hover:border-[#2f7de1]/40'
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
                className="rounded-xl md:rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4 md:p-6 space-y-3 md:space-y-4 hover:border-[#7de3ff]/40 hover:bg-[#1a3d5c]/80 transition-all"
              >
                {/* Header with icon and type badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isTorneo ? (
                      <Trophy className="w-4 h-4 md:w-5 md:h-5 text-[#7de3ff]" />
                    ) : (
                      <Award className="w-4 h-4 md:w-5 md:h-5 text-[#4fb3ff]" />
                    )}
                    <span className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider ${
                      isTorneo ? 'text-[#7de3ff]' : 'text-[#4fb3ff]'
                    }`}>
                      {isTorneo ? 'Torneo' : 'Campionato'}
                    </span>
                  </div>
                  {t.status && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'Aperto' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : t.status === 'In corso'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                    }`}>
                      {t.status}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white line-clamp-2">{t.title}</h3>
                </div>

                {/* Info */}
                <div className="space-y-2 text-xs md:text-sm">
                  {t.starts_at && (
                    <div className="flex items-center gap-2 text-muted-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(t.starts_at).toLocaleDateString('it-IT', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                  {t.max_participants && (
                    <div className="flex items-center gap-2 text-muted-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{t.max_participants} partecipanti</span>
                    </div>
                  )}
                  {t.format && (
                    <div className="flex items-center gap-2 text-muted-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="capitalize">{t.format.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="pt-1 md:pt-2">
                  <Link 
                    href={`/tornei/${t.id}`} 
                    className="block w-full text-center rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-[#06101f] hover:shadow-accent transition-all"
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
