"use client";

export default function ImageWithTextSection() {
  return (
    <section
      className="relative w-full h-[320px] sm:h-[240px] md:h-[280px] lg:h-[340px] xl:h-[380px] overflow-hidden !py-0"
      style={{
        backgroundImage: "url('/images/581138917_1464130575720115_7536612966509061819_n.jpg')",
        backgroundPosition: "center 55%",
        backgroundSize: "cover",
      }}
    >
      {/* Directional overlay: dark left, fades right */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(3,72,99,.55)" }}
      />

      {/* Content — centered */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 text-center flex flex-col items-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-white">
            Benvenuto
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold mb-4 text-white leading-[1.05] tracking-tight">
            La tua tennis Academy
          </h2>
          <p className="text-base sm:text-lg text-white max-w-xl">
            Dove la passione incontra la tecnica. Impianti moderni, lezioni di qualità e tornei che contano.
          </p>
        </div>
      </div>
    </section>
  );
}
