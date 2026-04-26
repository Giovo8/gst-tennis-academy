"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  Clock3,
  GraduationCap,
  LineChart,
  UserCheck,
  Users,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  formatShortItalianDate,
  formatItalianTime,
} from "@/lib/utils/formatItalianDate";

type Stats = {
  totalCoachLessonsDone: number;
  totalAthletesChosen: number;
  pastCoachLessons: number;
  totalCourtBookings: number;
  pastMonthHours: number;
  upcomingInvolved: number;
  privateLessonsDone: number;
  groupLessonsDone: number;
};

type BookingRow = {
  id: string;
  user_id: string;
  coach_id: string | null;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
  counterpartName?: string | null;
  involvementRole?: "maestro" | "atleta";
};

type AthleteSummary = {
  id: string;
  fullName: string;
  lessonsCount: number;
  totalHours: number;
  lastLessonAt: string | null;
};

type MonthlyPoint = {
  monthKey: string;
  label: string;
  lessonsCount: number;
};

export default function MaestroOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Maestro");
  const [stats, setStats] = useState<Stats>({
    totalCoachLessonsDone: 0,
    totalAthletesChosen: 0,
    pastCoachLessons: 0,
    totalCourtBookings: 0,
    pastMonthHours: 0,
    upcomingInvolved: 0,
    privateLessonsDone: 0,
    groupLessonsDone: 0,
  });
  const [upcoming, setUpcoming] = useState<BookingRow[]>([]);
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyPoint[]>([]);
  const [chartMonths, setChartMonths] = useState(12);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile?.full_name) {
      setUserName(profile.full_name);
    }

    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const lastMonth = new Date(now);
    lastMonth.setDate(now.getDate() - 30);
    const yearAgo = new Date(now);
    yearAgo.setMonth(now.getMonth() - 11, 1);
    yearAgo.setHours(0, 0, 0, 0);

    try {
      const [
        coachLessonsDoneRes,
        coachLessonsDoneRowsRes,
        coachLessonsMonthlyRowsRes,
        totalCourtBookingsRes,
        upcomingInvolvedRes,
        pastMonthRowsRes,
        upcomingRowsRes,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("coach_id", user.id)
          .in("type", ["lezione_privata", "lezione_gruppo"])
          .neq("status", "cancelled")
          .lt("end_time", now.toISOString()),
        supabase
          .from("bookings")
          .select("id, user_id, type, start_time, end_time")
          .eq("coach_id", user.id)
          .in("type", ["lezione_privata", "lezione_gruppo"])
          .neq("status", "cancelled")
          .lt("end_time", now.toISOString())
          .order("start_time", { ascending: false }),
        supabase
          .from("bookings")
          .select("id, type, start_time")
          .eq("coach_id", user.id)
          .in("type", ["lezione_privata", "lezione_gruppo"])
          .neq("status", "cancelled")
          .gte("start_time", yearAgo.toISOString())
          .lt("end_time", now.toISOString()),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("type", "campo")
          .neq("status", "cancelled")
          .lt("start_time", now.toISOString()),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .or(`coach_id.eq.${user.id},user_id.eq.${user.id}`)
          .neq("status", "cancelled")
          .gte("start_time", now.toISOString()),
        supabase
          .from("bookings")
          .select("start_time, end_time")
          .or(`coach_id.eq.${user.id},user_id.eq.${user.id}`)
          .neq("status", "cancelled")
          .gte("start_time", lastMonth.toISOString())
          .lt("end_time", now.toISOString()),
        supabase
          .from("bookings")
          .select("id, user_id, coach_id, court, type, start_time, end_time, status")
          .or(`coach_id.eq.${user.id},user_id.eq.${user.id}`)
          .neq("status", "cancelled")
          .gte("start_time", now.toISOString())
          .order("start_time", { ascending: true })
          .limit(8),
      ]);

      const pastMonthRows = pastMonthRowsRes.data ?? [];
      const pastMonthHours = pastMonthRows.reduce((acc, row) => {
        const start = new Date(row.start_time).getTime();
        const end = new Date(row.end_time).getTime();
        return acc + Math.max(0, (end - start) / (1000 * 60 * 60));
      }, 0);

      const coachLessonRows = coachLessonsDoneRowsRes.data ?? [];
      const coachLessonAthleteIds = Array.from(
        new Set(
          coachLessonRows
            .map((row) => row.user_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let athleteNameMap = new Map<string, string>();
      if (coachLessonAthleteIds.length > 0) {
        const { data: athleteProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", coachLessonAthleteIds);

        athleteNameMap = new Map(
          (athleteProfiles ?? []).map((p) => [p.id as string, p.full_name as string])
        );
      }

      const athleteAccumulator = new Map<string, AthleteSummary>();
      coachLessonRows.forEach((row) => {
        if (!row.user_id) return;

        const start = new Date(row.start_time).getTime();
        const end = new Date(row.end_time).getTime();
        const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
        const existing = athleteAccumulator.get(row.user_id);

        if (!existing) {
          athleteAccumulator.set(row.user_id, {
            id: row.user_id,
            fullName: athleteNameMap.get(row.user_id) || "Atleta",
            lessonsCount: 1,
            totalHours: durationHours,
            lastLessonAt: row.start_time,
          });
          return;
        }

        existing.lessonsCount += 1;
        existing.totalHours += durationHours;
        if (!existing.lastLessonAt || new Date(row.start_time) > new Date(existing.lastLessonAt)) {
          existing.lastLessonAt = row.start_time;
        }
      });

      const athleteSummaries = Array.from(athleteAccumulator.values())
        .sort((a, b) => b.lessonsCount - a.lessonsCount)
        .slice(0, 12);

      const privateLessonsDone = coachLessonRows.filter((r) => r.type === "lezione_privata").length;
      const groupLessonsDone = coachLessonRows.filter((r) => r.type === "lezione_gruppo").length;

      const monthlyMap = new Map<string, number>();
      const monthLabel = (date: Date) =>
        date.toLocaleDateString("it-IT", { month: "short", year: "2-digit" })
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

      const monthCursor = new Date(yearAgo);
      for (let i = 0; i < 12; i += 1) {
        const key = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap.set(key, 0);
        monthCursor.setMonth(monthCursor.getMonth() + 1);
      }

      (coachLessonsMonthlyRowsRes.data ?? []).forEach((row) => {
        const d = new Date(row.start_time);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
        }
      });

      const monthlyTrendData = Array.from(monthlyMap.entries()).map(([monthKey, lessonsCount]) => {
        const [year, month] = monthKey.split("-").map(Number);
        const d = new Date(year, month - 1, 1);
        return {
          monthKey,
          label: monthLabel(d),
          lessonsCount,
        };
      });

      const upcomingRows = (upcomingRowsRes.data ?? []) as BookingRow[];

      const counterpartIds = Array.from(
        new Set(
          upcomingRows
            .map((row) => {
              if (row.coach_id === user.id) return row.user_id;
              if (row.user_id === user.id && row.coach_id) return row.coach_id;
              return null;
            })
            .filter((id): id is string => Boolean(id))
        )
      );

      let counterpartMap = new Map<string, string>();
      if (counterpartIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", counterpartIds);
        counterpartMap = new Map(
          (profilesData ?? []).map((p) => [p.id as string, p.full_name as string])
        );
      }

      setStats({
        totalCoachLessonsDone: coachLessonsDoneRes.count || 0,
        totalAthletesChosen: athleteAccumulator.size,
        pastCoachLessons: coachLessonsDoneRes.count || 0,
        totalCourtBookings: totalCourtBookingsRes.count || 0,
        pastMonthHours: Math.round(pastMonthHours * 10) / 10,
        upcomingInvolved: upcomingInvolvedRes.count || 0,
        privateLessonsDone,
        groupLessonsDone,
      });

      setAthletes(athleteSummaries);
      setMonthlyTrend(monthlyTrendData);

      setUpcoming(
        upcomingRows.map((row) => {
          const counterpartId =
            row.coach_id === user.id
              ? row.user_id
              : row.user_id === user.id
                ? row.coach_id
                : null;

          return {
            ...row,
            counterpartName: counterpartId ? counterpartMap.get(counterpartId) || null : null,
            involvementRole: row.coach_id === user.id ? "maestro" : "atleta",
          };
        })
      );
    } catch (error) {
      console.error("Errore caricamento pagina maestro:", error);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">Area Maestro</h1>
        <p className="text-secondary/70 font-medium">
          Report completo con KPI, grafici e focus atleti per {userName}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold text-secondary">Scheda Statistiche Maestro</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoMetric label="Lezioni svolte totali" value={stats.totalCoachLessonsDone} />
          <InfoMetric label="Atleti che ti hanno scelto" value={stats.totalAthletesChosen} />
          <InfoMetric label="Campi prenotati (passati)" value={stats.totalCourtBookings} />
          <InfoMetric label="Ore erogate ultimi 30gg" value={stats.pastMonthHours} />
          <InfoMetric label="Impegni futuri coinvolto" value={stats.upcomingInvolved} />
          <InfoMetric label="Lezioni private svolte" value={stats.privateLessonsDone} />
          <InfoMetric label="Lezioni gruppo svolte" value={stats.groupLessonsDone} />
          <InfoMetric
            label="Media lezioni per atleta"
            value={
              stats.totalAthletesChosen > 0
                ? Math.round((stats.totalCoachLessonsDone / stats.totalAthletesChosen) * 10) / 10
                : 0
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-semibold text-secondary">Grafico Lezioni</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChartMonths((prev) => Math.max(3, prev - 1))}
                className="h-8 w-8 rounded-md border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 font-bold"
                title="Riduci intervallo"
                aria-label="Riduci intervallo"
              >
                -
              </button>
              <span className="text-xs text-secondary/70 min-w-[72px] text-center">
                Ultimi {chartMonths} mesi
              </span>
              <button
                type="button"
                onClick={() => setChartMonths((prev) => Math.min(12, prev + 1))}
                className="h-8 w-8 rounded-md border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 font-bold"
                title="Aumenta intervallo"
                aria-label="Aumenta intervallo"
              >
                +
              </button>
            </div>
          </div>

          <MonthlyLessonsChart data={monthlyTrend.slice(-chartMonths)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-2 bg-secondary/5">
          <Users className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold text-secondary">Atleti che ti hanno scelto</h2>
        </div>

        <div className="px-6 py-2">
          {athletes.length === 0 ? (
            <p className="text-sm text-secondary/60 py-6 text-center">
              Nessun atleta associato alle lezioni svolte.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {athletes.map((athlete) => (
                <li key={athlete.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-secondary text-sm">{athlete.fullName}</p>
                    <p className="text-xs text-secondary/60 mt-0.5">
                      Ultima lezione: {athlete.lastLessonAt ? formatShortItalianDate(athlete.lastLessonAt) : "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-secondary">{athlete.lessonsCount} lezioni</p>
                    <p className="text-xs text-secondary/70">{Math.round(athlete.totalHours * 10) / 10} ore</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-secondary/5">
          <h2 className="text-lg font-semibold text-secondary">Prossimi impegni</h2>
          <Link
            href="/dashboard/maestro/bookings"
            className="text-sm text-secondary/70 hover:text-secondary font-medium inline-flex items-center gap-1"
          >
            Vai a Prenotazioni <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="px-6 py-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-secondary/60 py-6 text-center">
              Nessun impegno programmato.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((item) => {
                const roleLabel =
                  item.involvementRole === "maestro" ? "Come maestro" : "Come atleta";

                return (
                  <li key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-secondary text-sm">
                        {item.counterpartName || "Impegno"}
                        <span className="text-secondary/50 font-normal"> · {item.court}</span>
                      </p>
                      <p className="text-xs text-secondary/60 mt-0.5">
                        {formatShortItalianDate(item.start_time)} · {formatItalianTime(item.start_time)}-
                        {formatItalianTime(item.end_time)}
                        <span className="ml-2 text-secondary/50">{roleLabel}</span>
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-white uppercase tracking-wide">
                      {item.type.replace("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-secondary/5 rounded-lg border border-secondary/20 p-4">
      <p className="text-xs uppercase tracking-wide text-secondary/70">{label}</p>
      <h3 className="text-2xl font-bold text-secondary mt-1">{value}</h3>
    </div>
  );
}

function InfoMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return <StatTile label={label} value={value} />;
}

function MonthlyLessonsChart({ data }: { data: MonthlyPoint[] }) {
  const maxValue = Math.max(...data.map((d) => d.lessonsCount), 1);

  return (
    <div className="space-y-4">
      <div className="h-56 flex items-end gap-2">
        {data.map((point) => {
          const barHeight = `${Math.max(8, Math.round((point.lessonsCount / maxValue) * 100))}%`;
          return (
            <div key={point.monthKey} className="flex-1 min-w-0 h-full flex flex-col justify-end">
              <div className="h-full flex flex-col justify-end items-center gap-1">
                <span className="text-[10px] font-semibold text-secondary/80 leading-none">
                  {point.lessonsCount}
                </span>
                <div
                  className="w-full rounded-t-md bg-secondary hover:bg-secondary/90 transition-colors"
                  style={{ height: barHeight }}
                  title={`${point.label}: ${point.lessonsCount} lezioni`}
                />
              </div>
              <span className="text-[10px] text-secondary/70 text-center leading-tight mt-2">{point.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-secondary/60">
        Grafico a barre del numero di lezioni concluse per mese.
      </p>
    </div>
  );
}

