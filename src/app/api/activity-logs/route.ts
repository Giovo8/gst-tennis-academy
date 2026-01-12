import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Use server client with service role to bypass RLS
    const { data: logs, error } = await supabaseServer
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading activity logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Manually fetch profiles for the users
    const userIds = [...new Set(logs?.map(log => log.user_id).filter(Boolean))];
    let profilesMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      profiles?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Enrich logs with profile data
    const enrichedLogs = logs?.map(log => ({
      ...log,
      profiles: log.user_id ? profilesMap.get(log.user_id) : null
    }));

    return NextResponse.json({ logs: enrichedLogs });
  } catch (err: any) {
    console.error("Exception loading activity logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
