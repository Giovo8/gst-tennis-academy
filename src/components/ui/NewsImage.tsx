"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Immagine di copertina di una news.
 *
 * Usa next/image: Vercel scarica l'originale da Supabase una volta sola, poi
 * serve WebP/AVIF ridimensionati dalla propria CDN. Senza questo ogni visita
 * scaricava il file pieno da Supabase Storage (egress CDN).
 *
 * Si occupa da sé del wrapper `relative`, quindi funziona dentro qualsiasi
 * contenitore con dimensioni definite (es. `aspect-[16/9]`).
 */
export default function NewsImage({
  src,
  alt,
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
        priority={priority}
        draggable={false}
        className={className}
        onError={() => setError(true)}
      />
    </div>
  );
}
