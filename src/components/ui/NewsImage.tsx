"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Immagine di copertina di una news.
 *
 * Usa next/image con `unoptimized`: le immagini arrivano da Supabase Storage
 * già ottimizzate all'upload (WebP, max 1280px, quality 80 — vedi
 * `src/lib/images/optimize.ts`), quindi la trasformazione a runtime di Vercel
 * ricomprimerebbe materiale già compresso. Con il piano free quelle
 * trasformazioni sono limitate a 5.000/mese e un crawler che percorre
 * l'archivio news le esaurisce in un giorno, facendo poi fallire il rendering
 * di ogni nuova immagine.
 *
 * Restano di next/image il lazy loading e la stabilità di layout con `fill`.
 *
 * Si occupa da sé del wrapper `relative`, quindi funziona dentro qualsiasi
 * contenitore con dimensioni definite (es. `aspect-[16/9]`).
 */
const LOCAL_FALLBACK_IMAGES = ["/images/1.jpeg", "/images/2.jpeg", "/images/3.jpeg"];

function pickLocalFallback(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return LOCAL_FALLBACK_IMAGES[hash % LOCAL_FALLBACK_IMAGES.length];
}

export default function NewsImage({
  src,
  alt,
  /** Ignorato finché l'immagine è `unoptimized`: tenuto per un eventuale rientro. */
  sizes = "(max-width: 640px) 320px, 400px",
  className = "object-cover transition-transform duration-300 group-hover:scale-105",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  /** Da attivare solo per immagini above-the-fold (es. hero della news). */
  priority?: boolean;
}) {
  const [error, setError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Le news AI linkano l'immagine direttamente sul sito della fonte: se il link
  // si rompe o è bloccato si ripiega su un'immagine locale.
  if (error && !fallbackError) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={pickLocalFallback(src)}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          draggable={false}
          className={className}
          onError={() => setFallbackError(true)}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full bg-secondary/5 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-secondary/20"
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
    );
  }

  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        priority={priority}
        draggable={false}
        className={className}
        // Molti siti bloccano l'hotlink in base al Referer: senza Referer l'immagine passa.
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    </div>
  );
}
