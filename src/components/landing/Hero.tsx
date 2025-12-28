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
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-hero-gradient px-6 py-12 sm:px-10 sm:py-16">
      <div className="pointer-events-none absolute left-16 top-10 h-32 w-32 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(125,227,255,0.18)' }} />
      <div className="pointer-events-none absolute right-12 bottom-10 h-20 w-20 rounded-full blur-2xl" style={{ backgroundColor: 'rgba(79,179,255,0.12)' }} />

      <div className="relative grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent w-fit">
            {content.badge_text}
          </div>
          <div className="space-y-5 flex-1">
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {content.title.split(content.title_highlight)[0]}
              <span className="text-accent">{content.title_highlight}</span>
              {content.title.split(content.title_highlight)[1]}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
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
                className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 px-4 py-3 text-center"
              >
                  <div className="text-2xl font-semibold text-accent">{stat.value}</div>
                  <p className="text-sm text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel immagini */}
        <div className="relative group flex items-stretch">
          <div className="relative overflow-hidden rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-2 w-full">
            <div className="relative h-full min-h-[500px] overflow-hidden rounded-2xl">
              {images.map((image, idx) => (
                <div
                  key={image.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
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
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a3d5c] via-[#2f7de1]/20 to-[#1a3d5c] flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl">🎾</div>
                        <p className="text-sm text-muted">{image.alt_text}</p>
                        <p className="text-xs text-muted-2">Superfici professionali ITF</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Controlli carousel */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                aria-label="Immagine precedente"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                aria-label="Immagine successiva"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Indicatori carousel */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? "w-8 bg-accent" : "w-1.5 bg-white/30"
                    }`}
                    aria-label={`Vai all'immagine ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

