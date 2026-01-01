"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy, Award, Target } from "lucide-react";

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  start_date?: string;
  max_participants?: number;
  tournament_type?: TournamentType;
  status?: string;
};

export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | TournamentType>('all');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/tournaments?upcoming=true");
        const json = await res.json();
        if (res.ok) {
          if (mounted) {
            setItems(json.tournaments ?? []);
          }
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
    : items.filter(item => item.tournament_type === filter);

  const eliminazioneCount = items.filter(t => t.tournament_type === 'eliminazione_diretta').length;
  const gironeCount = items.filter(t => t.tournament_type === 'girone_eliminazione').length;
  const campionatoCount = items.filter(t => t.tournament_type === 'campionato').length;

  const getTournamentTypeLabel = (type?: TournamentType) => {
    switch(type) {
      case 'eliminazione_diretta': return 'Eliminazione Diretta';
      case 'girone_eliminazione': return 'Girone + Eliminazione';
      case 'campionato': return 'Campionato';
      default: return 'Torneo';
    }
  };

  const getTournamentTypeIcon = (type?: TournamentType) => {
    switch(type) {
      case 'eliminazione_diretta': return Trophy;
      case 'girone_eliminazione': return Target;
      case 'campionato': return Award;
      default: return Trophy;
    }
  };

  return (
    <section id="tornei" className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-16 md:py-20">
      <div className="space-y-10 sm:space-y-12">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold text-accent mb-4">Competizioni</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-4">
            Tornei e Campionati
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Partecipa alle nostre competizioni e metti alla prova le tue abilità
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-start sm:justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              filter === 'all'
                ? 'accent-gradient text-text-dark shadow-lg shadow-accent-strong/30'
                : 'bg-white/5 text-gray-300 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 backdrop-blur-xl'
            }`}
          >
            Tutti ({items.length})
          </button>
          <button
            onClick={() => setFilter('eliminazione_diretta')}
            className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              filter === 'eliminazione_diretta'
                ? 'accent-gradient text-text-dark shadow-lg shadow-accent-strong/30'
                : 'bg-white/5 text-gray-300 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 backdrop-blur-xl'
            }`}
          >
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
            Eliminazione ({eliminazioneCount})
          </button>
          <button
            onClick={() => setFilter('girone_eliminazione')}
            className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              filter === 'girone_eliminazione'
                ? 'accent-gradient text-text-dark shadow-lg shadow-accent-strong/30'
                : 'bg-white/5 text-gray-300 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 backdrop-blur-xl'
            }`}
          >
            <Target className="w-3 h-3 sm:w-4 sm:h-4" />
            Gironi ({gironeCount})
          </button>
          <button
            onClick={() => setFilter('campionato')}
            className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              filter === 'campionato'
                ? 'accent-gradient text-text-dark shadow-lg shadow-accent-strong/30'
                : 'bg-white/5 text-gray-300 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 backdrop-blur-xl'
            }`}
          >
            <Award className="w-3 h-3 sm:w-4 sm:h-4" />
            Campionati ({campionatoCount})
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <p className="text-sm text-muted-2">
              {filter === 'all' 
                ? 'Nessun torneo imminente.' 
                : `Nessun torneo di tipo "${getTournamentTypeLabel(filter as TournamentType)}" imminente.`}
            </p>
          </div>
        ) : (
          filteredItems.slice(0, 6).map(t => {
            const Icon = getTournamentTypeIcon(t.tournament_type);
            const typeLabel = getTournamentTypeLabel(t.tournament_type);
            
            return (
              <article 
                key={t.id} 
                className="group flex h-full flex-col rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl overflow-hidden hover:border-white/40 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 sm:pt-4 flex flex-col gap-2.5 sm:gap-3 flex-1">
                  {/* Header with icon and type badge */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500/20 border-2 border-cyan-400/40 text-cyan-300 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="rounded-full bg-cyan-500/20 border-2 border-cyan-400/40 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-cyan-300">
                        {typeLabel}
                      </span>
                    </div>
                    {t.status && (
                      <span className={`text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-bold ${
                        t.status === 'Aperto' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : t.status === 'In Corso'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                      }`}>
                        {t.status}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold gradient-text">{t.title}</h3>

                  {/* Info */}
                  <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                    {t.start_date && (
                      <div className="flex items-center gap-2 sm:gap-3 text-gray-300">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(t.start_date).toLocaleDateString('it-IT', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric'
                        })}</span>
                      </div>
                    )}
                    {t.max_participants && (
                      <div className="flex items-center gap-2 sm:gap-3 text-gray-300">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{t.max_participants} partecipanti</span>
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="pt-1.5 sm:pt-2 mt-auto">
                    <Link 
                      href={`/tornei/${t.id}`} 
                      className="block w-full text-center rounded-lg sm:rounded-xl accent-gradient px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-text-dark hover:shadow-lg hover:shadow-accent-strong/30 transition-all duration-300 group-hover:scale-105"
                    >
                      Vedi Dettagli
                    </Link>
                  </div>
                </div>
              </article>
            );
          })
        )}
        </div>

        {/* View All Link */}
        {!loading && filteredItems.length > 6 && (
          <div className="mt-6 sm:mt-8 text-center">
            <Link 
              href="/tornei" 
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#7de3ff] hover:text-[#4fb3ff] font-semibold transition-colors"
            >
              Vedi tutte le competizioni
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
