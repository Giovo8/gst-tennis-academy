"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 bg-[#021627]">
      <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-8 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-semibold text-white mb-3">
          Registrazione Non Disponibile
        </h1>
        <p className="text-sm text-muted mb-6">
          Gli account vengono creati esclusivamente dall'amministrazione dell'Academy.
        </p>
        <p className="text-sm text-muted mb-6">
          Per richiedere un account, contatta la segreteria o un amministratore.
        </p>
        <Link 
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
        >
          Torna al Login
        </Link>
      </div>
    </main>
  );
}

