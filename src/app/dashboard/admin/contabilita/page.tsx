"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Wallet, GraduationCap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import PeriodSelector, { type Period } from "@/components/contabilita/PeriodSelector";
import RevenueKpiCards from "@/components/contabilita/RevenueKpiCards";
import CampiRevenueChart from "@/components/contabilita/CampiRevenueChart";
import CourseRevenueChart from "@/components/contabilita/CourseRevenueChart";
import RevenueByTypeChart from "@/components/contabilita/RevenueByTypeChart";
import RevenueByCourtChart from "@/components/contabilita/RevenueByCourtChart";
import CourseCollectionGauge from "@/components/contabilita/CourseCollectionGauge";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface CourtAgg {
  court: string;
  amount: number;
  hours: number;
  bookings: number;
}

interface CourseAgg {
  courseId: string;
  name: string;
  quota: number;
  incassato: number;
  iscritti: number;
}

interface RevenuePoint {
  label: string;
  campi: number;
  corsiQuota: number;
  corsiIncassato: number;
}

interface ContabilitaData {
  period: Period;
  totals: { campi: number; corsiQuota: number; corsiIncassato: number; totale: number };
  counts: { bookings: number; iscritti: number };
  timeseries: RevenuePoint[];
  byCourt: CourtAgg[];
  byCourse: CourseAgg[];
  byType: Record<string, number>;
}

export default function ContabilitaPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<ContabilitaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourt, setExpandedCourt] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats/contabilita?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Errore nel caricamento dei dati");
      }
      const json = (await res.json()) as ContabilitaData;
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento dei dati");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">Contabilità</p>
        <h1 className="text-4xl font-bold text-secondary">Contabilità</h1>
      </div>

      {/* Selettore periodo */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-72 bg-gray-200 rounded-lg" />
          <div className="h-72 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ) : !data ? (
        <div className="text-center py-20 rounded-lg bg-white border border-black/10">
          <AlertCircle className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Dati non disponibili</h3>
          <p className="text-secondary/60">Riprova più tardi.</p>
        </div>
      ) : (
        <>
          <RevenueKpiCards totals={data.totals} counts={data.counts} />

          {/* Grafico andamento ricavi campi */}
          <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Andamento ricavi campi</h2>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <CampiRevenueChart data={data.timeseries} />
            </div>
          </div>

          {/* Grafico andamento entrate corsi */}
          <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Andamento entrate corsi</h2>
              <p className="text-xs text-secondary/50 mt-0.5">
                La gestione dei corsi è ancora in sviluppo: questi numeri sono indicativi.
              </p>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <CourseRevenueChart data={data.timeseries} />
            </div>
          </div>

          {/* Grafici di dettaglio */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Ricavi campi per tipo</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <RevenueByTypeChart byType={data.byType} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Ricavi per campo</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <RevenueByCourtChart data={data.byCourt} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Incasso corsi</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <CourseCollectionGauge quota={data.totals.corsiQuota} incassato={data.totals.corsiIncassato} />
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Per campo */}
            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent flex items-center gap-2">
                <Wallet className="h-4 w-4 text-secondary" />
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Ricavi per campo</h2>
              </div>
              {data.byCourt.length === 0 ? (
                <div className="px-6 py-10 text-center text-secondary/60">
                  Nessun ricavo campi nel periodo.
                </div>
              ) : (
                <ul className="divide-y divide-black/5">
                  {data.byCourt.map((c) => {
                    const open = expandedCourt === c.court;
                    return (
                      <li key={c.court}>
                        <button
                          type="button"
                          onClick={() => setExpandedCourt(open ? null : c.court)}
                          className="w-full flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2 font-medium text-secondary">
                            <ChevronDown
                              className={`h-4 w-4 text-secondary/40 transition-transform ${open ? "rotate-180" : ""}`}
                            />
                            {c.court}
                          </span>
                          <span className="font-semibold text-secondary tabular-nums">
                            {formatCurrency(c.amount)}
                          </span>
                        </button>
                        {open && (
                          <div className="px-6 pb-4 pt-0 text-sm text-secondary/70 grid grid-cols-2 gap-2">
                            <span>Ore prenotate</span>
                            <span className="text-right tabular-nums">{c.hours} h</span>
                            <span>Prenotazioni</span>
                            <span className="text-right tabular-nums">{c.bookings}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Per corso */}
            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-secondary" />
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Ricavi per corso</h2>
              </div>
              {data.byCourse.length === 0 ? (
                <div className="px-6 py-10 text-center text-secondary/60">
                  Nessun ricavo corsi nel periodo.
                </div>
              ) : (
                <ul className="divide-y divide-black/5">
                  {data.byCourse.map((c) => {
                    const open = expandedCourse === c.courseId;
                    return (
                      <li key={c.courseId}>
                        <button
                          type="button"
                          onClick={() => setExpandedCourse(open ? null : c.courseId)}
                          className="w-full flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2 font-medium text-secondary min-w-0">
                            <ChevronDown
                              className={`h-4 w-4 flex-shrink-0 text-secondary/40 transition-transform ${open ? "rotate-180" : ""}`}
                            />
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="font-semibold text-secondary tabular-nums flex-shrink-0">
                            {formatCurrency(c.quota)}
                          </span>
                        </button>
                        {open && (
                          <div className="px-6 pb-4 pt-0 text-sm text-secondary/70 grid grid-cols-2 gap-2">
                            <span>Quota attesa</span>
                            <span className="text-right tabular-nums">{formatCurrency(c.quota)}</span>
                            <span>Incassato</span>
                            <span className="text-right tabular-nums">{formatCurrency(c.incassato)}</span>
                            <span>Iscritti</span>
                            <span className="text-right tabular-nums">{c.iscritti}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <Link
        href="/dashboard/admin/contabilita/listino-prezzi"
        className="w-full flex items-center justify-center h-11 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Cambia Prezzi
      </Link>
    </div>
  );
}
