import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import logger from "@/lib/logger/secure-logger";

export async function GET() {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();
    if (!isAdmin(auth.role)) return forbidden();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [usersRes, bookingsRes, todayBookingsRes, tournamentsRes, activeTournamentsRes] = await Promise.all([
      supabaseServer.from("profiles").select("id", { count: "exact", head: true }),
      supabaseServer.from("bookings").select("id", { count: "exact", head: true }),
      supabaseServer
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString()),
      supabaseServer.from("tournaments").select("id", { count: "exact", head: true }),
      supabaseServer
        .from("tournaments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalBookings: bookingsRes.count || 0,
      todayBookings: todayBookingsRes.count || 0,
      totalTournaments: tournamentsRes.count || 0,
      activeTournaments: activeTournamentsRes.count || 0,
    });
  } catch (error) {
    logger.error("Errore caricamento statistiche:", error);
    return NextResponse.json(
      { error: "Errore caricamento statistiche" },
      { status: 500 }
    );
  }
}
