"use client";

import Link from "next/link";

export default function ImageWithTextSection() {
  return (
    <section className="relative w-full h-[150px] sm:h-[200px] md:h-[250px] lg:h-[300px] xl:h-[350px] overflow-hidden" style={{ maxHeight: '350px' }}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/2.jpeg"
          alt="Tennis Club GST"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-4 text-white/90 uppercase tracking-wider">
            Benvenuto
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-6 text-white">
            La tua tennis Academy
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 text-white/90 max-w-2xl mx-auto px-4">
            Dove la passione incontra la tecnica. Impianti moderni, lezioni di qualità e tornei che contano.
          </p>
          
          {/* CTA Button */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-secondary bg-white hover:bg-white/90 transition-colors rounded-lg shadow-lg hover:shadow-xl"
          >
            Accedi
          </Link>
        </div>
      </div>
    </section>
  );
}
