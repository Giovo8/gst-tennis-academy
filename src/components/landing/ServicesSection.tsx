"use client";

export default function ServicesSection() {
  return (
    <section className="bg-white py-20 sm:py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
            Cosa offriamo
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Diversi modi per vivere il tennis
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Dalla prenotazione di un campo per una partita tra amici, fino al percorso completo di scuola tennis.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Service 1 */}
          <article className="group flex flex-col bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-secondary tracking-tight leading-tight">
              Affitto Campi
            </h3>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Campi in terra rossa e sintetico, prenotabili online 24/7 con conferma immediata.
            </p>
          </article>

          {/* Service 2 */}
          <article className="group flex flex-col bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-secondary tracking-tight leading-tight">
              Tornei e Sfide
            </h3>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Tornei sociali, campionati interni e classifiche live nella nostra Arena.
            </p>
          </article>

          {/* Service 3 */}
          <article className="group flex flex-col bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-secondary tracking-tight leading-tight">
              Coaching e Scuola Tennis
            </h3>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Lezioni private e corsi di gruppo per ogni età e livello, con maestri certificati FITP.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
