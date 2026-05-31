import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";

// POST - Reset entire Arena season
export async function POST(req: Request) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    // Richiede token di conferma esplicito per prevenire reset accidentali
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== "RESET_ARENA_SEASON") {
      return NextResponse.json(
        { error: "Conferma richiesta: invia { confirm: 'RESET_ARENA_SEASON' } nel body" },
        { status: 400 }
      );
    }

    // Registra l'operazione in activity_logs prima della cancellazione (audit trail)
    await supabaseServer
      .from("activity_logs")
      .insert({
        user_id: auth.user.id,
        action: "arena.season_reset",
        entity_type: "arena",
        metadata: { reset_by: auth.user.email, reset_at: new Date().toISOString() },
      });

    // Delete all arena challenges
    const { error: deleteChallengesError } = await supabaseServer
      .from("arena_challenges")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

    if (deleteChallengesError) {
      console.error("Error deleting challenges:", deleteChallengesError);
      throw new Error("Failed to delete challenges");
    }

    // Reset all arena stats
    const { error: deleteStatsError } = await supabaseServer
      .from("arena_stats")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000"); // Delete all records

    if (deleteStatsError) {
      console.error("Error deleting stats:", deleteStatsError);
      throw new Error("Failed to delete stats");
    }

    return NextResponse.json(
      {
        message: "Arena season reset successfully",
        deleted: {
          challenges: true,
          stats: true,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/arena/reset-season:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
