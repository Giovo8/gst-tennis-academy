"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

function NewsImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/5">
        <svg className="w-14 h-14 text-secondary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setError(true)}
    />
  );
}

type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  stato?: string | null;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
};

function isPublishedNews(item: Partial<NewsItem> | null | undefined): boolean {
  if (!item) return false;
  if (typeof item.is_published === "boolean") return item.is_published;
  return String(item.stato ?? "").toLowerCase() === "pubblicata";
}

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
  const formatted = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  // Capitalizza la prima lettera di ogni parola (giorno e mese)
  return formatted.replace(/\b([a-zàáèéìíòóùú])/g, (c) => c.toUpperCase());
}

function normalizeLegacyTitle(title: string): string {
  return title.replace(/\s*\.\.\.$/, "").trim();
}

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const draggedDistance = useRef(0);
  const suppressNextClick = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;

    isDragging.current = true;
    startX.current = event.clientX;
    startScrollLeft.current = el.scrollLeft;
    draggedDistance.current = 0;
    suppressNextClick.current = false;

    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || !isDragging.current) return;

    if ((event.buttons & 1) === 0) {
      stopDragging();
      return;
    }

    const deltaX = event.clientX - startX.current;
    draggedDistance.current = Math.max(draggedDistance.current, Math.abs(deltaX));
    el.scrollLeft = startScrollLeft.current - deltaX * 1.8;

    if (draggedDistance.current > 10) {
      suppressNextClick.current = true;
    }

    if (draggedDistance.current > 2) {
      event.preventDefault();
    }
  }

  function stopDragging() {
    const el = scrollRef.current;

    isDragging.current = false;
    if (draggedDistance.current <= 10) {
      suppressNextClick.current = false;
    }

    if (el) {
      el.style.cursor = "grab";
      el.style.userSelect = "auto";
    }
  }

  function handleCardClickCapture(event: React.MouseEvent<HTMLAnchorElement>) {
    if (suppressNextClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick.current = false;
    }
  }

  function preventNativeDrag(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function scrollTo(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320 + 24; // w-80 + gap-6
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);

    if (direction === "right") {
      if (el.scrollLeft + cardWidth >= maxScrollLeft - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
      return;
    }

    if (el.scrollLeft <= 4) {
      el.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
    } else {
      el.scrollBy({ left: -cardWidth, behavior: "smooth" });
    }
  }

  async function loadNews() {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error loading news:", error);
      setNews([]);
    } else if (data && data.length > 0) {
      setNews((data as NewsItem[]).filter((item) => isPublishedNews(item)));
    } else {
      setNews([]);
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
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            News
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Aggiornamenti della scuola tennis e notizie ATP/WTA dal mondo del tennis.
          </p>
        </div>

        {/* Cards */}
        {news.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-2xl bg-white">
            <p className="text-secondary/80 font-medium">Nessuna news pubblicata al momento.</p>
          </div>
        ) : (
        (() => {
          const isCarousel = news.length > 3;
          const gridClass = isCarousel
            ? "flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory mb-6 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-[calc(50vw-9rem)] sm:px-0"
            : news.length === 1
            ? "grid grid-cols-1 max-w-md mx-auto gap-6 mb-12"
            : news.length === 2
            ? "flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory mb-6 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-[calc(50vw-9rem)] sm:px-4 md:grid md:grid-cols-2 md:max-w-3xl md:mx-auto md:overflow-x-visible md:pb-0 md:snap-none md:px-0 md:mb-12"
            : "flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory mb-6 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-[calc(50vw-9rem)] sm:px-4 md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0 md:snap-none md:px-0 md:mb-12";

          const displayItems = news;
          const cards = displayItems.map((item, i) => {
            const dateLabel = (() => {
              const ref = item.published_at || item.created_at;
              return formatNewsDate(ref);
            })();

            return (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                draggable={false}
                onDragStart={preventNativeDrag}
                onClickCapture={handleCardClickCapture}
                className={`flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer${isCarousel ? " flex-shrink-0 w-72 sm:w-80 snap-center" : news.length >= 2 ? " flex-shrink-0 w-72 sm:w-80 snap-center md:w-full" : ""}`}
              >
                {/* Immagine */}
                <div className="w-full aspect-[16/9] overflow-hidden">
                  {item.image_url ? (
                    <NewsImage src={item.image_url} alt={normalizeLegacyTitle(item.title)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                      <svg
                        className="w-14 h-14 text-secondary/20"
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

                <div className="flex flex-col flex-grow p-7">

                {/* Titolo */}
                <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-3 tracking-tight leading-tight group-hover:text-secondary/80 transition-colors">
                  {normalizeLegacyTitle(item.title)}
                </h3>

                {/* Descrizione */}
                <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-grow">
                  {item.excerpt || `${item.content.substring(0, 120)}...`}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-gray-200">
                  <span className="text-xs text-gray-400">{dateLabel}</span>
                  <span className="text-xs font-semibold text-secondary">
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </span>
                </div>
                </div>
              </Link>
            );
          });

          return isCarousel ? (
            <div
              ref={scrollRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => stopDragging()}
              onPointerCancel={() => stopDragging()}
              onPointerLeave={() => stopDragging()}
              onDragStart={preventNativeDrag}
              className={gridClass}
            >
              {cards}
            </div>
          ) : news.length >= 2 ? (
            <div
              ref={scrollRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => stopDragging()}
              onPointerCancel={() => stopDragging()}
              onPointerLeave={() => stopDragging()}
              onDragStart={preventNativeDrag}
              className={gridClass}
            >
              {cards}
            </div>
          ) : (
            <div className={gridClass}>{cards}</div>
          );
        })()
        )}

        {/* Nav buttons — carosello e mobile scroll */}
        {news.length >= 2 && (
          <div className={`flex justify-center gap-2 mb-8${news.length <= 3 ? " md:hidden" : ""}`}>
            <button
              onClick={() => scrollTo("left")}
              aria-label="Scorri a sinistra"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary/80 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollTo("right")}
              aria-label="Scorri a destra"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary/80 transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Pulsante Vedi tutte */}
        <div className="text-center mt-2">
          <Link
            href="/news"
            className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3.5 sm:py-3 text-sm font-medium text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all"
          >
            Leggi tutte le news
          </Link>
        </div>
      </div>
    </section>
  );
}

