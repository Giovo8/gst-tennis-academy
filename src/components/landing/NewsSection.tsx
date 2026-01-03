"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
};

const defaultNews: NewsItem[] = [
  {
    id: "default-1",
    title: "Campionato invernale, i vincitori della settimana",
    category: "Risultati",
    content: "Rossi e Bianchi dominano il torneo singolare. Gallo e Moretti vincono il doppio misto.",
    excerpt: "Rossi e Bianchi dominano il torneo singolare. Gallo e Moretti vincono il doppio misto.",
    image_url: null,
    is_published: true,
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "default-2",
    title: "Nuovi orari estivi a partire da lunedì",
    category: "Orari",
    content: "I campi saranno aperti dalle sei del mattino fino alle ventitré di sera. Prenotazioni online.",
    excerpt: "I campi saranno aperti dalle sei del mattino fino alle ventitré di sera. Prenotazioni online.",
    image_url: null,
    is_published: true,
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "default-3",
    title: "Iscrizioni aperte per i corsi estivi per bambini",
    category: "Lezioni",
    content: "Tre livelli disponibili. Lezioni due volte a settimana con maestri certificati FITP.",
    excerpt: "Tre livelli disponibili. Lezioni due volte a settimana con maestri certificati FITP.",
    image_url: null,
    is_published: true,
    published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "Oggi";
  if (diffInDays === 1) return "1 giorno fa";
  if (diffInDays < 7) return `${diffInDays} giorni fa`;
  if (diffInDays < 14) return "1 settimana fa";
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} settimane fa`;
  if (diffInDays < 60) return "1 mese fa";
  return `${Math.floor(diffInDays / 30)} mesi fa`;
}

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>(defaultNews);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error loading news:", error);
      setNews(defaultNews);
    } else if (data && data.length > 0) {
      setNews(data);
    } else {
      setNews(defaultNews);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <section id="news" className="py-20">
        <div className="container section">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="news" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--secondary)' }}>
            News
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--secondary)' }}>
            Storie dal club
          </h2>
          <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--foreground)' }}>
            Leggi gli ultimi aggiornamenti, i risultati delle competizioni e gli avvisi importanti.
          </p>
        </div>

        {/* News Grid */}
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {news.map((item) => (
            <article key={item.id} className="flex flex-col">
              {/* Image */}
              <div className="mb-4">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--background-muted)' }}>
                    <svg className="w-16 h-16" fill="none" stroke="var(--foreground-muted)" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Category & Date */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                  {item.category}
                </span>
                <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                  {getRelativeTime(item.published_at || item.created_at)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--secondary)' }}>
                {item.title}
              </h3>

              {/* Excerpt */}
              <p className="text-base mb-4 flex-grow" style={{ color: 'var(--foreground)' }}>
                {item.excerpt || item.content.substring(0, 120) + '...'}
              </p>

              {/* Read More Link */}
              <Link
                href={`/news/${item.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              >
                Leggi
                <ArrowRight className="w-4 h-4" />
              </Link>
            </article>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link
            href="/news"
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

