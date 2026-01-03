"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section id="cta" className="pt-12 sm:pt-16 md:pt-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section - Title and Buttons */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
            Inizia la tua partita oggi
          </h2>
          <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 px-2" style={{color: 'var(--secondary)', opacity: 0.8}}>
            Scarica l'app, prenota i campi e accedi alla comunità di tennisti più appassionati della città
          </p>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-md font-semibold text-sm sm:text-base transition-all hover:opacity-90 min-h-[48px] flex items-center justify-center touch-manipulation"
              style={{
                backgroundColor: 'var(--secondary)',
                color: 'white'
              }}
            >
              Scarica
            </Link>
            <Link
              href="/bookings"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-md font-semibold text-sm sm:text-base transition-all hover:opacity-90 min-h-[48px] flex items-center justify-center touch-manipulation"
              style={{
                backgroundColor: 'var(--secondary)',
                color: 'white'
              }}
            >
              Prova gratis
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section - Full Width Image */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw] mt-8 sm:mt-12">
        <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[700px] relative overflow-hidden">
          <img
            src="/images/3.jpeg"
            alt="Campo da tennis GST Tennis Academy"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

