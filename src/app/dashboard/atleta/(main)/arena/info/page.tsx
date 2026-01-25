"use client";

import {
  Target,
  Trophy,
  Swords,
  Shield,
  Check,
  X as XIcon,
} from "lucide-react";
import Link from "next/link";

export default function InfoPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href="/dashboard/atleta/arena" className="hover:text-secondary/80 transition-colors">Arena</Link>
        {" › "}
        <span>Info</span>
      </p>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary">Info Arena</h1>
        <p className="text-secondary/70 text-sm mt-1">
          Scopri le regole e il sistema di punteggio
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg">
        <div className="space-y-6">
          {/* Sistema di Punteggio */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-secondary" />
              Sistema di Punteggio (Tennis)
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <span className="font-bold text-green-700">Vittoria:</span>
                  <span className="text-green-600 ml-2">+50 punti</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                <XIcon className="h-5 w-5 text-red-600" />
                <div>
                  <span className="font-bold text-red-700">Sconfitta:</span>
                  <span className="text-red-600 ml-2">-20 punti (minimo 0)</span>
                </div>
              </div>
              <p className="text-xs text-secondary/60 mt-3">
                Nel tennis non esistono pareggi - ogni partita deve avere un vincitore
              </p>
            </div>
          </div>

          {/* Livelli */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Livelli
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                <p className="font-bold text-orange-700">Bronzo</p>
                <p className="text-xs text-orange-600">0-799 punti</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                <p className="font-bold text-gray-700">Argento</p>
                <p className="text-xs text-gray-600">800-1499 punti</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                <p className="font-bold text-amber-700">Oro</p>
                <p className="text-xs text-amber-600">1500-1999 punti</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                <p className="font-bold text-purple-700">Platino</p>
                <p className="text-xs text-purple-600">2000-2499 punti</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="font-bold text-blue-700">Diamante</p>
                <p className="text-xs text-blue-600">2500+ punti</p>
              </div>
            </div>
          </div>

          {/* Tipi di Sfida */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Swords className="h-5 w-5 text-secondary" />
              Tipi di Sfida
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-secondary/5 rounded-lg border-l-4 border-secondary">
                <p className="font-bold text-secondary">Sfida Diretta</p>
                <p className="text-sm text-secondary/70">Sfida un giocatore specifico 1 contro 1</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="font-bold text-blue-700">Sfida di Coppia</p>
                <p className="text-sm text-blue-600">Forma una coppia e sfida un'altra coppia 2 contro 2</p>
              </div>
            </div>
          </div>

          {/* Regole */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-secondary" />
              Regole Generali
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <span className="text-sm text-secondary/80">Le sfide devono essere confermate dall'avversario</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <span className="text-sm text-secondary/80">Ogni sfida richiede la prenotazione di un campo</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <span className="text-sm text-secondary/80">Il risultato deve essere inserito entro 24 ore dalla sfida</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                <span className="text-sm text-secondary/80">In caso di controversie, contattare lo staff</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
