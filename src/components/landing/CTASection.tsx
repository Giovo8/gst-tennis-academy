"use client";

import Link from "next/link";
import Reveal from "@/components/landing/Reveal";

export default function CTASection() {
  return (
    <section id="cta" className="pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Top Section - Title and Buttons */}
        <div className="text-center">
          <Reveal>
            <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
              Scendi in campo con noi
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 text-gray-500">
              Contattaci su WhatsApp o via email e prenota la tua prima lezione
            </p>
          </Reveal>

          {/* Buttons */}
          <Reveal delay={0.15} className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}

