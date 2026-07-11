"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  is_published: boolean;
  stato?: string | null;
  published_at?: string;
  created_at: string;
};

function isPublishedNews(item: Partial<NewsItem> | null | undefined): boolean {
  if (!item) return false;
  if (typeof item.is_published === "boolean") return item.is_published;
  return String(item.stato ?? "").toLowerCase() === "pubblicata";
}

function normalizeLegacyTitle(title: string): string {
  return title.replace(/\s*\.\.\.$/, "").trim();
}

function formatNewsDate(dateString: string | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function NewsImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="h-full w-full bg-secondary/5 flex items-center justify-center">
        <svg className="w-10 h-10 text-secondary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default function AthleteNewsCarousel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const draggedDistance = useRef(0);
  const suppressNextClick = useRef(false);

  useEffect(() => {
    void loadNews();
  }, []);

  async function loadNews() {
    const { data, error } = await supabase
      .from("news")
      .select("id, title, category, content, excerpt, image_url, is_published, stato, published_at, created_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading dashboard news:", error);
      setNews([]);
      setLoading(false);
      return;
    }

    const published = ((data as NewsItem[] | null) ?? []).filter((item) => isPublishedNews(item));
    setNews(published);
    setLoading(false);
  }

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

    // Stop drag if mouse button is no longer pressed.
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
        <p className="text-sm text-secondary/70">Nessuna news pubblicata al momento.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => stopDragging()}
        onPointerCancel={() => stopDragging()}
        onPointerLeave={() => stopDragging()}
        onDragStart={preventNativeDrag}
        className="flex gap-4 overflow-x-auto pb-2 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {news.map((item) => {
          const dateLabel = formatNewsDate(item.published_at || item.created_at);
          return (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              draggable={false}
              onDragStart={preventNativeDrag}
              onClickCapture={handleCardClickCapture}
              className="group flex-shrink-0 w-[280px] sm:w-[320px] border border-black/10 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-full aspect-[16/9] overflow-hidden bg-secondary/5">
                {item.image_url ? (
                  <NewsImage src={item.image_url} alt={normalizeLegacyTitle(item.title)} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-secondary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-sm sm:text-base font-semibold text-secondary line-clamp-2 leading-snug mb-2 group-hover:text-secondary/80 transition-colors">
                  {normalizeLegacyTitle(item.title)}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                  {item.excerpt || `${item.content.substring(0, 90)}...`}
                </p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-[11px] text-gray-400">{dateLabel}</span>
                  <span className="text-[11px] font-semibold text-secondary">
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}