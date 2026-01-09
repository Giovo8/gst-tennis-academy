"use client";

import React from "react";
import Link from "next/link";
import TournamentReports from "@/components/tournaments/TournamentReports";

export default function ReportPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
        <Link
          href="/dashboard/admin/tornei"
          className="hover:text-secondary/80 transition-colors"
        >
          Gestione Competizioni
        </Link>
        <span className="mx-2">›</span>
        <span className="text-secondary">Report</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Report e Statistiche
          </h1>
          <p className="text-secondary/70 text-sm md:text-base">
            Visualizza statistiche dettagliate dei tornei e dei giocatori.
          </p>
        </div>
      </div>

      {/* Reports Content */}
      <div className="bg-white rounded-xl p-6">
        <TournamentReports />
      </div>
    </div>
  );
}
