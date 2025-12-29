"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, X, Newspaper } from "lucide-react";

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
      <section id="news" className="max-w-7xl mx-auto px-6 py-20">
        <div className="space-y-12">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent mb-3 text-center">
              Ultime News
            </p>
            <h2 className="text-5xl font-bold gradient-text mb-4">
              Novità e Aggiornamenti
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Resta aggiornato su tutte le novità e gli eventi della nostra accademia
            </p>
          </div>

        <div className="grid gap-5 md:grid-cols-3">
          {news.map((item) => (
            <article 
              key={item.id} 
              onClick={() => setSelectedNews(item)}
              className="group flex h-full flex-col rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl overflow-hidden cursor-pointer hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300"
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
              <div className="px-6 pb-6 pt-4 flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-accent-20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent border border-[var(--glass-border)]">
                    {item.category}
                  </span>
                  <p className="text-xs text-gray-400">
                  {new Date(item.published_at || item.created_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <h3 className="text-lg font-bold gradient-text">{item.title}</h3>
              <p className="text-sm leading-relaxed text-gray-300">
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={() => setSelectedNews(null)}
      >
        <div 
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-gray-900/95 to-accent-dark/30 backdrop-blur-xl p-8 shadow-2xl shadow-[var(--shadow-glow-strong)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedNews(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-accent-20 hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>

          {selectedNews.image_url && (
            <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl mb-6">
              <img
                src={selectedNews.image_url}
                alt={selectedNews.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-full bg-accent-20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent border border-[var(--glass-border)]">
              {selectedNews.category}
            </span>
            <p className="text-xs text-gray-400">
              {new Date(selectedNews.published_at || selectedNews.created_at).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <h2 className="text-3xl font-bold gradient-text mb-6">
            {selectedNews.title}
          </h2>

          {selectedNews.excerpt && (
            <p className="text-lg leading-relaxed text-white mb-6 font-medium">
              {selectedNews.excerpt}
            </p>
          )}

          <div className="prose prose-invert max-w-none">
            <p className="text-base leading-relaxed text-gray-300 whitespace-pre-wrap">
              {selectedNews.content}
            </p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

