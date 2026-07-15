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
  campi: number;
  corsiQuota: number;
  corsiIncassato: number;
}

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

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

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
  // month (default)
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
      buckets.push({ key: `m${m}`, label: MESI_SHORT[m], campi: 0, corsiQuota: 0, corsiIncassato: 0 });
    }
    return buckets;
  }
  const d = new Date(from);
  while (d < to) {
    buckets.push({
      key: dayKey(d),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      campi: 0,
      corsiQuota: 0,
      corsiIncassato: 0,
    });
    d.setDate(d.getDate() + 1);
  }
  return buckets;
}

// Mesi di competenza per la quota corsi: 12 per "year", il mese corrente per week/month.
function monthsForQuota(period: Period): { y: number; m: number }[] {
  const now = new Date();
  if (period === "year") {
    return Array.from({ length: 12 }, (_, m) => ({ y: now.getFullYear(), m }));
  }
  return [{ y: now.getFullYear(), m: now.getMonth() }];
}

interface CourseRow {
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
}

// Un corso è "attivo" nel mese (y, m) se le date lo coprono; senza date si usa is_active.
function courseActiveInMonth(course: CourseRow, y: number, m: number): boolean {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const sd = course.start_date ? new Date(course.start_date) : null;
  const ed = course.end_date ? new Date(course.end_date) : null;
  if (!sd && !ed) return course.is_active !== false;
  if (sd && sd > last) return false;
  if (ed && ed < first) return false;
  return true;
}

