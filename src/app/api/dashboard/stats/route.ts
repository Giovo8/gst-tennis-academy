import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, unauthorized } from "@/lib/auth/routeAuth";
import logger from "@/lib/logger/secure-logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const role = auth.role;
    const userId = auth.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (role === "admin" || role === "gestore") {
      const [usersRes, bookingsRes, todayBookingsRes, activeTournamentsRes] =
        await Promise.all([
          supabaseServer.from("profiles").select("id", { count: "exact", head: true }),
          supabaseServer.from("bookings").select("id", { count: "exact", head: true }),
          supabaseServer
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .gte("start_time", today.toISOString())
            .lt("start_time", tomorrow.toISOString()),
          supabaseServer
            .from("tournaments")
            .select("id", { count: "exact", head: true })
            .in("status", ["active", "Aperto", "In Corso"]),
        ]);

      return NextResponse.json({
        role,
        totalUsers: usersRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        todayBookings: todayBookingsRes.count || 0,
        activeTournaments: activeTournamentsRes.count || 0,
      });
    }

    if (role === "maestro") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [upcomingRes, monthRes] = await Promise.all([
        supabaseServer
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("coach_id", userId)
          .gte("start_time", now.toISOString()),
        supabaseServer
          .from("bookings")
          .select("user_id")
          .eq("coach_id", userId)
          .gte("start_time", startOfMonth.toISOString())
          .lt("start_time", startOfNextMonth.toISOString()),
      ]);

      const monthRows = (monthRes.data ?? []) as Array<{ user_id: string }>;
      const uniqueAthletes = new Set(monthRows.map((r) => r.user_id)).size;

      return NextResponse.json({
        role,
        upcomingLessons: upcomingRes.count || 0,
        monthlyLessons: monthRows.length,
        uniqueAthletes,
      });
    }

    if (role === "atleta") {
      const now = new Date();
      const [upcomingRes, totalRes, tournamentsRes] = await Promise.all([
        supabaseServer
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("start_time", now.toISOString()),
        supabaseServer
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabaseServer
          .from("tournament_participants")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      return NextResponse.json({
        role,
        upcomingBookings: upcomingRes.count || 0,
        totalBookings: totalRes.count || 0,
        tournamentsJoined: tournamentsRes.count || 0,
      });
    }

    return NextResponse.json({ role, message: "Ruolo non riconosciuto" });
  } catch (error) {
    logger.error("Errore caricamento dashboard stats:", error);
    return NextResponse.json(
      { error: "Errore caricamento statistiche" },
      { status: 500 }
    );
  }
}
