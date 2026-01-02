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
    <section className="relative bg-gray-900 overflow-hidden">
      {/* Background Image Carousel */}
      <div className="absolute inset-0">
        {images.map((image, idx) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              idx === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            {image.image_url ? (
              <>
                <img
                  src={image.image_url}
                  alt={image.alt_text}
                  className="h-full w-full object-cover"
                />
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-6xl animate-bounce">🎾</div>
                  <p className="text-base text-gray-300 font-semibold">{image.alt_text}</p>
                  <p className="text-sm text-gray-400">Superfici professionali ITF</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative">
        <div className="relative min-h-[calc(100vh-5rem)] py-12 sm:py-16 flex flex-col justify-between">
          {/* Empty hero - solo sfondo immagine */}
        </div>

        {/* Minimal Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-8 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Vai all'immagine ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

