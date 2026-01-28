"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16 sm:h-20">
            <img src="/images/logo-tennis.png" alt="GST Tennis Academy" className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-4">
            Link Non Valido
          </h1>

          <p className="text-secondary/70 mb-8">
            Il link di conferma email non è valido o è scaduto.
            Questo può accadere se il link è già stato utilizzato o se è passato troppo tempo dalla registrazione.
          </p>

          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-secondary text-white font-semibold rounded-md text-base hover:opacity-90 transition-all"
            >
              Vai al Login
            </Link>

            <p className="text-sm text-secondary/60">
              Se hai problemi ad accedere, contatta la segreteria
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
