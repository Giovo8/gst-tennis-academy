"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section id="cta" className="pt-16 sm:pt-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section - Title and Buttons */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--secondary)' }}>
            Inizia la tua partita oggi
          </h2>
          <p className="text-base sm:text-lg mb-8" style={{ color: 'var(--foreground)' }}>
            Scarica l'app, prenota i campi e accedi alla comunità di tennisti più appassionati della città
          </p>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 rounded-md font-semibold text-base transition-all text-white"
              style={{ backgroundColor: 'var(--secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--secondary)';
              }}
            >
              Scarica
            </Link>
            <Link
              href="/bookings"
              className="px-8 py-3 rounded-md font-semibold text-base transition-all"
              style={{ 
                backgroundColor: 'white', 
                color: 'var(--secondary)',
                border: '2px solid var(--secondary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--secondary)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = 'var(--secondary)';
              }}
            >
              Prova gratis
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section - Full Width Image */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw] mt-12">
        <div className="w-full h-[500px] sm:h-[600px] md:h-[700px] relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2070&auto=format&fit=crop"
            alt="Tennis court"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

