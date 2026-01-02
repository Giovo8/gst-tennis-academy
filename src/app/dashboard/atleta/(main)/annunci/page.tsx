"use client";

import AnnouncementsBoard from "@/components/announcements/AnnouncementsBoard";
import { Megaphone } from "lucide-react";

export default function AtletaAnnunciPage() {
  return (
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2">
            Annunci
          </h1>
          <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>
            Rimani aggiornato su eventi, tornei e novità dell'accademia
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg shadow-lg">
          <Megaphone className="h-5 w-5" />
          <span className="text-sm font-semibold">Bacheca Attiva</span>
        </div>
      </div>
      
      <AnnouncementsBoard />
    </div>
  );
}
