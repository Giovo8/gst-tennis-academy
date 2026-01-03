"use client";

import Link from "next/link";
import { Tent, Network, GraduationCap } from "lucide-react";

export default function ServicesSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--secondary)' }}>
            Servizi
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--secondary)' }}>
            Tutto quello che serve per giocare bene
          </h2>
          <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--foreground)' }}>
            Tre modi per vivere il tennis al massimo livello. Scegli quello che fa per te e inizia oggi stesso.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Service 1 */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Tent className="w-16 h-16" strokeWidth={1.5} style={{ color: 'var(--secondary)' }} />
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--secondary)' }}>
              Affitto campi professionali
            </h3>
            <p className="text-base" style={{ color: 'var(--foreground)' }}>
              Terra rossa e sintetico per ogni stile di gioco.
            </p>
          </div>

          {/* Service 2 */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Network className="w-16 h-16" strokeWidth={1.5} style={{ color: 'var(--secondary)' }} />
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--secondary)' }}>
              Lezioni private con maestri certificati
            </h3>
            <p className="text-base" style={{ color: 'var(--foreground)' }}>
              Migliora il tuo gioco con professionisti qualificati FIT e PTR.
            </p>
          </div>

          {/* Service 3 */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <GraduationCap className="w-16 h-16" strokeWidth={1.5} style={{ color: 'var(--secondary)' }} />
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--secondary)' }}>
              Scuola tennis per tutti
            </h3>
            <p className="text-base" style={{ color: 'var(--foreground)' }}>
              Corsi per bambini, ragazzi e adulti con programmi personalizzati.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/services"
            className="px-8 py-3 rounded-md font-semibold text-base transition-all inline-block"
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
            Esplora
          </Link>
          <Link
            href="/services"
            className="px-8 py-3 rounded-md font-semibold text-base transition-all inline-block flex items-center gap-2"
            style={{ color: 'var(--secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
          >
            Altro
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
