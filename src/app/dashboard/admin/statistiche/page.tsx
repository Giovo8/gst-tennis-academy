"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Calendar,
  Trophy,
  Swords,
  CalendarCheck,
  TrendingUp,
  Activity,
  Newspaper,
  Video,
  Briefcase,
  FileText,
  BarChart2,
  LayoutGrid,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  GraduationCap,
  Timer,
  Flame,
  BookOpen,
  Medal,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AdminStats {
  totalUsers: number;
  bookingsToday: number;
  totalBookings: number;
  activeTournaments: number;
  totalTournaments: number;
  upcomingBookings: number;
  activeCourses: number;
  usersByRole: { atleta: number; maestro: number; gestore: number; admin: number };
  monthlyRevenue: number;
  newUsersThisMonth: number;
  pendingEnrollments: number;
}

interface MonthlyPoint { monthKey: string; label: string; count: number }
interface HBarPoint { label: string; count: number; color?: string }

interface MaestroEntry { id: string; name: string; lessons: number; hours: number }

interface AllData {
  adminStats: AdminStats | null;
  // arena
  totalChallenges: number;
  completedChallenges: number;
  pendingChallenges: number;
  activePlayers: number;
  // extra
  totalNews: number;
  publishedNews: number;
  totalVideoLessons: number;
  totalJobApplications: number;
  pendingJobApplications: number;
  // engagement
  activeAthletes: number;
  totalEnrollments: number;
  confirmedEnrollments: number;
  totalTournamentParticipants: number;
  // maestro
  totalLessons: number;
  privateLessons: number;
  groupLessons: number;
  totalLessonHours: number;
  avgLessonDurationMin: number;
  activeCoaches: number;
  uniqueStudents: number;
  lessonsByMonth: MonthlyPoint[];
  topMaestri: MaestroEntry[];
  // trends
  bookingsByMonth: MonthlyPoint[];
  usersByMonth: MonthlyPoint[];
  arenaByMonth: MonthlyPoint[];
  bookingTypeDistrib: HBarPoint[];
  tournamentsByStatus: HBarPoint[];
}

/* ───────── helpers ───────── */

