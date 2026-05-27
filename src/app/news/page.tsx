"use client";

import AdminNewsBoard from "@/components/news/AdminNewsBoard";
import PublicNavbar from "@/components/layout/PublicNavbar";

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto bg-white">
        <PublicNavbar />
        <main>
        <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-28">
          <div className="text-center mb-14 sm:mb-16 flex flex-col items-center">
            <h1 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
              News
            </h1>
            <p className="text-base sm:text-lg max-w-2xl text-gray-500">
              Risultati, orari, novità e iscrizioni.
            </p>
          </div>
          <AdminNewsBoard />
        </div>
        </main>
      </div>
    </div>
  );
}


