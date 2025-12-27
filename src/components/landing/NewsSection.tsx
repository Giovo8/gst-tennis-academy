"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  image_url: string | null;
};

const defaultNews: NewsItem[] = [
  {
    id: "default-1",
    title: "Clinic con coach ATP",
    date: new Date("2026-01-18").toISOString(),
    category: "Clinic Pro",
    summary: "Sessione speciale di footwork e anticipo con live tracking e video review individuale.",
    image_url: null,
  },
  {
    id: "default-2",
    title: "Torneo U14 - Winter Series",
    date: new Date("2026-02-25").toISOString(),
    category: "Tornei FITP",
    summary: "Tabelloni maschili e femminili, live scoring e supporto tattico per ogni match.",
    image_url: null,
  },
  {
    id: "default-3",
    title: "Nuovo campo indoor in resina",
    date: new Date("2026-03-01").toISOString(),
    category: "Struttura",
    summary: "Superficie omologata ITF, illuminazione pro e sistema di sensori per rilevare velocità di palla.",
    image_url: null,
  },
];

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
      .eq("published", true)
      .order("date", { ascending: false })
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
      <section id="news" className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </section>
    );
  }

  return (
    <section id="news" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            News
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Ultimi aggiornamenti dalla Academy
          </h2>
        </div>
        <span className="hidden text-sm font-semibold text-accent sm:inline">
          Aggiornato settimanalmente
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {news.map((item) => (
          <article key={item.id} className="flex h-full flex-col gap-3 rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 overflow-hidden">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="px-5 pb-5 pt-3 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-accent-15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {item.category}
                </span>
                <p className="text-xs text-muted-2">
                  {new Date(item.date).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted">
                {item.summary}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

