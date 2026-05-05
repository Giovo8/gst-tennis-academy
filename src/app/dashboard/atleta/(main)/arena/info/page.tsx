"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InfoPage() {
  const pathname = usePathname();
  const dashboardBase = pathname.split("/arena")[0];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href={`${dashboardBase}/arena`} className="hover:text-secondary/80 transition-colors">Arena</Link>
        {" › "}
        <span>Info</span>
      </p>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-secondary">Info Arena</h1>
      </div>

      {/* Content */}
      <div className="space-y-6">
          {/* Regole Generali */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Regole Generali</h2>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <span className="text-sm text-secondary/80">Le sfide devono essere confermate dall&apos;avversario</span>
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

          {/* Sistema di Punteggio */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Sistema di Punteggio</h2>
            </div>
            <div className="px-6 py-6 space-y-4">

              {/* Best-of-1 */}
              <div>
                <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-2">Set singolo</p>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-secondary">Risultato</th>
                        <th className="px-4 py-2 text-center font-semibold text-secondary">Vincitore</th>
                        <th className="px-4 py-2 text-center font-semibold text-secondary/60">Perdente</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-2 font-medium text-secondary">1 – 0</td>
                        <td className="px-4 py-2 text-center font-bold text-secondary">+30 pt</td>
                        <td className="px-4 py-2 text-center text-secondary/60">+0 pt</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Best-of-3 */}
              <div>
                <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-2">Al meglio dei 3 set</p>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-secondary">Risultato</th>
                        <th className="px-4 py-2 text-center font-semibold text-secondary">Vincitore</th>
                        <th className="px-4 py-2 text-center font-semibold text-secondary/60">Perdente</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-2 font-medium text-secondary">2 – 0</td>
                        <td className="px-4 py-2 text-center font-bold text-secondary">+30 pt</td>
                        <td className="px-4 py-2 text-center text-secondary/60">+0 pt</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-secondary">2 – 1</td>
                        <td className="px-4 py-2 text-center font-bold text-secondary">+20 pt</td>
                        <td className="px-4 py-2 text-center text-secondary/60">+10 pt</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Best-of-5 */}
              <div>
                <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-2">Al meglio dei 5 set</p>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-secondary">Risultato</th>
                        <th className="px-4 py-2 text-center font-semibold text-secondary">Vincitore</th>
                        <th className="px-4 py-2 text-center font-semibold text-secondary/60">Perdente</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-2 font-medium text-secondary">3 – 0</td>
                        <td className="px-4 py-2 text-center font-bold text-secondary">+30 pt</td>
                        <td className="px-4 py-2 text-center text-secondary/60">+0 pt</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-secondary">3 – 1</td>
                        <td className="px-4 py-2 text-center font-bold text-secondary">+25 pt</td>
                        <td className="px-4 py-2 text-center text-secondary/60">+5 pt</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-secondary">3 – 2</td>
                        <td className="px-4 py-2 text-center font-bold text-secondary">+20 pt</td>
                        <td className="px-4 py-2 text-center text-secondary/60">+10 pt</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-secondary/60">
                I punti vengono assegnati automaticamente al termine di ogni sfida classificata.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
}
