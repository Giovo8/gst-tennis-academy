import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import logger from "@/lib/logger/secure-logger";

type Period = "week" | "month" | "year";

const MESI_SHORT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

interface Bucket {
  key: string;
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

// Intervallo [from, to) in base al periodo (settimana/mese/anno correnti).
function getRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay(); // 0 = domenica, 1 = lunedì...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    return { from, to };
  }
  if (period === "year") {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: new Date(now.getFullYear() + 1, 0, 1),
    };
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const bucketKeyForDate = (period: Period, d: Date) =>
  period === "year" ? `m${d.getMonth()}` : dayKey(d);

// Costruisce i bucket temporali vuoti: 12 mesi per "year", giornalieri per week/month.
function buildBuckets(period: Period, from: Date, to: Date): Bucket[] {
  const buckets: Bucket[] = [];
  if (period === "year") {
    for (let m = 0; m < 12; m++) {
      buckets.push({ key: `m${m}`, label: MESI_SHORT[m], campo: 0, lezione: 0, arena: 0, nuoviUtenti: 0 });
    }
    return buckets;
  }
  const d = new Date(from);
  while (d < to) {
    buckets.push({
      key: dayKey(d),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      campo: 0,
      lezione: 0,
      arena: 0,
      nuoviUtenti: 0,
    });
    d.setDate(d.getDate() + 1);
  }
  return buckets;
}

const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;

// GET - Statistiche generali della scuola (utenti, prenotazioni, corsi, tornei, arena). Solo admin/gestore.
export async function GET(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const periodParam = request.nextUrl.searchParams.get("period");
    const period: Period =
      periodParam === "week" || periodParam === "year" ? periodParam : "month";

    const { from, to } = getRange(period);
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    const buckets = buildBuckets(period, from, to);
    const bucketMap = new Map<string, Bucket>(buckets.map((b) => [b.key, b]));

    // ---- Utenti: totale, per ruolo (tutti), nuovi nel periodo ----
    const { data: profiles } = await supabase
      .from("profiles")
      .select("role, created_at");

    const usersByRole = { atleta: 0, maestro: 0, gestore: 0, admin: 0 };
    let newUsersInPeriod = 0;
    for (const p of profiles || []) {
      if (p.role in usersByRole) {
        usersByRole[p.role as keyof typeof usersByRole]++;
      }
      if (p.created_at) {
        const created = new Date(p.created_at);
        if (created >= from && created < to) {
          newUsersInPeriod++;
          const bucket = bucketMap.get(bucketKeyForDate(period, created));
          if (bucket) bucket.nuoviUtenti++;
        }
      }
    }
    const totalUsers = profiles?.length || 0;

    // ---- Prenotazioni nel periodo: andamento per tipo + per campo ----
    const { data: bookings } = await supabase
      .from("bookings")
      .select("court, type, start_time, end_time")
      .gte("start_time", fromISO)
      .lt("start_time", toISO)
      .neq("status", "cancelled");

    const byCourtMap = new Map<string, CourtAgg>();
    const byType: Record<string, number> = {};
    let bookedHours = 0;

    for (const b of bookings || []) {
      if (!b.start_time || !b.end_time) continue;
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      const hours = (end.getTime() - start.getTime()) / 3_600_000;
      if (!Number.isFinite(hours) || hours <= 0) continue;

      byType[b.type || "campo"] = (byType[b.type || "campo"] || 0) + 1;
      bookedHours += hours;

      const court = byCourtMap.get(b.court) || { court: b.court, bookings: 0, hours: 0 };
      court.bookings += 1;
      court.hours += hours;
      byCourtMap.set(b.court, court);

      const bucket = bucketMap.get(bucketKeyForDate(period, start));
      if (bucket) {
        if (b.type === "arena") bucket.arena += 1;
        else if (b.type === "lezione_privata" || b.type === "lezione_gruppo") bucket.lezione += 1;
        else bucket.campo += 1;
      }
    }

    const byCourt = Array.from(byCourtMap.values())
      .map((c) => ({ ...c, hours: round1(c.hours) }))
      .sort((a, b) => b.bookings - a.bookings);

    // ---- Corsi: attivi + iscritti per corso (tutti) ----
    const { count: activeCourses } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { data: courses } = await supabase.from("courses").select("id, name");
    const courseNameMap = new Map((courses || []).map((c) => [c.id, c.name]));

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("course_id");

    const byCourseMap = new Map<string, CourseAgg>();
    for (const e of enrollments || []) {
      if (!e.course_id) continue;
      const agg = byCourseMap.get(e.course_id) || {
        courseId: e.course_id,
        name: courseNameMap.get(e.course_id) || "Corso",
        iscritti: 0,
      };
      agg.iscritti += 1;
      byCourseMap.set(e.course_id, agg);
    }
    const byCourse = Array.from(byCourseMap.values())
      .sort((a, b) => b.iscritti - a.iscritti)
      .slice(0, 8);
    const totalIscritti = (enrollments || []).length;

    // ---- Tornei ----
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("id, status, start_date");
    const now = new Date();
    const torneiStats = {
      total: tournaments?.length || 0,
      active: tournaments?.filter((t) => t.status === "In Corso" || t.status === "In corso").length || 0,
      completed: tournaments?.filter((t) => t.status === "Completato" || t.status === "Concluso").length || 0,
      upcoming:
        tournaments?.filter(
          (t) => t.start_date && new Date(t.start_date) > now && (t.status === "Aperto" || t.status === "Chiuso")
        ).length || 0,
    };
    const { count: tournamentParticipants } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true });

    // ---- Arena ----
    let arenaTotal = 0;
    let arenaCompleted = 0;
    let arenaActivePlayers = 0;
    try {
      const { data: challenges } = await supabase
        .from("arena_challenges")
        .select("status, created_at")
        .gte("created_at", fromISO)
        .lt("created_at", toISO);
      arenaTotal = challenges?.length || 0;
      arenaCompleted = challenges?.filter((c) => c.status === "completed").length || 0;

      const { count: activePlayers } = await supabase
        .from("arena_stats")
        .select("*", { count: "exact", head: true })
        .gt("total_matches", 0);
      arenaActivePlayers = activePlayers || 0;
    } catch {
      // Tabelle arena non disponibili: si ignora silenziosamente, la sezione arena mostrerà 0.
    }

    const timeseries = buckets.map((b) => ({
      label: b.label,
      campo: b.campo,
      lezione: b.lezione,
      arena: b.arena,
      nuoviUtenti: b.nuoviUtenti,
    }));

    return NextResponse.json({
      period,
      range: { from: fromISO, to: toISO },
      totals: {
        users: totalUsers,
        newUsers: newUsersInPeriod,
        bookings: (bookings || []).length,
        bookedHours: round1(bookedHours),
        activeCourses: activeCourses || 0,
        iscrittiCorsi: totalIscritti,
      },
      usersByRole,
      timeseries,
      byCourt,
      byType,
      byCourse,
      tornei: {
        ...torneiStats,
        participants: tournamentParticipants || 0,
      },
      arena: {
        total: arenaTotal,
        completed: arenaCompleted,
        activePlayers: arenaActivePlayers,
      },
    });
  } catch (err) {
    logger.error("Errore stats statistiche:", err);
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