// GET - Statistiche contabilità (ricavi campi + corsi) per periodo. Solo admin/gestore.
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
    const nowISO = new Date().toISOString();
    // Le prenotazioni sono un ricavo "realizzato" solo quando la data/ora e' gia' passata:
    // una prenotazione futura ha gia' un prezzo_applicato congelato alla creazione (il trigger
    // lo calcola sempre, indipendentemente da quando si svolgera'), ma non deve comparire nei
    // ricavi finche' non arriva la sua data. Il limite superiore della query si ferma quindi
    // a "ora", anche se il periodo richiesto si estende nel futuro (mese/anno in corso).
    const bookingsToISO = toISO < nowISO ? toISO : nowISO;

    const buckets = buildBuckets(period, from, to);
    const bucketMap = new Map<string, Bucket>(buckets.map((b) => [b.key, b]));

    const totals = { campi: 0, corsiQuota: 0, corsiIncassato: 0, totale: 0 };
    const byCourtMap = new Map<string, CourtAgg>();
    const byCourseMap = new Map<string, CourseAgg>();
    const byType: Record<string, number> = {};

    // ---- 1. Ricavi campi: prezzo_applicato salvato su ogni prenotazione (snapshot dal
    // listino_prezzi in vigore al momento della creazione, mai ricalcolato). Le prenotazioni
    // create prima dell'introduzione del listino hanno prezzo_applicato NULL e non contribuiscono.
    const { data: bookings } = await supabase
      .from("bookings")
      .select("court, start_time, end_time, type, prezzo_applicato")
      .gte("start_time", fromISO)
      .lt("start_time", bookingsToISO)
      .neq("status", "cancelled");

    for (const b of bookings || []) {
      if (!b.start_time || !b.end_time) continue;
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      const hours = (end.getTime() - start.getTime()) / 3_600_000;
      if (!Number.isFinite(hours) || hours <= 0) continue;
      const amount = Number(b.prezzo_applicato) || 0;

      totals.campi += amount;
      byType[b.type || "campo"] = (byType[b.type || "campo"] || 0) + amount;

      const bucket = bucketMap.get(bucketKeyForDate(period, start));
      if (bucket) bucket.campi += amount;

      const court = byCourtMap.get(b.court) || { court: b.court, amount: 0, hours: 0, bookings: 0 };
      court.amount += amount;
      court.hours += hours;
      court.bookings += 1;
      byCourtMap.set(b.court, court);
    }

    // ---- 2/3. Ricavi corsi: quota attesa (course_enrollments.fee) + incassato (payments) ----
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, start_date, end_date, is_active");
    const courseMap = new Map<
      string,
      { name: string; start_date: string | null; end_date: string | null; is_active: boolean | null }
    >((courses || []).map((c) => [c.id, c]));

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("fee, course_id");

    const quotaMonths = monthsForQuota(period);

    for (const e of enrollments || []) {
      if (!e.course_id) continue;
      const course = courseMap.get(e.course_id);
      if (!course) continue;
      const fee = Number(e.fee) || 0;
      if (fee <= 0) continue;

      const activeMonths = quotaMonths.filter((mm) => courseActiveInMonth(course, mm.y, mm.m));
      if (activeMonths.length === 0) continue;

      const agg =
        byCourseMap.get(e.course_id) ||
        ({ courseId: e.course_id, name: course.name, quota: 0, incassato: 0, iscritti: 0 } as CourseAgg);
      agg.quota += fee * activeMonths.length;
      agg.iscritti += 1;
      byCourseMap.set(e.course_id, agg);

      totals.corsiQuota += fee * activeMonths.length;

      // Timeseries quota: mensile per "year"; per "month" sul primo giorno; "week" non mostrata.
      if (period === "year") {
        for (const mm of activeMonths) {
          const bucket = bucketMap.get(`m${mm.m}`);
          if (bucket) bucket.corsiQuota += fee;
        }
      } else if (period === "month" && buckets.length > 0) {
        buckets[0].corsiQuota += fee;
      }
    }

    // Incassato corsi (payments completati nel periodo)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, reference_id, paid_at, created_at")
      .eq("payment_type", "course")
      .eq("status", "completed")
      .gte("created_at", fromISO)
      .lt("created_at", toISO);

    for (const p of payments || []) {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) continue;
      totals.corsiIncassato += amount;

      const when = new Date(p.paid_at || p.created_at);
      const bucket = bucketMap.get(bucketKeyForDate(period, when));
      if (bucket) bucket.corsiIncassato += amount;

      if (p.reference_id) {
        const name = courseMap.get(p.reference_id)?.name || "Corso";
        const agg =
          byCourseMap.get(p.reference_id) ||
          ({ courseId: p.reference_id, name, quota: 0, incassato: 0, iscritti: 0 } as CourseAgg);
        agg.incassato += amount;
        byCourseMap.set(p.reference_id, agg);
      }
    }

    totals.totale = totals.campi + totals.corsiQuota;

    // Arrotondamenti finali
    const timeseries = buckets.map((b) => ({
      label: b.label,
      campi: round2(b.campi),
      corsiQuota: round2(b.corsiQuota),
      corsiIncassato: round2(b.corsiIncassato),
    }));
    const byCourt = Array.from(byCourtMap.values())
      .map((c) => ({ ...c, amount: round2(c.amount), hours: round2(c.hours) }))
      .sort((a, b) => b.amount - a.amount);
    const byCourse = Array.from(byCourseMap.values())
      .map((c) => ({ ...c, quota: round2(c.quota), incassato: round2(c.incassato) }))
      .sort((a, b) => b.quota - a.quota);
    const byTypeOut = Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, round2(v)]),
    );

    return NextResponse.json({
      period,
      range: { from: fromISO, to: toISO },
      totals: {
        campi: round2(totals.campi),
        corsiQuota: round2(totals.corsiQuota),
        corsiIncassato: round2(totals.corsiIncassato),
        totale: round2(totals.totale),
      },
      counts: {
        bookings: (bookings || []).length,
        iscritti: byCourse.reduce((s, c) => s + c.iscritti, 0),
      },
      timeseries,
      byCourt,
      byCourse,
      byType: byTypeOut,
    });
  } catch (err) {
    logger.error("Errore stats contabilità:", err);
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
