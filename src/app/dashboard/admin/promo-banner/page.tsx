"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import PromoBannerSettings from "@/components/dashboard/PromoBannerSettings";

export default function PromoBannerManagementPage() {
  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="min-h-screen bg-gradient-to-br from-[#021627] via-[#031a35] to-[#021627] text-white">
        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 py-6 sm:py-10">
          {/* Back Button */}
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Torna alla Dashboard Admin</span>
          </Link>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-200 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Banner Promozionale
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-400">
              Configura il banner mostrato agli utenti non autenticati nella homepage
            </p>
          </div>

          {/* Settings Component */}
          <PromoBannerSettings />

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-blue-300">ℹ️ Informazioni</h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Il banner viene mostrato solo agli utenti non autenticati</li>
              <li>• Gli utenti possono chiudere il banner, che rimarrà nascosto per 7 giorni</li>
              <li>• Puoi scegliere tra 4 temi di colore: Blu, Verde, Viola e Rosso</li>
              <li>• Il messaggio supporta emoji per renderlo più accattivante</li>
            </ul>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
