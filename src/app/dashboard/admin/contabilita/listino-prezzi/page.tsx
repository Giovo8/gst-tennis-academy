"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import PriceListPanel from "@/components/contabilita/PriceListPanel";
import NightThresholdPanel from "@/components/contabilita/NightThresholdPanel";

export default function ListinoPrezziPage() {
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/contabilita" className="hover:text-secondary/80 transition-colors">
            Contabilità
          </Link>
          {" › "}
          <span>Listino prezzi</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Listino prezzi</h1>
      </div>

      <NightThresholdPanel />

      <button
        type="button"
        onClick={() => setShowNewForm((v) => !v)}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        Nuovo prezzo
      </button>

      <PriceListPanel showNewForm={showNewForm} onCloseNewForm={() => setShowNewForm(false)} />
    </div>
  );
}
