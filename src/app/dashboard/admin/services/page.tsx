"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import Link from "next/link";

export default function ServicesPage() {
  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Servizi</h1>
          <Link href="/dashboard/admin/services/new" className="rounded-full px-4 py-2 bg-[#7de3ff]/20 text-[#7de3ff]">Nuovo servizio</Link>
        </div>

        <p className="mt-2 text-sm text-[#c6d8c9]">Elenco servizi disponibili (bozza).</p>

        <div className="mt-6 space-y-3">
          <div className="rounded-lg border border-white/10 p-4">
            <h3 className="font-semibold text-white">Lezione privata</h3>
            <p className="text-sm text-[#9fb6a6]">Durata: 1h · Prezzo: €40</p>
            <div className="mt-3 flex gap-2">
              <Link href="#" className="text-sm text-[#7de3ff]">Modifica</Link>
              <button className="text-sm text-cyan-300">Elimina</button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
