"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section id="cta" className="pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Top Section - Title and Buttons */}
        <div className="text-center">
          <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Inizia la tua partita oggi
          </h2>
          <p className="text-base sm:text-lg mb-8 text-gray-500">
            Iscriviti subito, contattaci via mail e whatsapp
          </p>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href="https://wa.me/393791958651"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all font-medium whitespace-nowrap"
            >
              WhatsApp
            </a>
            <a
              href="mailto:info@gstennisacademy.it"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 text-white bg-[#023047] rounded-lg shadow-sm hover:bg-[#023047]/90 transition-all font-medium whitespace-nowrap"
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

