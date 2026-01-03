"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type HeroImage = {
  id: string;
  image_url: string;
  alt_text: string;
  order_index: number;
  active: boolean;
};

export default function ImageWithTextSection() {
  const [image, setImage] = useState<HeroImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, []);

  async function loadImage() {
    try {
      const response = await fetch("/api/hero-images");
      const data = await response.json();
      // Get second active image if available
      if (Array.isArray(data) && data.length > 1) {
        setImage(data[1]);
      } else if (Array.isArray(data) && data.length > 0) {
        setImage(data[0]);
      }
    } catch (error) {
      console.error("Error loading hero image:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        {image && image.image_url ? (
          <img
            src={image.image_url}
            alt={image.alt_text || "Tennis Club"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Placeholder Background */
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--secondary)' }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <svg 
                className="w-48 h-48" 
                fill="none" 
                stroke="white" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
          </div>
        )}
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm sm:text-base font-semibold mb-4 text-white/90 uppercase tracking-wider">
            Benvenuto
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white">
            Il tuo club di tennis
          </h2>
          <p className="text-lg sm:text-xl mb-10 text-white/90 max-w-2xl mx-auto">
            Dove la passione incontra la tecnica. Impianti moderni, lezioni di qualità e tornei che contano.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/bookings"
              className="px-8 py-3.5 rounded-md bg-white font-semibold text-base transition-all shadow-lg inline-block"
              style={{ color: 'var(--secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-subtle)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              Prenota
            </Link>
            <Link
              href="/services"
              className="px-8 py-3.5 rounded-md text-white font-semibold text-base transition-all inline-block border-2 border-white hover:bg-white/10"
            >
              Scopri
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
