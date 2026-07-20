"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  CalendarClock,
  Clock,
  UserPlus,
  GraduationCap,
  Trophy,
  Swords,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import PeriodSelector, { type Period } from "@/components/contabilita/PeriodSelector";
import KpiCardsRow from "@/components/statistiche/KpiCardsRow";
import BookingsTrendChart from "@/components/statistiche/BookingsTrendChart";
import NewUsersTrendChart from "@/components/statistiche/NewUsersTrendChart";
import UsersByRoleChart from "@/components/statistiche/UsersByRoleChart";
import BookingsByTypeChart from "@/components/statistiche/BookingsByTypeChart";
import BookingsByCourtChart from "@/components/statistiche/BookingsByCourtChart";
import CourseEnrollmentsChart from "@/components/statistiche/CourseEnrollmentsChart";

interface TimeseriesPoint {
  label: string;
  campo: number;
  lezione: number;
  arena: number;
  nuoviUtenti: number;
}

interface CourtAgg {
  court: string;
  bookings: number;
  hours: number;
}

interface CourseAgg {
  courseId: string;
  name: string;
  iscritti: number;
}

interface StatisticheData {
  period: Period;
  totals: {
    users: number;
    newUsers: number;
    bookings: number;
    bookedHours: number;
    activeCourses: number;
    iscrittiCorsi: number;
  };
  usersByRole: Record<string, number>;
  timeseries: TimeseriesPoint[];
  byCourt: CourtAgg[];
  byType: Record<string, number>;
  byCourse: CourseAgg[];
  tornei: {
    total: number;
    active: number;
    completed: number;
    upcoming: number;
    participants: number;
  };
  arena: {
    total: number;
    completed: number;
    activePlayers: number;
  };
}

export default function StatistichePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<StatisticheData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats/statistiche?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Errore nel caricamento delle statistiche");
      }
      const json = (await res.json()) as StatisticheData;
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento delle statistiche");
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
        <p className="breadcrumb text-secondary/60">Statistiche</p>
        <h1 className="text-4xl font-bold text-secondary">Statistiche</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-lg" />
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
          {/* KPI periodo */}
          <KpiCardsRow
            cards={[
              {
                title: "Prenotazioni",
                value: String(data.totals.bookings),
                icon: <CalendarClock className="h-5 w-5" />,
                hint: "Nel periodo selezionato",
              },
              {
                title: "Ore campo prenotate",
                value: `${data.totals.bookedHours} h`,
                icon: <Clock className="h-5 w-5" />,
                hint: "Campi + lezioni + arena",
              },
              {
                title: "Nuovi utenti",
                value: String(data.totals.newUsers),
                icon: <UserPlus className="h-5 w-5" />,
                hint: "Registrazioni nel periodo",
              },
              {
                title: "Sfide arena",
                value: String(data.arena.total),
                icon: <Swords className="h-5 w-5" />,
                hint: `${data.arena.completed} completate`,
              },
            ]}
          />

          {/* Andamento prenotazioni */}
          <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Andamento prenotazioni</h2>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <BookingsTrendChart data={data.timeseries} />
            </div>
          </div>

          {/* Utenti: nuove registrazioni + per ruolo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Nuovi utenti</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <NewUsersTrendChart data={data.timeseries} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Utenti per ruolo</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <UsersByRoleChart usersByRole={data.usersByRole} />
              </div>
            </div>
          </div>

          {/* Prenotazioni: per tipo + per campo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Prenotazioni per tipo</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <BookingsByTypeChart byType={data.byType} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Occupazione campi</h2>
              </div>
              <div className="px-4 py-5 sm:px-6">
                <BookingsByCourtChart data={data.byCourt} />
              </div>
            </div>
          </div>

          {/* KPI generali (tutti i tempi) */}
          <KpiCardsRow
            cards={[
              {
                title: "Utenti totali",
                value: String(data.totals.users),
                icon: <Users className="h-5 w-5" />,
                hint: "Registrati sulla piattaforma",
              },
              {
                title: "Corsi attivi",
                value: String(data.totals.activeCourses),
                icon: <GraduationCap className="h-5 w-5" />,
                hint: `${data.totals.iscrittiCorsi} iscrizioni totali`,
              },
              {
                title: "Tornei",
                value: String(data.tornei.total),
                icon: <Trophy className="h-5 w-5" />,
                hint: `${data.tornei.active} in corso · ${data.tornei.upcoming} in arrivo`,
              },
              {
                title: "Giocatori arena attivi",
                value: String(data.arena.activePlayers),
                icon: <Swords className="h-5 w-5" />,
                hint: `${data.tornei.participants} partecipazioni tornei`,
              },
            ]}
          />

          {/* Iscritti per corso */}
          <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Iscritti per corso</h2>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <CourseEnrollmentsChart data={data.byCourse} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
