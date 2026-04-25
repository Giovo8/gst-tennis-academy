"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
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

function formatNewsDate(dateString: string | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>(defaultNews);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadNews();
  }, []);

  if (loading) {
    return (
      <section id="news" className="py-12 sm:py-16 md:py-20">
        <div className="container section">
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="news" className="py-20 sm:py-24 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
            Aggiornamenti
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Ultime news dal circolo
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Risultati, orari, novità e iscrizioni.
          </p>
        </div>

        {/* Griglia news cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {news.map((item) => {
            const relativeDate = (() => {
              const ref = item.published_at || item.created_at;
              if (!ref) return "";
              const diff = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
              if (diff === 0) return "Oggi";
              if (diff === 1) return "Ieri";
              if (diff < 7) return `${diff} giorni fa`;
              if (diff < 30) return `${Math.floor(diff / 7)} settimane fa`;
              return formatNewsDate(ref);
            })();

            return (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="flex flex-col bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              >
                {/* Badge categoria */}
                <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 bg-gray-50 text-secondary mb-5">
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </span>

                {/* Titolo */}
                <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-3 tracking-tight leading-tight group-hover:text-secondary/80 transition-colors">
                  {item.title}
                </h3>

                {/* Descrizione */}
                <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-grow">
                  {item.excerpt || `${item.content.substring(0, 120)}...`}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{relativeDate}</span>
                  <span className="text-sm font-semibold text-secondary">
                    Leggi di più
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pulsante Vedi tutte */}
        <div className="text-center">
          <Link
            href="/news"
            className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-full border border-secondary text-secondary hover:bg-secondary hover:text-white transition-all"
          >
            Leggi tutte le news
          </Link>
        </div>
      </div>
    </section>
  );
}

