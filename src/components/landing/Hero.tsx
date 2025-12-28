"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HeroImage = {
  id: string;
  image_url: string;
  alt_text: string;
  order_index: number;
  active: boolean;
};

type HeroContent = {
  badge_text: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  stat1_value: string;
  stat1_label: string;
  stat2_value: string;
  stat2_label: string;
  stat3_value: string;
  stat3_label: string;
};

const defaultContent: HeroContent = {
  badge_text: "Cresci nel tuo tennis",
  title: "Allenamento di alto livello, metodo scientifico e una community che spinge al massimo.",
  title_highlight: "metodo scientifico",
  subtitle: "Programmi personalizzati per junior, agonisti e adulti. Video analysis, preparazione atletica, match play e coaching mentale curati da maestri certificati FITP.",
  stat1_value: "250+",
  stat1_label: "Atleti attivi",
  stat2_value: "180",
  stat2_label: "Tornei vinti",
  stat3_value: "8",
  stat3_label: "Campi disponibili",
};

const defaultImages: HeroImage[] = [
  { id: "1", image_url: "", alt_text: "Campo da tennis professionale", order_index: 0, active: true },
  { id: "2", image_url: "", alt_text: "Sessione di allenamento", order_index: 1, active: true },
  { id: "3", image_url: "", alt_text: "Giocatori in azione", order_index: 2, active: true },
  { id: "4", image_url: "", alt_text: "Struttura moderna", order_index: 3, active: true },
];

export default function Hero() {
  const [images, setImages] = useState<HeroImage[]>(defaultImages);
  const [content, setContent] = useState<HeroContent>(defaultContent);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadImages();
    loadContent();
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  async function loadImages() {
    try {
      const { data, error } = await supabase
        .from("hero_images")
        .select("*")
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setImages(data);
      }
    } catch (error) {
      // Use default images on error
    }
  }

  async function loadContent() {
    try {
      const response = await fetch("/api/hero-content");
      if (response.ok) {
        const data = await response.json();
        setContent(data);
      }
    } catch (error) {
      // Use default content on error
    }
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--accent-mid)]/5 via-transparent to-[var(--accent-strong)]/5 backdrop-blur-xl px-6 py-12 sm:px-10 sm:py-16 shadow-2xl shadow-[var(--accent-strong)]/10">
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute left-16 top-10 h-40 w-40 rounded-full blur-3xl bg-[var(--accent-strong)]/20 animate-pulse" />
      <div className="pointer-events-none absolute right-12 bottom-10 h-32 w-32 rounded-full blur-3xl bg-[var(--accent-strong)]/15 animate-pulse" style={{animationDelay: '1s'}} />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full blur-3xl bg-[var(--accent-mid)]/10" />

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-[var(--glass-border)] bg-accent-15 backdrop-blur-xl px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-accent w-fit shadow-lg shadow-accent-strong/10 hover:shadow-accent-strong/20 transition-all duration-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-strong opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-mid"></span>
            </span>
            {content.badge_text}
          </div>
          <div className="space-y-6 flex-1">
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
              <span className="text-white">{content.title.split(content.title_highlight)[0]}</span>
              <span className="gradient-text">{content.title_highlight}</span>
              <span className="text-white">{content.title.split(content.title_highlight)[1]}</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-gray-300">
              {content.subtitle}
            </p>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-4">
            {[
              { value: content.stat1_value, label: content.stat1_label },
              { value: content.stat2_value, label: content.stat2_label },
              { value: content.stat3_value, label: content.stat3_label },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl px-4 py-4 text-center hover:border-[var(--glass-border)] hover:border-opacity-70 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent-mid/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                  <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel immagini */}
        <div className="relative group flex items-stretch">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-3 w-full shadow-2xl shadow-[var(--shadow-glow)] hover:shadow-[var(--shadow-glow-strong)] transition-all duration-500">
            <div className="relative h-full min-h-[500px] overflow-hidden rounded-2xl">
              {images.map((image, idx) => (
                <div
                  key={image.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    idx === currentIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={image.alt_text}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-dark)] via-accent-dark/30 to-[var(--bg-dark)] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="text-6xl animate-bounce">🎾</div>
                        <p className="text-base text-gray-300 font-semibold">{image.alt_text}</p>
                        <p className="text-sm text-gray-400">Superfici professionali ITF</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Controlli carousel */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 backdrop-blur-sm p-3 text-white opacity-0 transition-all hover:bg-black/80 group-hover:opacity-100 hover:scale-110 border border-white/10"
                aria-label="Immagine precedente"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 backdrop-blur-sm p-3 text-white opacity-0 transition-all hover:bg-black/80 group-hover:opacity-100 hover:scale-110 border border-white/10"
                aria-label="Immagine successiva"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Indicatori carousel */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-2 border border-white/10">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? "w-8 bg-gradient-to-r from-accent-mid to-accent-strong" : "w-2 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Vai all'immagine ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

