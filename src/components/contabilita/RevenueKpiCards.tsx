"use client";

import { Wallet, CircleDollarSign, GraduationCap, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface Totals {
  campi: number;
  corsiQuota: number;
  corsiIncassato: number;
  totale: number;
}

interface Counts {
  bookings: number;
  iscritti: number;
}

interface RevenueKpiCardsProps {
  totals: Totals;
  counts: Counts;
}

interface KpiCard {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint: string;
}

/**
 * Riga di KPI contabilità in stile card admin (sfondo chiaro, palette secondary).
 * Nota: si usa il pattern card bianca admin invece di StatCard (pensato per sfondo scuro).
 */
export default function RevenueKpiCards({ totals, counts }: RevenueKpiCardsProps) {
  const cards: KpiCard[] = [
    {
      title: "Ricavo totale",
      value: formatCurrency(totals.totale),
      icon: <TrendingUp className="h-5 w-5" />,
      hint: "Campi + quota corsi",
    },
    {
      title: "Ricavi campi",
      value: formatCurrency(totals.campi),
      icon: <Wallet className="h-5 w-5" />,
      hint: `${counts.bookings} prenotazioni`,
    },
    {
      title: "Quota corsi",
      value: formatCurrency(totals.corsiQuota),
      icon: <GraduationCap className="h-5 w-5" />,
      hint: `${counts.iscritti} iscrizioni · attesa`,
    },
    {
      title: "Incassato corsi",
      value: formatCurrency(totals.corsiIncassato),
      icon: <CircleDollarSign className="h-5 w-5" />,
      hint: "Pagamenti registrati",
    },
  ];

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
