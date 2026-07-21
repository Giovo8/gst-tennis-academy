"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Avatar utente servito tramite next/image.
 *
 * Gli avatar compaiono in liste lunghe (chat, classifiche, partecipanti): senza
 * ottimizzazione ogni riga scaricava il file originale da Supabase Storage.
 * Qui viene richiesto solo il ritaglio alla dimensione effettiva di rendering.
 *
 * Se `src` manca o il caricamento fallisce mostra l'iniziale del nome.
 */
export default function Avatar({
  src,
  name,
  size = 40,
  className,
  fill = false,
}: {
  src?: string | null;
  name?: string | null;
  /** Lato in px del riquadro. Ignorato con `fill`. */
  size?: number;
  className?: string;
  /** Riempie il contenitore (che deve essere `relative`) invece di usare `size`. */
  fill?: boolean;
}) {
  const [error, setError] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "U";

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gray-300 font-semibold text-gray-700",
          fill && "absolute inset-0 h-full w-full",
          className
        )}
        style={fill ? undefined : { width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={name || "Avatar"}
        fill
        sizes="96px"
        className={cn("object-cover", className)}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={name || "Avatar"}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn("rounded-full object-cover", className)}
      onError={() => setError(true)}
    />
  );
}
