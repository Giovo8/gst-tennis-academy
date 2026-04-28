"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  GraduationCap,
  Timer,
  LineChart as LineChartIcon,

  Sun,
  Sunrise,
  Sunset,
  Users,
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

type WeekdayPoint = { label: string; count: number };
type HourBucketPoint = { label: string; count: number; icon: React.ReactNode };

type TrendDelta = {
  current: number;
  previous: number;
  diffPct: number | null; // null = previous è 0
};

type MoMTrend = {
  lessons: TrendDelta;
  hours: TrendDelta;
  athletes: TrendDelta;
};

type TrendPeriod = "week" | "month" | "year";

const PERIOD_LABELS: Record<TrendPeriod, { label: string; hint: string; previousLabel: string }> = {
  week:  { label: "7G",  hint: "vs settimana scorsa",             previousLabel: "Sett. scorsa" },
  month: { label: "30G", hint: "vs mese scorso",                  previousLabel: "Mese scorso" },
  year:  { label: "1A",  hint: "vs stesso periodo anno scorso",   previousLabel: "Anno scorso" },
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

type MaestroOverviewPageProps = {
  upcomingStyle?: "maestro" | "admin";
  upcomingBasePath?: string;
  upcomingRoleFilter?: "all" | "maestro";
};

export default function MaestroOverviewPage({
  upcomingStyle = "admin",
  upcomingBasePath = "/dashboard/maestro",
  upcomingRoleFilter = "maestro",
}: MaestroOverviewPageProps) {
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
  const [weekdayDist, setWeekdayDist] = useState<WeekdayPoint[]>([]);
  const [hourDist, setHourDist] = useState<HourBucketPoint[]>([]);
  const [allTrends, setAllTrends] = useState<Record<TrendPeriod, MoMTrend>>({
    week:  { lessons: { current: 0, previous: 0, diffPct: null }, hours: { current: 0, previous: 0, diffPct: null }, athletes: { current: 0, previous: 0, diffPct: null } },
    month: { lessons: { current: 0, previous: 0, diffPct: null }, hours: { current: 0, previous: 0, diffPct: null }, athletes: { current: 0, previous: 0, diffPct: null } },
    year:  { lessons: { current: 0, previous: 0, diffPct: null }, hours: { current: 0, previous: 0, diffPct: null }, athletes: { current: 0, previous: 0, diffPct: null } },
  });
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("month");
  const [weekStats, setWeekStats] = useState({ hours: 0, remaining: 0 });
  const [totalMaestroHours, setTotalMaestroHours] = useState(0);
  const [chartPeriod, setChartPeriod] = useState<"week" | "month" | "year">("year");
  const [weekChartData, setWeekChartData] = useState<MonthlyPoint[]>([]);
  const [monthChartData, setMonthChartData] = useState<MonthlyPoint[]>([]);

  const loadData = useCallback(async () => {
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
    const lastMonth = new Date(now);
    lastMonth.setDate(now.getDate() - 30);
    const yearAgo = new Date(now);
    yearAgo.setMonth(now.getMonth() - 11, 1);
    yearAgo.setHours(0, 0, 0, 0);

    // MoM windows
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Week (Lun -> Dom)
    const startOfWeek = new Date(now);
    const dayIdx = (now.getDay() + 6) % 7; // Lun=0
    startOfWeek.setDate(now.getDate() - dayIdx);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

    // Yearly windows
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    const sameDayLastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    try {
      let upcomingRowsQuery = supabase
        .from("bookings")
        .select("id, user_id, coach_id, court, type, start_time, end_time, status");

      if (upcomingRoleFilter === "maestro") {
        upcomingRowsQuery = upcomingRowsQuery.eq("coach_id", user.id);
      } else {
        upcomingRowsQuery = upcomingRowsQuery.or(`coach_id.eq.${user.id},user_id.eq.${user.id}`);
      }

      upcomingRowsQuery = upcomingRowsQuery
        .neq("status", "cancelled")
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true })
        .limit(8);

      const [
        coachLessonsDoneRes,
        coachLessonsDoneRowsRes,
        coachLessonsYearRowsRes,
        totalCourtBookingsRes,
        upcomingInvolvedRes,
        pastMonthRowsRes,
        upcomingRowsRes,
        twoMonthsRowsRes,
        weekRowsRes,
        prevYearRowsRes,
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
          .select("id, type, start_time, end_time, user_id")
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
        upcomingRowsQuery,
        // Lezioni mese corrente + precedente per MoM (solo concluse)
        supabase
          .from("bookings")
          .select("id, user_id, type, start_time, end_time")
          .eq("coach_id", user.id)
          .in("type", ["lezione_privata", "lezione_gruppo"])
          .neq("status", "cancelled")
          .gte("start_time", startOfPrevMonth.toISOString())
          .lt("end_time", now.toISOString()),
        // Settimana corrente: ore già fatte + impegni futuri rimanenti
        supabase
          .from("bookings")
          .select("id, type, start_time, end_time, status, coach_id, user_id")
          .or(`coach_id.eq.${user.id},user_id.eq.${user.id}`)
          .neq("status", "cancelled")
          .gte("start_time", startOfWeek.toISOString())
          .lt("start_time", endOfWeek.toISOString()),
        // Anno precedente stesso periodo (per trend annuale)
        supabase
          .from("bookings")
          .select("id, user_id, type, start_time, end_time")
          .eq("coach_id", user.id)
          .in("type", ["lezione_privata", "lezione_gruppo"])
          .neq("status", "cancelled")
          .gte("start_time", startOfPrevYear.toISOString())
          .lt("end_time", sameDayLastYear.toISOString()),
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

      // Fetch profiles with roles to detect staff-owned bookings
      let athleteProfileMap = new Map<string, { full_name: string; role: string }>();
      if (coachLessonAthleteIds.length > 0) {
        const { data: athleteProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", coachLessonAthleteIds);

        athleteProfileMap = new Map(
          (athleteProfiles ?? []).map((p) => [p.id as string, { full_name: p.full_name as string, role: p.role as string }])
        );
      }

      // Staff roles that book on behalf of athletes
      const STAFF_ROLES = new Set(["admin", "gestore"]);

      // Find staff-owned bookings and fetch their real participants
      const staffBookingIds = coachLessonRows
        .filter((row) => row.user_id && STAFF_ROLES.has(athleteProfileMap.get(row.user_id)?.role ?? ""))
        .map((row) => row.id);

      const participantsMap = new Map<string, { user_id: string | null; full_name: string }[]>();
      if (staffBookingIds.length > 0) {
        const { data: participants } = await supabase
          .from("booking_participants")
          .select("booking_id, user_id, full_name, is_registered")
          .in("booking_id", staffBookingIds)
          .order("order_index", { ascending: true });

        (participants ?? []).forEach((p) => {
          const list = participantsMap.get(p.booking_id) ?? [];
          list.push({ user_id: p.user_id ?? null, full_name: p.full_name });
          participantsMap.set(p.booking_id, list);
        });

        // Pre-fetch names for registered participant user_ids not yet in map
        const participantUserIds = Array.from(
          new Set(
            (participants ?? [])
              .map((p) => p.user_id)
              .filter((id): id is string => Boolean(id) && !athleteProfileMap.has(id))
          )
        );
        if (participantUserIds.length > 0) {
          const { data: pProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .in("id", participantUserIds);
          (pProfiles ?? []).forEach((p) => {
            athleteProfileMap.set(p.id as string, { full_name: p.full_name as string, role: p.role as string });
          });
        }
      }

      const athleteNameMap = new Map(
        Array.from(athleteProfileMap.entries()).map(([id, p]) => [id, p.full_name])
      );

      const athleteAccumulator = new Map<string, AthleteSummary>();

      const accumulateAthlete = (id: string, name: string, start: number, end: number, startTime: string) => {
        const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
        const existing = athleteAccumulator.get(id);
        if (!existing) {
          athleteAccumulator.set(id, { id, fullName: name, lessonsCount: 1, totalHours: durationHours, lastLessonAt: startTime });
        } else {
          existing.lessonsCount += 1;
          existing.totalHours += durationHours;
          if (!existing.lastLessonAt || new Date(startTime) > new Date(existing.lastLessonAt)) {
            existing.lastLessonAt = startTime;
          }
        }
      };

      coachLessonRows.forEach((row) => {
        if (!row.user_id) return;
        const start = new Date(row.start_time).getTime();
        const end = new Date(row.end_time).getTime();
        const ownerRole = athleteProfileMap.get(row.user_id)?.role ?? "";
        const isStaff = STAFF_ROLES.has(ownerRole);

        if (isStaff) {
          // Use participants as the real athletes
          const participants = participantsMap.get(row.id) ?? [];
          if (participants.length > 0) {
            participants.forEach((p) => {
              const athleteId = p.user_id ?? `guest:${p.full_name}`;
              const athleteName = p.user_id ? (athleteNameMap.get(p.user_id) ?? p.full_name) : p.full_name;
              accumulateAthlete(athleteId, athleteName, start, end, row.start_time);
            });
          }
          // If no participants recorded, skip (staff booking with no registered athlete)
        } else {
          // Regular athlete booking
          const name = athleteNameMap.get(row.user_id) ?? "Atleta";
          accumulateAthlete(row.user_id, name, start, end, row.start_time);
        }
      });

      const athleteSummaries = Array.from(athleteAccumulator.values())
        .sort((a, b) => b.lessonsCount - a.lessonsCount)
        .slice(0, 50);

      const totalMaestroHrs = Array.from(athleteAccumulator.values()).reduce(
        (acc, a) => acc + a.totalHours, 0
      );

      const privateLessonsDone = coachLessonRows.filter((r) => r.type === "lezione_privata").length;
      const groupLessonsDone = coachLessonRows.filter((r) => r.type === "lezione_gruppo").length;

      // Monthly trend (12 mesi)
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

      const yearRows = coachLessonsYearRowsRes.data ?? [];
      yearRows.forEach((row) => {
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

      // Weekday distribution (ultimi 12 mesi)
      const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
      yearRows.forEach((row) => {
        const d = new Date(row.start_time);
        const idx = (d.getDay() + 6) % 7; // Lun=0
        weekdayCounts[idx] += 1;
      });
      const weekdayData: WeekdayPoint[] = WEEKDAY_LABELS.map((label, i) => ({
        label,
        count: weekdayCounts[i],
      }));

      // Hour bucket distribution
      const buckets = { mattina: 0, pranzo: 0, pomeriggio: 0, sera: 0 };
      yearRows.forEach((row) => {
        const h = new Date(row.start_time).getHours();
        if (h < 12) buckets.mattina += 1;
        else if (h < 14) buckets.pranzo += 1;
        else if (h < 18) buckets.pomeriggio += 1;
        else buckets.sera += 1;
      });
      const hourData: HourBucketPoint[] = [
        { label: "Mattina", count: buckets.mattina, icon: <Sunrise className="h-4 w-4" /> },
        { label: "Pranzo", count: buckets.pranzo, icon: <Sun className="h-4 w-4" /> },
        { label: "Pomeriggio", count: buckets.pomeriggio, icon: <Sun className="h-4 w-4" /> },
        { label: "Sera", count: buckets.sera, icon: <Sunset className="h-4 w-4" /> },
      ];

      // Trend helpers
      const buildDelta = (current: number, previous: number): TrendDelta => ({
        current,
        previous,
        diffPct:
          previous === 0
            ? current > 0
              ? null
              : 0
            : Math.round(((current - previous) / previous) * 1000) / 10,
      });

      type TrendRow = { start_time: string; end_time: string; user_id: string };
      const sumHours = (rows: TrendRow[]) =>
        rows.reduce((acc, r) => {
          const s = new Date(r.start_time).getTime();
          const e = new Date(r.end_time).getTime();
          return acc + Math.max(0, (e - s) / (1000 * 60 * 60));
        }, 0);
      const buildTrend = (curr: TrendRow[], prev: TrendRow[]): MoMTrend => ({
        lessons: buildDelta(curr.length, prev.length),
        hours: buildDelta(
          Math.round(sumHours(curr) * 10) / 10,
          Math.round(sumHours(prev) * 10) / 10,
        ),
        athletes: buildDelta(
          new Set(curr.map((r) => r.user_id).filter(Boolean)).size,
          new Set(prev.map((r) => r.user_id).filter(Boolean)).size,
        ),
      });

      const twoMonthsRows = (twoMonthsRowsRes.data ?? []) as TrendRow[];

      // Weekly trend
      const currWeekRows = twoMonthsRows.filter(
        (r) => new Date(r.start_time) >= startOfWeek && new Date(r.start_time) < now
      );
      const prevWeekRows = twoMonthsRows.filter(
        (r) => new Date(r.start_time) >= startOfPrevWeek && new Date(r.start_time) < startOfWeek
      );

      // Monthly trend
      const currentMonthRows = twoMonthsRows.filter(
        (r) => new Date(r.start_time) >= startOfThisMonth
      );
      const prevMonthRows = twoMonthsRows.filter(
        (r) => new Date(r.start_time) >= startOfPrevMonth && new Date(r.start_time) < endOfPrevMonth
      );

      // Yearly trend
      const currYearRows = (yearRows as TrendRow[]).filter(
        (r) => new Date(r.start_time) >= startOfThisYear
      );
      const prevYearRows = (prevYearRowsRes.data ?? []) as TrendRow[];

      const computedTrends: Record<TrendPeriod, MoMTrend> = {
        week:  buildTrend(currWeekRows, prevWeekRows),
        month: buildTrend(currentMonthRows, prevMonthRows),
        year:  buildTrend(currYearRows, prevYearRows),
      };

      // Settimana corrente
      const weekRows = weekRowsRes.data ?? [];
      const weekDoneHours = weekRows
        .filter((r) => new Date(r.end_time) < now)
        .reduce((acc, r) => {
          const s = new Date(r.start_time).getTime();
          const e = new Date(r.end_time).getTime();
          return acc + Math.max(0, (e - s) / (1000 * 60 * 60));
        }, 0);
      const weekRemaining = weekRows.filter(
        (r) => new Date(r.start_time) >= now
      ).length;

      // Week chart: last 7 days (daily bars)
      const weekChartPoints: MonthlyPoint[] = [];
      for (let d = 6; d >= 0; d--) {
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);
        const count = twoMonthsRows.filter(
          (r) => new Date(r.start_time) >= dayStart && new Date(r.start_time) < dayEnd
        ).length;
        const raw = dayStart.toLocaleDateString("it-IT", { weekday: "short" });
        const lbl = raw.charAt(0).toUpperCase() + raw.slice(1, 3);
        weekChartPoints.push({ monthKey: `day-${d}`, label: lbl, lessonsCount: count });
      }

      // Month chart: last 30 days (daily bars)
      const monthChartPoints: MonthlyPoint[] = [];
      for (let d = 29; d >= 0; d--) {
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);
        const count = twoMonthsRows.filter(
          (r) => new Date(r.start_time) >= dayStart && new Date(r.start_time) < dayEnd
        ).length;
        const lbl = dayStart.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
        monthChartPoints.push({ monthKey: `month-d${d}`, label: lbl, lessonsCount: count });
      }

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
      setTotalMaestroHours(Math.round(totalMaestroHrs * 10) / 10);
      setMonthlyTrend(monthlyTrendData);
      setWeekdayDist(weekdayData);
      setHourDist(hourData);
      setAllTrends(computedTrends);
      setWeekChartData(weekChartPoints);
      setMonthChartData(monthChartPoints);
      setWeekStats({
        hours: Math.round(weekDoneHours * 10) / 10,
        remaining: weekRemaining,
      });

      const mappedUpcoming: BookingRow[] = upcomingRows.map((row) => {
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
        });

      setUpcoming(
        upcomingRoleFilter === "maestro"
          ? mappedUpcoming.filter((row) => row.involvementRole === "maestro")
          : mappedUpcoming
      );
    } catch (error) {
      console.error("Errore caricamento pagina maestro:", error);
    }

    setLoading(false);
  }, [upcomingRoleFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div>
        <h1 className="text-4xl font-bold text-secondary mb-2">Area Maestro, {userName}</h1>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatKpi
          icon={<GraduationCap className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Lezioni svolte"
          value={stats.totalCoachLessonsDone}
        />
        <StatKpi
          icon={<Users className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Atleti"
          value={stats.totalAthletesChosen}
        />
        <StatKpi
          icon={<Timer className="h-10 w-10 sm:h-8 sm:w-8 text-white" />}
          label="Questa settimana"
          value={`${weekStats.hours} h`}
        />
      </div>

      {/* PROSSIMI IMPEGNI */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
              Prossimi impegni
            </h2>
        </div>

        <div className="px-6 py-4">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-secondary/40">
              <CalendarClock className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">Nessun impegno in arrivo</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((item) => (
                <UpcomingItem
                  key={item.id}
                  item={item}
                  variant={upcomingStyle}
                  basePath={upcomingBasePath}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* TREND */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
            Trend
          </h2>
          <div className="flex items-center gap-1">
            {(Object.keys(PERIOD_LABELS) as TrendPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTrendPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  trendPeriod === p
                    ? "bg-secondary text-white"
                    : "bg-secondary/5 text-secondary/70 hover:bg-secondary/10"
                }`}
              >
                {PERIOD_LABELS[p].label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrendCard
              label="Lezioni"
              delta={allTrends[trendPeriod].lessons}
              previousLabel={PERIOD_LABELS[trendPeriod].previousLabel}
              format={(n) => String(n)}
            />
            <TrendCard
              label="Ore erogate"
              delta={allTrends[trendPeriod].hours}
              previousLabel={PERIOD_LABELS[trendPeriod].previousLabel}
              format={(n) => `${n}h`}
            />
            <TrendCard
              label="Atleti unici"
              delta={allTrends[trendPeriod].athletes}
              previousLabel={PERIOD_LABELS[trendPeriod].previousLabel}
              format={(n) => String(n)}
            />
          </div>
        </div>
      </div>

      {/* DISTRIBUZIONE SETTIMANA + FASCE ORARIE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              Giorni più carichi
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <WeekdayChart data={weekdayDist} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              Fasce orarie preferite
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <HourBucketChart data={hourDist} />
          </div>
        </div>
      </div>

      {/* MONTHLY BAR CHART */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
            Andamento lezioni
          </h2>

          <div className="flex items-center gap-1 bg-secondary/5 rounded-lg p-1">
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  chartPeriod === p
                    ? "bg-secondary text-white"
                    : "text-secondary/60 hover:text-secondary"
                }`}
              >
                {p === "week" ? "Sett." : p === "month" ? "Mese" : "Anno"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <MonthlyLessonsChart
            data={
              chartPeriod === "week"
                ? weekChartData
                : chartPeriod === "month"
                ? monthChartData
                : monthlyTrend
            }
          />
        </div>
      </div>

      {/* ATLETI */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
              I tuoi atleti
            </h2>
        </div>

        <div className="px-2 sm:px-3 py-2 max-h-[480px] overflow-y-auto">
          {athletes.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Nessun atleta ancora"
              description="Quando svolgerai le tue prime lezioni, gli atleti compariranno qui."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {athletes.map((athlete, idx) => {
                const maxHours = totalMaestroHours || 1;
                const pct = Math.round((athlete.totalHours / maxHours) * 100);
                return (
                  <li
                    key={athlete.id}
                    className="px-3 py-3 hover:bg-secondary/5 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={athlete.fullName} top={idx === 0} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-secondary text-sm truncate">
                            {athlete.fullName}
                          </p>
                          <p className="text-sm font-bold text-secondary tabular-nums">
                            {athlete.lessonsCount}
                            <span className="text-xs font-medium text-secondary/60 ml-1">
                              lez.
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-[11px] text-secondary/60">
                            Ultima:{" "}
                            {athlete.lastLessonAt
                              ? formatShortItalianDate(athlete.lastLessonAt)
                              : "-"}
                          </span>
                          <span className="text-[11px] text-secondary/60 tabular-nums">
                            {Math.round(athlete.totalHours * 10) / 10}h
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
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

/* ---------------- Sub-components ---------------- */

function StatKpi({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all flex flex-row items-center gap-4">
      <div className="flex-shrink-0 w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center">{icon}</div>
      <div className="flex-1 hidden sm:block">
        <p className="text-sm text-white/70">{label}</p>
        <h3 className="text-2xl font-bold text-white tabular-nums">
          {value}
          {suffix && (
            <span className="text-base font-semibold text-white/70 ml-1">{suffix}</span>
          )}
        </h3>
      </div>
      <div className="flex sm:hidden items-center gap-3 flex-1">
        <h3 className="text-3xl font-bold text-white tabular-nums">
          {value}
          {suffix && (
            <span className="text-base font-semibold text-white/70 ml-1">{suffix}</span>
          )}
        </h3>
        <p className="text-base text-white/70">{label}</p>
      </div>
    </div>
  );
}

function TrendCard({
  label,
  delta,
  format,
  previousLabel,
}: {
  label: string;
  delta: TrendDelta;
  format: (n: number) => string;
  previousLabel: string;
}) {
  const isUp = delta.diffPct !== null && delta.diffPct > 0;
  const badgeLabel =
    delta.diffPct === null
      ? "Nuovo"
      : delta.diffPct === 0
        ? "0%"
        : `${isUp ? "+" : "-"}${Math.abs(delta.diffPct)}%`;

  return (
    <div className="bg-secondary rounded-lg p-4 sm:p-5 hover:shadow-md transition-all">
      <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-white tabular-nums leading-none">
          {format(delta.current)}
        </p>
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-white bg-white/10">
          {badgeLabel}
        </span>
      </div>
      <p className="text-[11px] text-white/40 mt-1">
        {previousLabel}: {format(delta.previous)}
      </p>
    </div>
  );
}

function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((acc, d) => acc + d.count, 0);
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Dati insufficienti"
        description="La distribuzione settimanale apparirà dopo le prime lezioni."
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-secondary/70 w-8 flex-shrink-0">
              {d.label}
            </span>
            <div className="flex-1 h-6 bg-secondary/5 rounded-md overflow-hidden">
              <div
                className="h-full bg-secondary rounded-md transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-secondary tabular-nums w-8 text-right">
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HourBucketChart({ data }: { data: HourBucketPoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((acc, d) => acc + d.count, 0);
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<Clock3 className="h-8 w-8" />}
        title="Dati insufficienti"
        description="Le fasce orarie appariranno dopo le prime lezioni."
      />
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 h-44">
      {data.map((d) => {
        const pct = Math.max(6, (d.count / max) * 100);
        return (
          <div key={d.label} className="flex flex-col items-center justify-end gap-2">
            <span className="text-xs font-bold text-secondary tabular-nums">
              {d.count}
            </span>
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-lg bg-secondary transition-colors"
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${d.count}`}
              />
            </div>
            <span className="text-[10px] text-secondary/70 font-semibold">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyLessonsChart({ data }: { data: MonthlyPoint[] }) {
  const maxValue = Math.max(...data.map((d) => d.lessonsCount), 1);
  const totalCount = data.reduce((acc, d) => acc + d.lessonsCount, 0);

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<LineChartIcon className="h-8 w-8" />}
        title="Nessun dato"
        description="L'andamento sarà disponibile dopo le prime lezioni."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-56">
        <div className="h-full flex items-end gap-1.5 sm:gap-2">
          {data.map((point) => {
            const barHeight = `${Math.max(4, Math.round((point.lessonsCount / maxValue) * 100))}%`;
            return (
              <div
                key={point.monthKey}
                className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1 group"
              >
                <span className="text-[10px] font-bold text-secondary/80 leading-none">
                  {point.lessonsCount > 0 ? point.lessonsCount : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-secondary transition-colors cursor-pointer"
                  style={{ height: barHeight }}
                  title={`${point.label}: ${point.lessonsCount} lezioni`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        {data.map((point) => (
          <span
            key={point.monthKey}
            className="flex-1 min-w-0 text-[10px] text-secondary/60 text-center leading-tight font-medium truncate"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  lezione_privata: "Lezione privata",
  lezione_gruppo: "Lezione gruppo",
  campo: "Prenotazione campo",
  torneo: "Torneo",
};

const TYPE_STYLES: Record<string, string> = {
  lezione_privata: "bg-emerald-100 text-emerald-700",
  lezione_gruppo: "bg-amber-100 text-amber-700",
  campo: "bg-violet-100 text-violet-700",
  torneo: "bg-rose-100 text-rose-700",
};

function UpcomingItem({
  item,
  variant = "maestro",
  basePath = "/dashboard/maestro",
}: {
  item: BookingRow;
  variant?: "maestro" | "admin";
  basePath?: string;
}) {
  const start = new Date(item.start_time);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  let pill: { text: string; cls: string } | null = null;
  if (start >= today && start < tomorrow) {
    pill = { text: "Oggi", cls: "bg-primary text-white" };
  } else if (start >= tomorrow && start < dayAfter) {
    pill = { text: "Domani", cls: "bg-secondary/10 text-secondary" };
  }

  const typeLabel = TYPE_LABELS[item.type] || item.type.replace(/_/g, " ");
  const typeCls = TYPE_STYLES[item.type] || "bg-secondary/10 text-secondary";
  const roleLabel =
    item.involvementRole === "maestro" ? "Come maestro" : "Come atleta";

  const adminTypeColors: Record<string, string> = {
    lezione_privata: "#023047",
    lezione_gruppo: "#023047",
    campo: "var(--secondary)",
    lezione: "#023047",
    arena: "var(--color-frozen-lake-600)",
    torneo: "var(--color-frozen-lake-600)",
  };

  if (variant === "admin") {
    const typeBg = adminTypeColors[item.type] || "var(--secondary)";
    return (
      <li>
        <Link
          href={`${basePath}/bookings/${item.id}`}
          className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: typeBg }}
        >
          <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
              {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
            </span>
            <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
              {start.getDate()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">
              {item.counterpartName || "Impegno"}
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              {formatItalianTime(item.start_time)}–{formatItalianTime(item.end_time)} · {item.court}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
            {typeLabel}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0 hover:bg-secondary/5 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center bg-secondary/5 rounded-lg w-12 py-1.5 flex-shrink-0">
          <span className="text-[10px] uppercase font-bold text-secondary/60 leading-none">
            {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
          </span>
          <span className="text-lg font-bold text-secondary leading-none mt-0.5 tabular-nums">
            {start.getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-secondary text-sm truncate">
              {item.counterpartName || "Impegno"}
            </p>
            {pill && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${pill.cls}`}
              >
                {pill.text}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary/60 mt-0.5">
            {formatItalianTime(item.start_time)}–{formatItalianTime(item.end_time)}
            {" · "}
            {item.court}
            <span className="ml-2 text-secondary/40">{roleLabel}</span>
          </p>
          <div className="mt-1.5">
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${typeCls}`}
            >
              {typeLabel}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function Avatar({ name, top }: { name: string; top?: boolean }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "?";
  return (
    <div className="relative flex-shrink-0">
      <div className="h-10 w-10 rounded-lg bg-secondary text-white flex items-center justify-center font-bold text-sm border border-secondary/20 overflow-hidden">
        {initials}
      </div>
      {top && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-400 text-white flex items-center justify-center text-[9px] font-black ring-2 ring-white">
          ★
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="h-14 w-14 rounded-full bg-secondary/5 text-secondary/40 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-secondary">{title}</p>
      <p className="text-xs text-secondary/60 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-44 bg-gray-200 rounded-2xl" />
        <div className="h-44 bg-gray-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
      <div className="h-72 bg-gray-200 rounded-2xl" />
    </div>
  );
}
