"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section id="cta" className="pt-20 sm:pt-24 md:pt-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section - Title and Buttons */}
        <div className="mb-12 sm:mb-16 text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Inizia la tua partita oggi
          </h2>
          <p className="text-base sm:text-lg mb-8 text-gray-500">
            Iscriviti subito, contattaci via mail e whatsapp
          </p>
          
          {/* Buttons */}
          <div className="flex flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href="https://wa.me/393791958651"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-md font-semibold text-sm sm:text-base transition-all hover:opacity-90 hover:-translate-y-0.5 min-h-[48px]"
              style={{ backgroundColor: 'var(--secondary)', color: 'white' }}
            >
              WhatsApp
            </a>
            <a
              href="mailto:info@gstennisacademy.it"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-md font-semibold text-sm sm:text-base transition-all hover:opacity-90 hover:-translate-y-0.5 min-h-[48px]"
              style={{ backgroundColor: 'white', color: 'var(--secondary)', border: '1px solid var(--secondary)' }}
            >
              Email
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Section - Full Width Image */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw] mt-8 sm:mt-12 md:mt-16">
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

