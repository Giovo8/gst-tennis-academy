import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// POST - Reset entire Arena season
export async function POST(req: Request) {
  try {
    // Note: This endpoint should only be accessible to admin users
    // Frontend should verify admin role before calling this endpoint
    
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
