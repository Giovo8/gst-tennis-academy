"use client";

import Link from "next/link";

export default function TextHeroSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-6" style={{ color: 'var(--secondary)' }}>
            Scendi in campo e gioca il<br />tuo miglior tennis
          </h1>
          <p className="text-base sm:text-lg mb-10 max-w-3xl mx-auto font-medium" style={{ color: 'var(--secondary-light)' }}>
            Campo professionale, maestri certificati e una comunità che ti sprona a vincere. Prenota subito e scopri perché siamo il club preferito della città.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/bookings"
              className="px-8 py-3.5 rounded-md text-white font-semibold text-base transition-all shadow-sm inline-block"
              style={{ backgroundColor: 'var(--secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--secondary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--secondary)')}
            >
              Prenota
            </Link>
            <Link
              href="/services"
              className="px-8 py-3.5 rounded-md font-semibold text-base transition-all inline-block"
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
              Corsi
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