function buildMonthGrid(): { key: string; label: string }[] {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const grid: { key: string; label: string }[] = [];
  const cursor = new Date(yearAgo);
  for (let i = 0; i < 12; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const raw = cursor.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
    const label = raw.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    grid.push({ key, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return grid;
}

function groupByMonth(rows: { date: string }[], grid: { key: string; label: string }[]): MonthlyPoint[] {
  const map = new Map<string, number>(grid.map((g) => [g.key, 0]));
  rows.forEach(({ date }) => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  });
  return grid.map((g) => ({ monthKey: g.key, label: g.label, count: map.get(g.key) || 0 }));
}

/* ───────── sub-components ───────── */

function StatKpi({ icon, label, value, suffix }: {
  icon: React.ReactNode; label: string; value: number | string; suffix?: string;
}) {
  return (
    <div className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all flex flex-row items-center gap-4">
      <div className="flex-shrink-0 w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white/70">{label}</p>
        <h3 className="text-2xl font-bold text-white tabular-nums">
          {value}
          {suffix && <span className="text-base font-semibold text-white/70 ml-1">{suffix}</span>}
        </h3>
      </div>
    </div>
  );
}

function VerticalBarChart({ data, emptyMsg }: { data: MonthlyPoint[]; emptyMsg?: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-secondary/30">
        <BarChart2 className="h-8 w-8 mb-2" />
        <p className="text-sm">{emptyMsg || "Nessun dato disponibile"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative h-48">
        <div className="h-full flex items-end gap-1 sm:gap-1.5">
          {data.map((pt) => {
            const h = `${Math.max(4, Math.round((pt.count / max) * 100))}%`;
            return (
              <div key={pt.monthKey} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-0.5 group">
                {pt.count > 0 && (
                  <span className="text-[9px] font-bold text-secondary/70 leading-none">{pt.count}</span>
                )}
                <div
                  className="w-full rounded-t-md bg-secondary transition-colors"
                  style={{ height: h }}
                  title={`${pt.label}: ${pt.count}`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-1 sm:gap-1.5">
        {data.map((pt) => (
          <span key={pt.monthKey} className="flex-1 min-w-0 text-[9px] text-secondary/50 text-center font-medium truncate">
            {pt.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: HBarPoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs font-semibold text-secondary/70 w-28 flex-shrink-0 truncate">{d.label}</span>
          <div className="flex-1 h-6 bg-secondary/5 rounded-md overflow-hidden">
            <div
              className="h-full rounded-md transition-all"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: d.color || "var(--secondary)" }}
            />
          </div>
          <span className="text-xs font-bold text-secondary tabular-nums w-8 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ───────── tabs ───────── */

type TabKey = "utenti" | "prenotazioni" | "competizioni" | "arena" | "contenuti";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "utenti",        label: "Utenti",        icon: <Users className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> },
  { key: "prenotazioni",  label: "Prenotazioni",  icon: <Calendar className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> },
  { key: "competizioni",  label: "Competizioni",  icon: <Trophy className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> },
  { key: "arena",         label: "Arena GST",     icon: <Swords className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> },
  { key: "contenuti",     label: "Contenuti",     icon: <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> },
];

/* ───────── page ───────── */

export default function StatistichePage() {
  const [data, setData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("utenti");

  useEffect(() => { void loadStats(); }, []);

  async function loadStats() {
    try {
      const grid = buildMonthGrid();
      const yearAgo = new Date();
      yearAgo.setMonth(yearAgo.getMonth() - 11);
      yearAgo.setDate(1);
      yearAgo.setHours(0, 0, 0, 0);

      const [
        adminRes,
        { count: totalChallenges },
        { count: completedChallenges },
        { count: pendingChallenges },
        { count: activePlayers },
        { count: totalNews },
        { count: publishedNews },
        { count: totalVideoLessons },
        { count: totalJobApplications },
        { count: pendingJobApplications },
        bookingsMonthRes,
        usersMonthRes,
        arenaMonthRes,
        bookingTypesRes,
        tournamentsStatusRes,
        lessonsAllRes,
        activeAthletesRes,
        { count: totalEnrollments },
        { count: confirmedEnrollments },
        { count: totalTournamentParticipants },
      ] = await Promise.all([
        fetch("/api/stats/admin").then((r) => (r.ok ? r.json() : null)),
        supabase.from("arena_challenges").select("*", { count: "exact", head: true }),
        supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("arena_stats").select("*", { count: "exact", head: true }).gt("total_matches", 0),
        supabase.from("news").select("*", { count: "exact", head: true }),
        supabase.from("news").select("*", { count: "exact", head: true }).eq("published", true),
        supabase.from("video_lessons").select("*", { count: "exact", head: true }),
        supabase.from("recruitment_applications").select("*", { count: "exact", head: true }),
        supabase.from("recruitment_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("start_time").gte("start_time", yearAgo.toISOString()).neq("status", "cancelled"),
        supabase.from("profiles").select("created_at").gte("created_at", yearAgo.toISOString()),
        supabase.from("arena_challenges").select("created_at").gte("created_at", yearAgo.toISOString()),
        supabase.from("bookings").select("type").neq("status", "cancelled"),
        supabase.from("tournaments").select("status"),
        supabase.from("bookings").select("id, coach_id, user_id, type, start_time, end_time").in("type", ["lezione_privata", "lezione_gruppo"]).neq("status", "cancelled").lt("end_time", new Date().toISOString()).not("coach_id", "is", null),
        supabase.from("bookings").select("user_id").neq("status", "cancelled").not("user_id", "is", null),
        supabase.from("enrollments").select("*", { count: "exact", head: true }).neq("status", "cancelled"),
        supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("tournament_participants").select("*", { count: "exact", head: true }),
      ]);

      // monthly trends
      const bookingsByMonth = groupByMonth(
        (bookingsMonthRes.data ?? []).map((r: { start_time: string }) => ({ date: r.start_time })),
        grid
      );
      const usersByMonth = groupByMonth(
        (usersMonthRes.data ?? []).map((r: { created_at: string }) => ({ date: r.created_at })),
        grid
      );
      const arenaByMonth = groupByMonth(
        (arenaMonthRes.data ?? []).map((r: { created_at: string }) => ({ date: r.created_at })),
        grid
      );

      // booking type distribution
      const typeCount: Record<string, number> = {};
      (bookingTypesRes.data ?? []).forEach((r: { type: string }) => {
        typeCount[r.type] = (typeCount[r.type] || 0) + 1;
      });
      const TYPE_LABELS: Record<string, string> = {
        lezione_privata: "Lezione privata",
        lezione_gruppo: "Lezione gruppo",
        campo: "Campo libero",
        arena: "Match Arena",
        lezione: "Lezione",
      };
      const bookingTypeDistrib: HBarPoint[] = Object.entries(typeCount)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => ({ label: TYPE_LABELS[type] || type, count }));

      // tournaments by status
      const statusCount: Record<string, number> = {};
      (tournamentsStatusRes.data ?? []).forEach((r: { status: string }) => {
        statusCount[r.status] = (statusCount[r.status] || 0) + 1;
      });
      const tournamentsByStatus: HBarPoint[] = Object.entries(statusCount)
        .sort(([, a], [, b]) => b - a)
        .map(([status, count]) => ({ label: status, count }));

      // maestro lesson stats
      type LessonRow = { id: string; coach_id: string; user_id: string | null; type: string; start_time: string; end_time: string };
      const lessonRows: LessonRow[] = lessonsAllRes.data ?? [];
      const privateLessons = lessonRows.filter((r) => r.type === "lezione_privata").length;
      const groupLessons = lessonRows.filter((r) => r.type === "lezione_gruppo").length;
      const totalDurationHours = lessonRows.reduce((acc, r) => {
        const s = new Date(r.start_time).getTime();
        const e = new Date(r.end_time).getTime();
        return acc + Math.max(0, (e - s) / (1000 * 60 * 60));
      }, 0);
      const totalLessonHours = Math.round(totalDurationHours * 10) / 10;
      const avgLessonDurationMin = lessonRows.length > 0
        ? Math.round((totalDurationHours / lessonRows.length) * 60)
        : 0;
      const uniqueStudents = new Set(lessonRows.map((r) => r.user_id).filter(Boolean)).size;

      // lessons by month (ultimi 12 mesi)
      const lessonsByMonth = groupByMonth(
        lessonRows.map((r) => ({ date: r.start_time })),
        grid
      );

      // top maestri by lesson count
      const coachMap = new Map<string, { lessons: number; hours: number }>();
      lessonRows.forEach((r) => {
        const existing = coachMap.get(r.coach_id) ?? { lessons: 0, hours: 0 };
        const h = Math.max(0, (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60));
        coachMap.set(r.coach_id, { lessons: existing.lessons + 1, hours: existing.hours + h });
      });
      const coachIds = Array.from(coachMap.keys());
      let coachNames = new Map<string, string>();
      if (coachIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", coachIds);
        coachNames = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
      }
      const topMaestri: MaestroEntry[] = Array.from(coachMap.entries())
        .map(([id, v]) => ({ id, name: coachNames.get(id) || "Maestro", lessons: v.lessons, hours: Math.round(v.hours * 10) / 10 }))
        .sort((a, b) => b.lessons - a.lessons)
        .slice(0, 8);
      const activeCoaches = coachMap.size;

      // active athletes (unique user_ids with at least 1 booking)
      const activeAthletes = new Set(
        (activeAthletesRes.data ?? []).map((r: { user_id: string }) => r.user_id)
      ).size;

      setData({
        adminStats: adminRes,
        totalChallenges: totalChallenges || 0,
        completedChallenges: completedChallenges || 0,
        pendingChallenges: pendingChallenges || 0,
        activePlayers: activePlayers || 0,
        totalNews: totalNews || 0,
        publishedNews: publishedNews || 0,
        totalVideoLessons: totalVideoLessons || 0,
        totalJobApplications: totalJobApplications || 0,
        pendingJobApplications: pendingJobApplications || 0,
        activeAthletes,
        totalEnrollments: totalEnrollments || 0,
        confirmedEnrollments: confirmedEnrollments || 0,
        totalTournamentParticipants: totalTournamentParticipants || 0,
        totalLessons: lessonRows.length,
        privateLessons,
        groupLessons,
        totalLessonHours,
        avgLessonDurationMin,
        activeCoaches,
        uniqueStudents,
        lessonsByMonth,
        topMaestri,
        bookingsByMonth,
        usersByMonth,
        arenaByMonth,
        bookingTypeDistrib,
        tournamentsByStatus,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-200 rounded-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const s = data?.adminStats;
  const { atleta = 0, maestro = 0, gestore = 0, admin = 0 } = s?.usersByRole ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-secondary">Statistiche</h1>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 sm:px-3 sm:py-2.5 rounded text-sm sm:text-xs font-semibold transition-all flex items-center justify-center gap-2 sm:gap-1.5 whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── UTENTI ── */}
      {activeTab === "utenti" && (
        <div className="space-y-6">
          {/* Iscritti */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Users className="h-8 w-8" />} label="Utenti totali" value={s?.totalUsers ?? "—"} />
            <StatKpi icon={<UserPlus className="h-8 w-8" />} label="Nuovi questo mese" value={s?.newUsersThisMonth ?? "—"} />
            <StatKpi icon={<Users className="h-8 w-8" />} label="Atleti" value={atleta} />
            <StatKpi icon={<Briefcase className="h-8 w-8" />} label="Maestri" value={maestro} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Nuovi utenti (ultimi 12 mesi)">
              <VerticalBarChart data={data?.usersByMonth ?? []} emptyMsg="Nessun utente registrato" />
            </SectionCard>

            <SectionCard title="Distribuzione per ruolo">
              <HorizontalBarChart data={[
                { label: "Atleti",          count: atleta },
                { label: "Maestri",         count: maestro },
                { label: "Admin / Gestori", count: admin + gestore },
              ]} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Atleti", count: atleta },
                  { label: "Maestri", count: maestro },
                  { label: "Admin/Gest.", count: admin + gestore },
                ].map((r) => (
                  <div key={r.label} className="bg-secondary/5 rounded-lg p-3">
                    <p className="text-xl font-bold text-secondary">{r.count}</p>
                    <p className="text-xs text-secondary/60 mt-0.5">{r.label}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Engagement */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Flame className="h-8 w-8" />} label="Atleti attivi" value={data?.activeAthletes ?? "—"} />
            <StatKpi
              icon={<Activity className="h-8 w-8" />}
              label="Tasso attività"
              value={atleta > 0 ? Math.round(((data?.activeAthletes ?? 0) / atleta) * 100) : "—"}
              suffix={atleta > 0 ? "%" : undefined}
            />
            <StatKpi icon={<BookOpen className="h-8 w-8" />} label="Iscrizioni corsi" value={data?.totalEnrollments ?? "—"} />
            <StatKpi icon={<Medal className="h-8 w-8" />} label="Iscritti tornei" value={data?.totalTournamentParticipants ?? "—"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Attività utenti">
              <HorizontalBarChart data={[
                { label: "Atleti attivi",   count: data?.activeAthletes ?? 0 },
                { label: "Atleti inattivi", count: Math.max(0, atleta - (data?.activeAthletes ?? 0)) },
              ].filter((d) => d.count > 0)} />
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                {[
                  { label: "Media prenotazioni / atleta attivo",
                    value: (data?.activeAthletes ?? 0) > 0
                      ? ((s?.totalBookings ?? 0) / (data?.activeAthletes ?? 1)).toFixed(1)
                      : "—" },
                  { label: "Iscrizioni corsi confermate",
                    value: data?.confirmedEnrollments ?? "—" },
                ].map((r) => (
                  <div key={r.label} className="bg-secondary/5 rounded-lg p-3">
                    <p className="text-xl font-bold text-secondary">{r.value}</p>
                    <p className="text-xs text-secondary/60 mt-0.5 leading-tight">{r.label}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Iscrizioni ai corsi">
              <HorizontalBarChart data={[
                { label: "Confermate", count: data?.confirmedEnrollments ?? 0 },
                { label: "In attesa",  count: Math.max(0, (data?.totalEnrollments ?? 0) - (data?.confirmedEnrollments ?? 0)) },
              ].filter((d) => d.count > 0)} />
              <div className="mt-4 flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                <div>
                  <p className="text-xs text-secondary/60">Iscrizioni ai tornei (totale partecipazioni)</p>
                  <p className="text-2xl font-bold text-secondary">{data?.totalTournamentParticipants ?? "—"}</p>
                </div>
                <Medal className="h-8 w-8 text-secondary/20" />
              </div>
            </SectionCard>
          </div>

          {/* Maestri */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<GraduationCap className="h-8 w-8" />} label="Lezioni totali" value={data?.totalLessons ?? "—"} />
            <StatKpi icon={<Timer className="h-8 w-8" />} label="Ore di lezione" value={data?.totalLessonHours ?? "—"} suffix="h" />
            <StatKpi icon={<GraduationCap className="h-8 w-8" />} label="Lezioni private" value={data?.privateLessons ?? "—"} />
            <StatKpi icon={<Users className="h-8 w-8" />} label="Lezioni di gruppo" value={data?.groupLessons ?? "—"} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Briefcase className="h-8 w-8" />} label="Maestri attivi" value={data?.activeCoaches ?? "—"} />
            <StatKpi icon={<Users className="h-8 w-8" />} label="Allievi unici" value={data?.uniqueStudents ?? "—"} />
            <StatKpi
              icon={<Clock className="h-8 w-8" />}
              label="Durata media lezione"
              value={data?.avgLessonDurationMin ?? "—"}
              suffix={data?.avgLessonDurationMin ? " min" : undefined}
            />
            <StatKpi
              icon={<TrendingUp className="h-8 w-8" />}
              label="Media lez. / maestro"
              value={(data?.activeCoaches ?? 0) > 0
                ? ((data?.totalLessons ?? 0) / (data?.activeCoaches ?? 1)).toFixed(1)
                : "—"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Lezioni (ultimi 12 mesi)">
              <VerticalBarChart data={data?.lessonsByMonth ?? []} emptyMsg="Nessuna lezione registrata" />
            </SectionCard>

            <SectionCard title="Lezioni per tipo">
              <HorizontalBarChart data={[
                { label: "Private", count: data?.privateLessons ?? 0 },
                { label: "Gruppo",  count: data?.groupLessons ?? 0 },
              ].filter((d) => d.count > 0)} />
              {(data?.topMaestri?.length ?? 0) > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mb-3">Top maestri</p>
                  <div className="space-y-2">
                    {(data?.topMaestri ?? []).map((m, i) => {
                      const maxL = data?.topMaestri[0]?.lessons || 1;
                      return (
                        <div key={m.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-secondary/40 w-4 text-right flex-shrink-0">{i + 1}</span>
                          <span className="text-xs font-semibold text-secondary/80 w-28 truncate flex-shrink-0">{m.name}</span>
                          <div className="flex-1 h-5 bg-secondary/5 rounded-md overflow-hidden">
                            <div className="h-full bg-secondary rounded-md" style={{ width: `${(m.lessons / maxL) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-secondary tabular-nums w-16 text-right flex-shrink-0">
                            {m.lessons} lez · {m.hours}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── PRENOTAZIONI ── */}
      {activeTab === "prenotazioni" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Calendar className="h-8 w-8" />}      label="Prenotazioni totali" value={s?.totalBookings ?? "—"} />
            <StatKpi icon={<CalendarCheck className="h-8 w-8" />} label="Oggi"                value={s?.bookingsToday ?? "—"} />
            <StatKpi icon={<TrendingUp className="h-8 w-8" />}    label="In arrivo"           value={s?.upcomingBookings ?? "—"} />
            <StatKpi icon={<Activity className="h-8 w-8" />}      label="Corsi attivi"        value={s?.activeCourses ?? "—"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Prenotazioni (ultimi 12 mesi)">
              <VerticalBarChart data={data?.bookingsByMonth ?? []} emptyMsg="Nessuna prenotazione" />
            </SectionCard>

            <SectionCard title="Distribuzione per tipo">
              {(data?.bookingTypeDistrib.length ?? 0) === 0 ? (
                <p className="text-sm text-secondary/40 py-6 text-center">Nessun dato</p>
              ) : (
                <HorizontalBarChart data={data?.bookingTypeDistrib ?? []} />
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── COMPETIZIONI ── */}
      {activeTab === "competizioni" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Trophy className="h-8 w-8" />}       label="Tornei totali" value={s?.totalTournaments ?? "—"} />
            <StatKpi icon={<Activity className="h-8 w-8" />}     label="In corso"      value={s?.activeTournaments ?? "—"} />
            <StatKpi icon={<CheckCircle2 className="h-8 w-8" />} label="Conclusi"      value={Math.max(0, (s?.totalTournaments ?? 0) - (s?.activeTournaments ?? 0))} />
          </div>

          <SectionCard title="Distribuzione per stato">
            {(data?.tournamentsByStatus.length ?? 0) === 0 ? (
              <p className="text-sm text-secondary/40 py-6 text-center">Nessun torneo registrato</p>
            ) : (
              <HorizontalBarChart data={data?.tournamentsByStatus ?? []} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ── ARENA ── */}
      {activeTab === "arena" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Swords className="h-8 w-8" />}        label="Sfide totali"     value={data?.totalChallenges ?? "—"} />
            <StatKpi icon={<CheckCircle2 className="h-8 w-8" />}  label="Completate"       value={data?.completedChallenges ?? "—"} />
            <StatKpi icon={<Clock className="h-8 w-8" />}         label="In attesa"        value={data?.pendingChallenges ?? "—"} />
            <StatKpi icon={<Users className="h-8 w-8" />}         label="Giocatori attivi" value={data?.activePlayers ?? "—"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Sfide (ultimi 12 mesi)">
              <VerticalBarChart data={data?.arenaByMonth ?? []} emptyMsg="Nessuna sfida registrata" />
            </SectionCard>

            <SectionCard title="Distribuzione sfide">
              <HorizontalBarChart data={[
                { label: "Completate", count: data?.completedChallenges ?? 0 },
                { label: "In attesa",  count: data?.pendingChallenges ?? 0 },
                { label: "Altre",      count: Math.max(0, (data?.totalChallenges ?? 0) - (data?.completedChallenges ?? 0) - (data?.pendingChallenges ?? 0)) },
              ].filter((d) => d.count > 0)} />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── CONTENUTI ── */}
      {activeTab === "contenuti" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKpi icon={<Newspaper className="h-8 w-8" />}  label="News totali"     value={data?.totalNews ?? "—"} />
            <StatKpi icon={<CheckCircle2 className="h-8 w-8" />} label="Pubblicate"    value={data?.publishedNews ?? "—"} />
            <StatKpi icon={<Video className="h-8 w-8" />}       label="Video Lezioni"  value={data?.totalVideoLessons ?? "—"} />
            <StatKpi icon={<FileText className="h-8 w-8" />}    label="Candidature"    value={data?.totalJobApplications ?? "—"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Stato news">
              <HorizontalBarChart data={[
                { label: "Pubblicate",     count: data?.publishedNews ?? 0 },
                { label: "Bozze",          count: Math.max(0, (data?.totalNews ?? 0) - (data?.publishedNews ?? 0)) },
              ].filter((d) => d.count > 0)} />
            </SectionCard>

            <SectionCard title="Candidature">
              <HorizontalBarChart data={[
                { label: "In attesa",  count: data?.pendingJobApplications ?? 0 },
                { label: "Esaminate", count: Math.max(0, (data?.totalJobApplications ?? 0) - (data?.pendingJobApplications ?? 0)) },
              ].filter((d) => d.count > 0)} />
              <div className="mt-4 flex items-center gap-3 p-3 bg-secondary/5 rounded-lg">
                <XCircle className="h-5 w-5 text-secondary/40 flex-shrink-0" />
                <div>
                  <p className="text-xs text-secondary/60">Candidature in attesa di revisione</p>
                  <p className="text-lg font-bold text-secondary">{data?.pendingJobApplications ?? "—"}</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}


interface AdminStats {
  totalUsers: number;
  bookingsToday: number;
  totalBookings: number;
  activeTournaments: number;
  totalTournaments: number;
  upcomingBookings: number;
  activeCourses: number;
  usersByRole: {
    atleta: number;
    maestro: number;
    gestore: number;
    admin: number;
  };
  monthlyRevenue: number;
  newUsersThisMonth: number;
  pendingEnrollments: number;
}
