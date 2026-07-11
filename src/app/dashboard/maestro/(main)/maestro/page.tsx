"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  Dumbbell,
  GraduationCap,
  Timer,
  LineChart as LineChartIcon,
  Sun,
  Sunrise,
  Sunset,
  Users,
} from "lucide-react";
import { UpcomingCommitmentsCard, type UpcomingBooking } from "@/components/dashboard/UpcomingCommitmentsCard";
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
  courseLessonsDone: number;
  totalCourses: number;
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
  participants?: Array<{ user_id: string | null; full_name: string }>;
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
    courseLessonsDone: 0,
    totalCourses: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingBooking[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
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
      const monthLabel = (date: Date) => {
        const raw = date.toLocaleDateString("it-IT", { month: "short" });
        return raw.charAt(0).toUpperCase() + raw.slice(1, 3);
      };

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

      // Weekday distribution (settimana corrente) - ore
      const weekdayData: WeekdayPoint[] = WEEKDAY_LABELS.map((label) => ({
        label,
        count: 0,
      }));

      // Hour bucket distribution (popolato dopo weekRows)
      const hourData: HourBucketPoint[] = [
        { label: "8-12", count: 0, icon: <Sunrise className="h-4 w-4" /> },
        { label: "12-14", count: 0, icon: <Sun className="h-4 w-4" /> },
        { label: "14-18", count: 0, icon: <Sun className="h-4 w-4" /> },
        { label: "18+", count: 0, icon: <Sunset className="h-4 w-4" /> },
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
      const courseWeekSchedule: { start_time: string; end_time: string }[] = [];

      const maestroWeekRows = weekRows.filter(
        (r) => r.coach_id === user.id && (r.type === "lezione_privata" || r.type === "lezione_gruppo")
      );

      // Popola weekdayData con le ore della settimana corrente
      maestroWeekRows.forEach((row) => {
        const d = new Date(row.start_time);
        const idx = (d.getDay() + 6) % 7;
        const hrs = (new Date(row.end_time).getTime() - d.getTime()) / (1000 * 60 * 60);
        weekdayData[idx].count += Math.max(0, hrs);
      });

      // Popola hourData con le lezioni della settimana corrente
      maestroWeekRows.forEach((row) => {
        const h = new Date(row.start_time).getHours();
        if (h < 12) hourData[0].count += 1;
        else if (h < 14) hourData[1].count += 1;
        else if (h < 18) hourData[2].count += 1;
        else hourData[3].count += 1;
      });

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
        const lbl = `${dayStart.getDate()}/${dayStart.getMonth() + 1}`;
        monthChartPoints.push({ monthKey: `month-d${d}`, label: lbl, lessonsCount: count });
      }

      const upcomingRows = (upcomingRowsRes.data ?? []) as BookingRow[];

      // Fetch participants for upcoming bookings
      const upcomingBookingIds = upcomingRows.map((r) => r.id);
      const upcomingParticipantsMap = new Map<string, Array<{ user_id: string | null; full_name: string }>>();
      if (upcomingBookingIds.length > 0) {
        const { data: upcomingParticipants } = await supabase
          .from("booking_participants")
          .select("booking_id, user_id, full_name")
          .in("booking_id", upcomingBookingIds)
          .order("order_index", { ascending: true });
        (upcomingParticipants ?? []).forEach((p) => {
          const list = upcomingParticipantsMap.get(p.booking_id) ?? [];
          list.push({ user_id: p.user_id ?? null, full_name: p.full_name });
          upcomingParticipantsMap.set(p.booking_id, list);
        });
      }

      const allProfileIds = Array.from(
        new Set([
          ...upcomingRows.map((r) => r.user_id),
          ...upcomingRows.map((r) => r.coach_id).filter((id): id is string => Boolean(id)),
        ])
      );

      let allProfileMap = new Map<string, { full_name: string }>();
      if (allProfileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allProfileIds);
        allProfileMap = new Map(
          (profilesData ?? []).map((p) => [p.id as string, { full_name: p.full_name as string }])
        );
      }

      // Fetch course data for this maestro (upcoming items + stats)
      const maestroFullName = profile?.full_name || "";
      const courseItems: UpcomingBooking[] = [];
      let courseLessonsDone = 0;
      let weekCourseHours = 0;
      let totalCourses = 0;
      let maestroCourseIds: string[] = [];
      const courseTrendRows: { start_time: string; end_time: string; user_id: string }[] = [];
      const coursePrevYearRows: { start_time: string; end_time: string; user_id: string }[] = [];
      if (maestroFullName) {
        const [{ data: coursesData }, { count: allCoursesCount }] = await Promise.all([
          supabase
            .from("courses")
            .select("id, name, court_name, instructor_name, schedule_time, schedule_days, start_date, end_date, is_active, cancelled_dates, extra_dates, lesson_time_overrides, lesson_overrides, schedule_periods")
            .eq("is_active", true)
            .ilike("instructor_name", `%${maestroFullName}%`),
          supabase
            .from("courses")
            .select("id", { count: "exact", head: true })
            .ilike("instructor_name", `%${maestroFullName}%`),
        ]);

        totalCourses = allCoursesCount ?? 0;
        maestroCourseIds = (coursesData ?? []).map((c: { id: string }) => c.id);

        // Fetch attendance records to know which sessions were actually done
        const attendedLessonsSet = new Set<string>();
        if (maestroCourseIds.length > 0) {
          const { data: attendanceData } = await supabase
            .from("lesson_attendance")
            .select("course_id, lesson_date")
            .in("course_id", maestroCourseIds);
          (attendanceData ?? []).forEach((r: { course_id: string; lesson_date: string }) => {
            attendedLessonsSet.add(`${r.course_id}:${r.lesson_date}`);
          });
          courseLessonsDone = attendedLessonsSet.size;
        }

        const DAY_CODES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
        for (const c of coursesData ?? []) {
          // Count past sessions for stats
          const courseStart = c.start_date ? new Date(c.start_date) : new Date(startOfPrevYear);
          const pastCursor = new Date(Math.max(courseStart.getTime(), startOfPrevYear.getTime()));
          pastCursor.setHours(0, 0, 0, 0);
          while (pastCursor < now) {
            const pDate = pastCursor.toISOString().split("T")[0];
            const pDay = DAY_CODES[pastCursor.getDay()];
            const pSched = (c.schedule_days ?? []).includes(pDay);
            const pExtra = (c.extra_dates ?? []).includes(pDate);
            if ((pSched || pExtra) && !(c.cancelled_dates ?? []).includes(pDate)) {
              if (pSched && !pExtra) {
                if (c.start_date && c.start_date > pDate) { pastCursor.setDate(pastCursor.getDate() + 1); continue; }
                if (c.end_date && c.end_date < pDate) { pastCursor.setDate(pastCursor.getDate() + 1); continue; }
              }
              let pTime: string = c.schedule_time || "";
              if (c.lesson_time_overrides?.[pDate]) pTime = c.lesson_time_overrides[pDate];
              else if (c.schedule_periods?.length > 0) {
                const pp = c.schedule_periods.find((p: { days: string[] }) => p.days?.includes(pDay));
                if (pp?.time) pTime = pp.time;
              }
              const pRng = pTime.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
              const pSh = pRng ? parseInt(pRng[1], 10) : 9;
              const pSm = pRng ? parseInt(pRng[2], 10) : 0;
              const pEh = pRng ? parseInt(pRng[3], 10) : pSh + 1;
              const pEm = pRng ? parseInt(pRng[4], 10) : pSm;
              const pStart = new Date(pastCursor); pStart.setHours(pSh, pSm, 0, 0);
              const pEnd = new Date(pastCursor); pEnd.setHours(pEh, pEm, 0, 0);
              if (pStart < now) {
                const isAttended = attendedLessonsSet.has(`${c.id}:${pDate}`);
                if (pStart >= yearAgo && isAttended) {
                  courseTrendRows.push({ start_time: pStart.toISOString(), end_time: pEnd.toISOString(), user_id: "" });
                }
                if (pStart >= startOfPrevYear && pStart < sameDayLastYear && isAttended) {
                  coursePrevYearRows.push({ start_time: pStart.toISOString(), end_time: pEnd.toISOString(), user_id: "" });
                }
              }
            }
            pastCursor.setDate(pastCursor.getDate() + 1);
          }

          // Build upcoming items
          const from = new Date(now);
          from.setHours(0, 0, 0, 0);
          let found = 0;
          for (let d = 0; d < 90 && found < 3; d++) {
            const dateStr = from.toISOString().split("T")[0];
            const dayCode = DAY_CODES[from.getDay()];
            const isScheduled = (c.schedule_days ?? []).includes(dayCode);
            const isExtra = (c.extra_dates ?? []).includes(dateStr);
            if ((isScheduled || isExtra) && !(c.cancelled_dates ?? []).includes(dateStr)) {
              if (isScheduled && !isExtra) {
                if (c.start_date && c.start_date > dateStr) { from.setDate(from.getDate() + 1); continue; }
                if (c.end_date && c.end_date < dateStr) { from.setDate(from.getDate() + 1); continue; }
              }
              let timeStr: string = c.schedule_time || "";
              if (c.lesson_time_overrides?.[dateStr]) timeStr = c.lesson_time_overrides[dateStr];
              else if (c.schedule_periods?.length > 0) {
                const period = c.schedule_periods.find((p: { days: string[] }) => p.days?.includes(dayCode));
                if (period?.time) timeStr = period.time;
              }
              let courtName: string = c.court_name || "";
              if (c.lesson_overrides?.[dateStr]) courtName = c.lesson_overrides[dateStr];
              else if (c.schedule_periods?.length > 0) {
                const period = c.schedule_periods.find((p: { days: string[] }) => p.days?.includes(dayCode));
                if (period?.court) courtName = period.court;
              }
              const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
              const sh = rangeMatch ? parseInt(rangeMatch[1], 10) : 9;
              const sm = rangeMatch ? parseInt(rangeMatch[2], 10) : 0;
              const eh = rangeMatch ? parseInt(rangeMatch[3], 10) : sh + 1;
              const em = rangeMatch ? parseInt(rangeMatch[4], 10) : sm;
              const startTime = new Date(from); startTime.setHours(sh, sm, 0, 0);
              const endTime = new Date(from); endTime.setHours(eh, em, 0, 0);
              if (startTime >= now) {
                courseItems.push({
                  id: c.id,
                  court: courtName,
                  user_id: "",
                  coach_id: user.id,
                  start_time: startTime.toISOString(),
                  end_time: endTime.toISOString(),
                  status: "confirmed",
                  type: "corso",
                  notes: c.name,
                  isCourse: true,
                });
                found++;
              }
            }
            from.setDate(from.getDate() + 1);
          }
        }

        // Build course schedule for current week (no attendance check)
        for (const c of coursesData ?? []) {
          const cursor = new Date(startOfWeek);
          while (cursor < endOfWeek) {
            const dateStr = cursor.toISOString().split("T")[0];
            const dayCode = DAY_CODES[cursor.getDay()];
            const isScheduled = (c.schedule_days ?? []).includes(dayCode);
            const isExtra = (c.extra_dates ?? []).includes(dateStr);
            if ((isScheduled || isExtra) && !(c.cancelled_dates ?? []).includes(dateStr)) {
              if (isScheduled && !isExtra) {
                if (c.start_date && c.start_date > dateStr) { cursor.setDate(cursor.getDate() + 1); continue; }
                if (c.end_date && c.end_date < dateStr) { cursor.setDate(cursor.getDate() + 1); continue; }
              }
              let wTimeStr: string = c.schedule_time || "";
              if (c.lesson_time_overrides?.[dateStr]) wTimeStr = c.lesson_time_overrides[dateStr];
              else if (c.schedule_periods?.length > 0) {
                const period = c.schedule_periods.find((p: { days: string[] }) => p.days?.includes(dayCode));
                if (period?.time) wTimeStr = period.time;
              }
              const wRng = wTimeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
              const wSh = wRng ? parseInt(wRng[1], 10) : 9;
              const wSm = wRng ? parseInt(wRng[2], 10) : 0;
              const wEh = wRng ? parseInt(wRng[3], 10) : wSh + 1;
              const wEm = wRng ? parseInt(wRng[4], 10) : wSm;
              const wStart = new Date(cursor); wStart.setHours(wSh, wSm, 0, 0);
              const wEnd = new Date(cursor); wEnd.setHours(wEh, wEm, 0, 0);
              courseWeekSchedule.push({ start_time: wStart.toISOString(), end_time: wEnd.toISOString() });
            }
            cursor.setDate(cursor.getDate() + 1);
          }
        }
      }

      const courseCurrWeekRows = courseTrendRows.filter((r) => new Date(r.start_time) >= startOfWeek);
      const coursePrevWeekRows = courseTrendRows.filter((r) => new Date(r.start_time) >= startOfPrevWeek && new Date(r.start_time) < startOfWeek);
      const courseCurrMonthRows = courseTrendRows.filter((r) => new Date(r.start_time) >= startOfThisMonth);
      const coursePrevMonthRowsTrend = courseTrendRows.filter((r) => new Date(r.start_time) >= startOfPrevMonth && new Date(r.start_time) < endOfPrevMonth);
      const courseCurrYearRows = courseTrendRows.filter((r) => new Date(r.start_time) >= startOfThisYear);
      computedTrends.week  = buildTrend([...currWeekRows, ...courseCurrWeekRows], [...prevWeekRows, ...coursePrevWeekRows]);
      computedTrends.month = buildTrend([...currentMonthRows, ...courseCurrMonthRows], [...prevMonthRows, ...coursePrevMonthRowsTrend]);
      computedTrends.year  = buildTrend([...currYearRows, ...courseCurrYearRows], [...prevYearRows, ...coursePrevYearRows]);

      // Add course sessions (attendance-based) to monthly chart
      courseTrendRows.forEach((row) => {
        const d = new Date(row.start_time);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const mEntry = monthlyTrendData.find((p) => p.monthKey === mKey);
        if (mEntry) mEntry.lessonsCount += 1;
      });

      setStats({
        totalCoachLessonsDone: (coachLessonsDoneRes.count || 0) + courseLessonsDone,
        totalAthletesChosen: athleteAccumulator.size,
        pastCoachLessons: coachLessonsDoneRes.count || 0,
        totalCourtBookings: totalCourtBookingsRes.count || 0,
        pastMonthHours: Math.round(pastMonthHours * 10) / 10,
        upcomingInvolved: upcomingInvolvedRes.count || 0,
        privateLessonsDone,
        groupLessonsDone,
        courseLessonsDone,
        totalCourses,
      });

      setAthletes(athleteSummaries);
      setTotalMaestroHours(Math.round(totalMaestroHrs * 10) / 10);
      setMonthlyTrend(monthlyTrendData);
      // Aggiungi ore e bucket dei corsi dalla settimana corrente
      courseWeekSchedule.forEach((row) => {
        const d = new Date(row.start_time);
        const idx = (d.getDay() + 6) % 7;
        const hrs = (new Date(row.end_time).getTime() - d.getTime()) / (1000 * 60 * 60);
        weekdayData[idx].count += Math.max(0, hrs);
        const h = d.getHours();
        if (h < 12) hourData[0].count += 1;
        else if (h < 14) hourData[1].count += 1;
        else if (h < 18) hourData[2].count += 1;
        else hourData[3].count += 1;
      });
      weekdayData.forEach((pt) => { pt.count = Math.round(pt.count * 10) / 10; });
      setWeekdayDist(weekdayData);
      setHourDist(hourData);
      // Aggiungi sessioni corsi ai chart settimanale e mensile (courseTrendRows popolato dopo il blocco if maestroFullName)
      const nowDay = new Date(now);
      nowDay.setHours(0, 0, 0, 0);
      courseTrendRows.forEach((row) => {
        const rowDay = new Date(row.start_time);
        rowDay.setHours(0, 0, 0, 0);
        const daysAgo = Math.round((nowDay.getTime() - rowDay.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo <= 6) {
          const pt = weekChartPoints.find((p) => p.monthKey === `day-${daysAgo}`);
          if (pt) pt.lessonsCount += 1;
        }
        if (daysAgo >= 0 && daysAgo <= 29) {
          const pt = monthChartPoints.find((p) => p.monthKey === `month-d${daysAgo}`);
          if (pt) pt.lessonsCount += 1;
        }
      });

      setAllTrends(computedTrends);
      setWeekChartData(weekChartPoints);
      setMonthChartData(monthChartPoints);
      setWeekStats({
        hours: Math.round((weekDoneHours + weekCourseHours) * 10) / 10,
        remaining: weekRemaining,
      });

      setCurrentUserId(user.id);

      const mappedUpcoming: UpcomingBooking[] = upcomingRows.map((row) => ({
        id: row.id,
        court: row.court,
        user_id: row.user_id,
        coach_id: row.coach_id,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status,
        type: row.type,
        notes: null,
        user_profile: allProfileMap.get(row.user_id) ?? null,
        coach_profile: row.coach_id ? allProfileMap.get(row.coach_id) ?? null : null,
        participants: upcomingParticipantsMap.get(row.id) ?? [],
      }));

      const allUpcoming = [...mappedUpcoming, ...courseItems].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setUpcoming(
        upcomingRoleFilter === "maestro"
          ? allUpcoming.filter((item) => item.isCourse || item.coach_id === user.id)
          : allUpcoming
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
    <div className="space-y-6 pt-3">
      {/* HERO */}
      <div>
        <h1 className="text-4xl font-bold text-secondary mb-2">Area Maestro</h1>
      </div>

      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "#023047", borderColor: "#023047", borderLeftColor: "#011a24" }}
      >
        <div className="flex items-start gap-6">
          <Dumbbell className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <h2 className="text-2xl font-bold text-white truncate">{userName}</h2>
        </div>
      </div>

      {/* DISTRIBUZIONE SETTIMANA + FASCE ORARIE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              Distribuzione oraria
            </h2>
          </div>
          <div className="p-6">
            <HourBucketChart data={hourDist} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              Ore questa settimana
            </h2>
          </div>
          <div className="p-6">
            <WeekdayChart data={weekdayDist} todayIdx={(new Date().getDay() + 6) % 7} />
          </div>
        </div>
      </div>

      {/* MONTHLY BAR CHART */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">
            Storico lezioni
          </h2>
        </div>

        <div className="p-6">
          <MonthlyLessonsChart data={monthlyTrend} />
        </div>
      </div>

    </div>
  );
}

