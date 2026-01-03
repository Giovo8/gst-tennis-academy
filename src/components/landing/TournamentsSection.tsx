"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  max_participants?: number;
  tournament_type?: TournamentType;
  status?: string;
};

const defaultTournaments: Tournament[] = [
  {
    id: "1",
    title: "Torneo Sociale di Primavera 2026",
    description: "Torneo open maschile e femminile. Formula a eliminazione diretta con tabelloni separati. Iscrizioni aperte fino al 20 marzo.",
    start_date: "2026-04-05",
    tournament_type: "eliminazione_diretta",
    status: "upcoming"
  },
  {
    id: "2",
    title: "Campionato Invernale a Squadre",
    description: "Competizione a squadre con formula girone all'italiana. Incontri ogni sabato pomeriggio. Aperto a giocatori di tutti i livelli.",
    start_date: "2026-02-15",
    tournament_type: "girone_eliminazione",
    status: "upcoming"
  }
];

export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>(defaultTournaments);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/tournaments?upcoming=true");
        const json = await res.json();
        if (res.ok && json.tournaments && json.tournaments.length > 0) {
          // Filtra tornei validi (con titolo non numerico e descrizione presente)
          const validTournaments = json.tournaments.filter((t: Tournament) => 
            t.title && 
            t.title.length > 10 && 
            !/^\d+$/.test(t.title) && // Escludi titoli che sono solo numeri
            t.description && 
            t.description.length > 20
          );
          
          if (mounted) {
            setItems(validTournaments.length > 0 ? validTournaments : defaultTournaments);
          }
        } else {
          if (mounted) {
            setItems(defaultTournaments);
          }
        }
      } catch (err) {
        if (mounted) {
          setItems(defaultTournaments);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const getTournamentTypeLabel = (type?: TournamentType) => {
    switch(type) {
      case 'eliminazione_diretta': return 'Torneo';
      case 'girone_eliminazione': return 'Lega';
      case 'campionato': return 'Torneo';
      default: return 'Torneo';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Data da definire";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <section id="tornei" className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary">
            COMPETIZIONI
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
            Tornei e Campionati
          </h2>
          <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto text-secondary opacity-80 px-2">
            Un calendario ricco di eventi per ogni livello di gioco. Iscriviti ai nostri tornei, sfida i tuoi limiti e dimostra il tuo valore punto su punto
          </p>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-8 sm:mb-12">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <p className="text-sm text-secondary">
              Nessun torneo imminente.
            </p>
          </div>
        ) : (
          items.slice(0, 2).map(t => {
            const typeLabel = getTournamentTypeLabel(t.tournament_type);
            
            return (
              <article key={t.id} className="flex flex-col">
                {/* Image */}
                <div className="relative h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden mb-3 sm:mb-4" style={{backgroundColor: 'var(--secondary)'}}>
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 opacity-30" fill="none" stroke="white" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1 sm:gap-2">
                  {/* Category & Date */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm font-semibold" style={{color: 'var(--secondary)'}}>
                      {typeLabel.toLowerCase()}
                    </span>
                    <span className="text-xs sm:text-sm" style={{color: 'var(--secondary)', opacity: 0.6}}>
                      {formatDate(t.start_date)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold" style={{color: 'var(--secondary)'}}>
                    {t.title}
                  </h3>

                  {/* Description */}
                  {t.description && (
                    <p className="text-sm sm:text-base" style={{color: 'var(--secondary)', opacity: 0.8}}>
                      {t.description}
                    </p>
                  )}

                  {/* Read More Link */}
                  <Link 
                    href={`/tornei/${t.id}`} 
                    className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold transition-colors mt-1 hover:opacity-70"
                    style={{color: 'var(--secondary)'}}
                  >
                    Leggi
                  </Link>
                </div>
              </article>
            );
          })
        )}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link
            href="/tornei"
            className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 rounded-md font-semibold text-sm sm:text-base transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'white'
            }}
          >
            Vedi tutto
          </Link>
        </div>
      </div>
    </section>
  );
}
