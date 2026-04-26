"use client";

import AdminNewsBoard from "@/components/news/AdminNewsBoard";
import PublicNavbar from "@/components/layout/PublicNavbar";

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-8 sm:mb-12 flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
              News
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
              Aggiornamenti dall&apos;Academy
            </h1>
            <p className="text-base sm:text-lg max-w-2xl text-gray-500">
              Tutte le novità, gli eventi e le storie dal nostro circolo tennis.
            </p>
          </div>
          <AdminNewsBoard />
        </div>
      </main>
    </div>
  );
}