/* ---------------- Sub-components ---------------- */

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
    <div className="bg-secondary rounded-lg p-6 hover:shadow-md transition-all">
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

function WeekdayChart({ data, todayIdx }: { data: WeekdayPoint[]; todayIdx: number }) {
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
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const isToday = i === todayIdx;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className={`text-sm font-bold w-8 flex-shrink-0 ${isToday ? 'text-[#023047]' : 'text-secondary'}`}>
              {d.label}
            </span>
            <div className="flex-1 relative h-8">
              <div className="absolute inset-0 bg-secondary/5 rounded-md" />
              <div
                className={`absolute inset-y-0 left-0 rounded-md transition-all flex items-center justify-end pr-2`}
                style={{
                  width: `${pct}%`,
                  minWidth: d.count > 0 ? '2.5rem' : '0',
                  backgroundColor: isToday ? '#023047' : 'var(--secondary)',
                }}
              >
                {d.count > 0 && (
                  <span className="text-sm font-extrabold text-white tabular-nums">
                    {d.count}h
                  </span>
                )}
              </div>
            </div>
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
    <div className="flex gap-3 h-72">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.label} className="flex flex-col items-center gap-1.5 flex-1 h-full">
            <div className="w-full flex-1 relative">
              <div className="absolute inset-0 bg-secondary/5 rounded-md" />
              <div
                className="absolute bottom-0 left-0 right-0 rounded-md transition-all flex items-start justify-center pt-1.5"
                style={{
                  height: `${pct}%`,
                  minHeight: '2.5rem',
                  backgroundColor: 'var(--secondary)',
                }}
              >
                {d.count > 0 && (
                  <span className="text-sm font-extrabold text-white tabular-nums">
                    {d.count}
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-bold text-secondary text-center leading-tight whitespace-nowrap">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyLessonsChart({ data }: { data: MonthlyPoint[] }) {
  const maxValue = Math.max(...data.map((d) => d.lessonsCount), 1);
  const totalCount = data.reduce((acc, d) => acc + d.lessonsCount, 0);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

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
    <div ref={scrollRef} className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="flex gap-2 h-72 w-full min-w-[700px]">
        {data.map((point) => {
          const pct = (point.lessonsCount / maxValue) * 100;
          const isCurrent = point.monthKey === currentMonthKey;
          return (
            <div key={point.monthKey} className="flex flex-col items-center gap-1.5 flex-1 min-w-[2rem] h-full">
              <div className="w-full flex-1 relative">
                <div className="absolute inset-0 bg-secondary/5 rounded-md" />
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-md transition-all flex items-start justify-center pt-3"
                  style={{
                    height: `${pct}%`,
                    minHeight: point.lessonsCount === 0 ? '0.5rem' : '2.5rem',
                    backgroundColor: isCurrent ? '#023047' : 'var(--secondary)',
                  }}
                  title={`${point.label}: ${point.lessonsCount} lezioni`}
                >
                  {point.lessonsCount > 0 && (
                    <span className="text-sm font-extrabold text-white tabular-nums leading-none">
                      {point.lessonsCount}
                    </span>
                  )}
                </div>
              </div>
              <span className={`w-full text-sm font-bold text-center leading-tight whitespace-nowrap ${isCurrent ? 'text-[#023047]' : 'text-secondary'}`}>
                {point.label}
              </span>
            </div>
          );
        })}
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
