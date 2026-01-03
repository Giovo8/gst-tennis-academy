"use client";

import Link from "next/link";

export default function TextHeroSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-7xl sm:text-8xl lg:text-9xl xl:text-[10rem] font-extrabold mb-6 text-secondary leading-tight">
            GST Academy
          </h1>
          <p className="text-base sm:text-lg mb-10 max-w-3xl mx-auto font-medium text-secondary">
            Campo professionale, maestri certificati e una comunità che ti sprona a vincere. Prenota subito e scopri perché siamo il club preferito della città.
          </p>
        </div>
      </div>
    </section>
  );
}
