"use client";

import type { ReactNode } from "react";

export interface KpiCard {
  title: string;
  value: string;
  icon: ReactNode;
  hint: string;
}

interface KpiCardsRowProps {
  cards: KpiCard[];
}

/**
 * Riga di KPI in stile card admin (bianca, palette secondary), riutilizzata in piu' punti
 * della pagina Statistiche. Stesso pattern visivo di RevenueKpiCards in Contabilita.
 */
export default function KpiCardsRow({ cards }: KpiCardsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-lg border border-black/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-secondary/60">
              {card.title}
            </p>
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              {card.icon}
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-secondary leading-tight tabular-nums">
            {card.value}
          </p>
          <p className="mt-1 text-xs text-secondary/50">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
