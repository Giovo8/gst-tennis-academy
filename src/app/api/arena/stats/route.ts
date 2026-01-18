import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch arena stats
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;

    if (userId) {
      // Get specific user stats
      const { data, error } = await supabaseServer
        .from("arena_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If stats don't exist, create them
        if (error.code === "PGRST116") {
          const { data: newStats, error: createError } = await supabaseServer
            .from("arena_stats")
            .insert([{ user_id: userId }])
            .select("*")
            .single();

          if (createError) {
            console.error("Error creating stats:", createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
          }

          // Fetch profile separately
          const { data: profile } = await supabaseServer
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", userId)
            .single();

          return NextResponse.json({ stats: { ...newStats, profile } });
        }

        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch profile separately
      const { data: profile } = await supabaseServer
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      return NextResponse.json({ stats: { ...data, profile } });
    } else {
      // Get leaderboard
      const { data, error } = await supabaseServer
        .from("arena_stats")
        .select("*")
        .order("points", { ascending: false })
        .order("wins", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch profiles manually
      if (data && data.length > 0) {
        const userIds = data.map(s => s.user_id).filter(Boolean);
        
        const { data: profiles } = await supabaseServer
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        // Attach profiles to stats
        const enrichedLeaderboard = data.map(stat => ({
          ...stat,
          profile: profiles?.find(p => p.id === stat.user_id),
        }));

        return NextResponse.json({ leaderboard: enrichedLeaderboard });
      }

      return NextResponse.json({ leaderboard: data || [] });
    }
  } catch (error: any) {
    console.error("Error in GET /api/arena/stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update stats (admin only)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, ...statsData } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("arena_stats")
      .upsert([{ user_id, ...statsData }], { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stats: data });
  } catch (error: any) {
    console.error("Error in POST /api/arena/stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
