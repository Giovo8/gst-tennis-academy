"use client";

import AnnouncementsBoard from "@/components/announcements/AnnouncementsBoard";
import { Megaphone } from "lucide-react";

export default function AtletaAnnunciPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Annunci
          </h1>
          <p className="text-sm text-gray-600">
            Rimani aggiornato su eventi, tornei e novità dell'accademia
          </p>
        </div>
      </div>
      
      <AnnouncementsBoard />
    </div>
  );
}
