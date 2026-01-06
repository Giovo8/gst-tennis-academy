"use client";

import AdminNewsBoard from "@/components/news/AdminNewsBoard";
import PublicNavbar from "@/components/layout/PublicNavbar";

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary">
              News
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
              Aggiornamenti dall&apos;Academy
            </h1>
            <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto text-secondary opacity-80">
              Tutte le novità, gli eventi e le storie dal nostro circolo tennis.
            </p>
          </div>
          <AdminNewsBoard />
        </div>
      </main>
    </div>
  );
}


