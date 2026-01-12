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
  const [activeCategory, setActiveCategory] = useState<string>("tutte");

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

  const categories = Array.from(new Set(news.map((item) => item.category))).filter(
    (cat) => !!cat
  );

  const filteredNews = news.filter((item) =>
    activeCategory === "tutte" ? true : item.category === activeCategory
  );

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
    <section id="news" className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary">
            News
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
            Storie dal club
          </h2>
          <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto px-2 text-secondary opacity-80">
            Leggi gli ultimi aggiornamenti, i risultati delle competizioni e gli avvisi importanti.
          </p>
        </div>

        {/* Filtri categoria */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pb-3 sm:pb-4 mb-6 sm:mb-8 text-center">
          <button
            onClick={() => setActiveCategory("tutte")}
            className={`text-sm px-3 py-1.5 rounded-sm transition-colors ${
              activeCategory === "tutte"
                ? "bg-secondary text-white"
                : "text-secondary/70 hover:text-secondary"
            }`}
          >
            Tutte
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-sm px-3 py-1.5 rounded-sm transition-colors ${
                activeCategory === category
                  ? "bg-secondary text-white"
                  : "text-secondary/70 hover:text-secondary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Griglia news cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {filteredNews.map((item) => {
            return (
              <article
                key={item.id}
                className="flex flex-col group"
              >
                {/* Immagine / placeholder */}
                <div className="w-full aspect-[4/3] mb-4 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                      <svg
                        className="w-16 h-16 sm:w-20 sm:h-20 text-secondary/20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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

                {/* Meta info */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-secondary">
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </span>
                </div>

                {/* Titolo */}
                <h3 className="text-lg sm:text-xl font-bold text-secondary mb-2 group-hover:opacity-80 transition-opacity">
                  {item.title}
                </h3>

                {/* Descrizione */}
                <p className="text-sm text-secondary/70 mb-4 line-clamp-2 flex-grow">
                  {item.excerpt || `${item.content.substring(0, 120)}...`}
                </p>

                {/* Link "Read more" */}
                <Link
                  href={`/news/${item.id}`}
                  className="inline-flex items-center text-sm font-semibold text-secondary hover:opacity-70 transition-opacity group/link"
                >
                  Leggi tutto
                  <svg 
                    className="w-4 h-4 ml-1 transition-transform group-hover/link:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </Link>
              </article>
            );
          })}
        </div>

        {/* Pulsante "Vedi tutte" */}
        <div className="text-center">
          <Link
            href="/news"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-sm bg-secondary text-white hover:opacity-90 transition-colors"
          >
            Vedi tutte le news
          </Link>
        </div>
      </div>
    </section>
  );
}

