"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, X, Newspaper, ChevronLeft, ChevronRight } from "lucide-react";

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
    title: "Clinic con coach ATP",
    category: "eventi",
    content: "Siamo entusiasti di annunciare una clinic esclusiva con un coach ATP professionista. Durante questa sessione speciale, i partecipanti avranno l'opportunità di lavorare su footwork avanzato e tecniche di anticipo. Ogni sessione include live tracking dei movimenti e video review personalizzata per massimizzare il miglioramento tecnico.",
    excerpt: "Sessione speciale di footwork e anticipo con live tracking e video review individuale.",
    image_url: null,
    is_published: true,
    published_at: new Date("2026-01-18").toISOString(),
    created_at: new Date("2026-01-18").toISOString(),
    updated_at: new Date("2026-01-18").toISOString(),
  },
  {
    id: "default-2",
    title: "Torneo U14 - Winter Series",
    category: "tornei",
    content: "Il nostro torneo Winter Series U14 è pronto ad accogliere giovani talenti. Con tabelloni sia maschili che femminili, ogni partecipante avrà l'opportunità di competere al massimo livello con live scoring professionale. Il nostro staff tecnico fornirà supporto tattico durante i match per aiutare i giovani atleti a crescere.",
    excerpt: "Tabelloni maschili e femminili, live scoring e supporto tattico per ogni match.",
    image_url: null,
    is_published: true,
    published_at: new Date("2026-02-25").toISOString(),
    created_at: new Date("2026-02-25").toISOString(),
    updated_at: new Date("2026-02-25").toISOString(),
  },
  {
    id: "default-3",
    title: "Nuovo campo indoor in resina",
    category: "generale",
    content: "Abbiamo inaugurato il nostro nuovo campo indoor con superficie in resina omologata ITF. La struttura dispone di illuminazione professionale e un avanzato sistema di sensori che rileva la velocità della palla in tempo reale, offrendo un'esperienza di gioco all'avanguardia.",
    excerpt: "Superficie omologata ITF, illuminazione pro e sistema di sensori per rilevare velocità di palla.",
    image_url: null,
    is_published: true,
    published_at: new Date("2026-03-01").toISOString(),
    created_at: new Date("2026-03-01").toISOString(),
    updated_at: new Date("2026-03-01").toISOString(),
  },
];

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>(defaultNews);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

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
      // Usa le news di default se c'è un errore (es. tabella non esiste ancora)
      setNews(defaultNews);
    } else if (data && data.length > 0) {
      setNews(data);
    } else {
      // Se non ci sono news nel database, usa quelle di default
      setNews(defaultNews);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <section id="news" className="py-20">
        <div className="container section">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="news" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="space-y-8 sm:space-y-12">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold text-accent mb-3 sm:mb-4 text-center">
              Ultime News
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-4">
              Novità e Aggiornamenti
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Resta aggiornato su tutte le novità e gli eventi della nostra accademia
            </p>
          </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <article 
              key={item.id} 
              onClick={() => setSelectedNews(item)}
              className="group flex h-full flex-col rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl overflow-hidden cursor-pointer hover:border-white/40 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300"
            >
              {item.image_url && (
                <div className="w-full aspect-[16/9] overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 sm:pt-4 flex flex-col gap-2 sm:gap-3 flex-1">
                <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
                  <span className="rounded-full bg-cyan-500/20 border-2 border-cyan-400/40 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-cyan-300">
                    {item.category}
                  </span>
                  <p className="text-xs sm:text-sm text-gray-400">
                  {new Date(item.published_at || item.created_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <h3 className="text-base sm:text-lg font-bold gradient-text">{item.title}</h3>
              <p className="text-sm sm:text-base leading-relaxed text-gray-300">
                {item.excerpt || item.content.substring(0, 150) + '...'}
              </p>
            </div>
          </article>
        ))}
        </div>
        </div>
      </section>

    {/* News Modal */}
    {selectedNews && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-safe pb-safe px-safe"
        onClick={() => setSelectedNews(null)}
      >
        {/* Close Button - Outside */}
        <button
          onClick={() => setSelectedNews(null)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-8 md:right-8 rounded-full bg-white/10 p-2 sm:p-3 text-white transition hover:bg-red-500 hover:scale-110 backdrop-blur-sm border border-white/20 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Chiudi"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Navigation Buttons - Outside Card */}
        {news.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = news.findIndex(n => n.id === selectedNews.id);
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : news.length - 1;
                setSelectedNews(news[prevIndex]);
              }}
              className="absolute left-1 sm:left-2 md:left-4 rounded-full bg-white/10 p-2 sm:p-3 text-white transition hover:bg-accent hover:scale-110 backdrop-blur-sm border border-white/20"
              aria-label="News precedente"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = news.findIndex(n => n.id === selectedNews.id);
                const nextIndex = currentIndex < news.length - 1 ? currentIndex + 1 : 0;
                setSelectedNews(news[nextIndex]);
              }}
              className="absolute right-1 sm:right-2 md:right-4 rounded-full bg-white/10 p-2 sm:p-3 text-white transition hover:bg-accent hover:scale-110 backdrop-blur-sm border border-white/20"
              aria-label="News successiva"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        <div 
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-gray-900/95 to-accent-dark/30 backdrop-blur-xl p-5 sm:p-6 md:p-8 shadow-2xl shadow-[var(--shadow-glow-strong)]"
          onClick={(e) => e.stopPropagation()}
        >

          {selectedNews.image_url && (
            <div className="w-full aspect-[16/9] overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
              <img
                src={selectedNews.image_url}
                alt={selectedNews.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
            <span className="rounded-full bg-accent-20 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-accent border border-[var(--glass-border)]">
              {selectedNews.category}
            </span>
            <p className="text-[10px] sm:text-xs text-gray-400">
              {new Date(selectedNews.published_at || selectedNews.created_at).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-4 sm:mb-6">
            {selectedNews.title}
          </h2>

          {selectedNews.excerpt && (
            <p className="text-base sm:text-lg leading-relaxed text-white mb-4 sm:mb-6 font-medium">
              {selectedNews.excerpt}
            </p>
          )}

          <div className="prose prose-invert max-w-none">
            <p className="text-sm sm:text-base leading-relaxed text-gray-300 whitespace-pre-wrap">
              {selectedNews.content}
            </p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

