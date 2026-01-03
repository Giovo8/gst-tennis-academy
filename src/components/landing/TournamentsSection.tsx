"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

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
    title: "Campionato invernale singolare",
    description: "Categoria open per giocatori di tutti i livelli. Iscrizioni aperte fino al 10 febbraio.",
    start_date: "2026-02-15",
    tournament_type: "campionato",
    status: "upcoming"
  },
  {
    id: "2",
    title: "Lega sociale doppio misto",
    description: "Gioca in squadra e conosci altri appassionati. Turni settimanali con cena sociale.",
    start_date: "2026-02-23",
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
          if (mounted) {
            setItems(json.tournaments);
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
    <section id="tornei" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--secondary)' }}>
            Competizione
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--secondary)' }}>
            Tornei
          </h2>
          <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--secondary)' }}>
            Mettiti alla prova nei nostri tornei e leghe sociali. Vinci premi e costruisci la tua reputazione.
          </p>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-12">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <p className="text-sm" style={{ color: 'var(--secondary)' }}>
              Nessun torneo imminente.
            </p>
          </div>
        ) : (
          items.slice(0, 2).map(t => {
            const typeLabel = getTournamentTypeLabel(t.tournament_type);
            
            return (
              <article key={t.id} className="flex flex-col">
                {/* Image */}
                <div className="relative h-64 rounded-lg overflow-hidden mb-4" style={{ backgroundColor: 'var(--background-muted)' }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16" fill="none" stroke="var(--foreground-muted)" viewBox="0 0 24 24">
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
                <div className="flex flex-col gap-2">
                  {/* Category & Date */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                      {typeLabel.toLowerCase()}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      {formatDate(t.start_date)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>
                    {t.title}
                  </h3>

                  {/* Description */}
                  {t.description && (
                    <p className="text-base" style={{ color: 'var(--secondary)' }}>
                      {t.description}
                    </p>
                  )}

                  {/* Read More Link */}
                  <Link 
                    href={`/tornei/${t.id}`} 
                    className="inline-flex items-center gap-2 text-base font-semibold transition-colors mt-1"
                    style={{ color: 'var(--primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
                  >
                    Leggi
                    <ArrowRight className="w-4 h-4" />
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
            className="inline-block px-8 py-3 rounded-md font-semibold text-base transition-all"
            style={{ 
              backgroundColor: 'white', 
              color: 'var(--secondary)',
              border: '2px solid var(--secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--secondary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = 'var(--secondary)';
            }}
          >
            Vedi tutto
          </Link>
        </div>
      </div>
    </section>
  );
}
