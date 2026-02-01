"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function ServicesSection() {
  return (
    <section className="bg-white py-12 sm:py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary">
            SERVIZI
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
            L'eccellenza del tennis firmata GST Academy
          </h2>
          <p className="text-xs sm:text-base md:text-lg max-w-3xl mx-auto text-secondary opacity-80 px-2">
            Un ecosistema completo dedicato alla tua crescita sportiva. Dalle strutture all'avanguardia alla formazione tecnica: tutto ciò che serve per vivere il tennis da protagonista.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Service 1 */}
          <div className="text-center px-4">
            <div className="flex justify-center mb-3 sm:mb-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-secondary" strokeWidth={1.5} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="4" x2="12" y2="20" strokeLinecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" strokeDasharray="1 2" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-secondary">
              Affitto Campi
            </h3>
            <p className="text-sm sm:text-base text-secondary opacity-80">
              Campi in terra rossa e cemento sempre disponibili. Superfici performanti e curate per garantirti il miglior rimbalzo possibile
            </p>
          </div>

          {/* Service 2 */}
          <div className="text-center px-4">
            <div className="flex justify-center mb-3 sm:mb-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-secondary" strokeWidth={1.5} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v5m-3 0h6M7 11h10M7 11c-1.5 0-3-1.69-3-3.5S5.5 4 7 4h.5M7 11v6a1 1 0 001 1h8a1 1 0 001-1v-6m-9.5-7C7.5 5.31 7 6.82 7 7.5 7 9.31 8.5 11 10 11M17 11h-.5M17 11c1.5 0 3-1.69 3-3.5S18.5 4 17 4h-.5M16.5 4C16.5 5.31 17 6.82 17 7.5c0 1.81-1.5 3.5-3 3.5" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-secondary">
              Tornei e Sfide
            </h3>
            <p className="text-sm sm:text-base text-secondary opacity-80">
              Partecipa ai nostri tornei e campionati a squadre. Un calendario ricco di eventi per chi ama l'agonismo e vuole sfidare nuovi avversari.
            </p>
          </div>

          {/* Service 3 */}
          <div className="text-center px-4">
            <div className="flex justify-center mb-3 sm:mb-4">
              <GraduationCap className="w-12 h-12 sm:w-16 sm:h-16 text-secondary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-secondary">
              Coaching e Scuola Tennis
            </h3>
            <p className="text-sm sm:text-base text-secondary opacity-80">
              Lezioni private personalizzate e corsi di gruppo per tutte le età. Migliora il tuo gioco affidandoti all'esperienza dei nostri istruttori qualificati FITP
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
