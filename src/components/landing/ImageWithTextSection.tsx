"use client";

import Link from "next/link";

export default function ImageWithTextSection() {
  return (
    <section className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/2.jpeg"
          alt="Tennis Club GST"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm sm:text-base font-semibold mb-4 text-white/90 uppercase tracking-wider">
            Benvenuto
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white">
            La tua tennis Academy
          </h2>
          <p className="text-lg sm:text-xl mb-10 text-white/90 max-w-2xl mx-auto">
            Dove la passione incontra la tecnica. Impianti moderni, lezioni di qualità e tornei che contano.
          </p>
        </div>
      </div>
    </section>
  );
}
