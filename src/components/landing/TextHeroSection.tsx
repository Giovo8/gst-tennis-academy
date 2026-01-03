"use client";

import Link from "next/link";

export default function TextHeroSection() {
  return (
    <section className="bg-white pt-4 sm:pt-6 md:pt-8 pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] font-extrabold mb-4 sm:mb-6 text-secondary leading-tight whitespace-nowrap">
            GST Academy
          </h1>
          <p className="text-sm sm:text-base md:text-lg mb-0 sm:mb-8 md:mb-10 max-w-3xl mx-auto font-medium text-secondary px-2">
            Campo professionale, maestri certificati e una comunità che ti sprona a vincere. Prenota subito e scopri perché siamo il club preferito della città.
          </p>
        </div>
      </div>
    </section>
  );
}
