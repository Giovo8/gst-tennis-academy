import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import logger from "@/lib/logger/secure-logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();
    if (!isAdmin(auth.role)) return forbidden();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const { data: logs, error } = (await supabaseServer
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)) as any;

    if (error) {
      logger.error("Error loading activity logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [...new Set(logs?.map((log: any) => log.user_id).filter(Boolean))];
    const profilesMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles } = (await supabaseServer
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)) as any;

      profiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });
    }

    const enrichedLogs = logs?.map((log: any) => ({
      ...log,
      profiles: log.user_id ? profilesMap.get(log.user_id) : null
    }));

    return NextResponse.json({ logs: enrichedLogs });
  } catch (err: any) {
    logger.error("Exception loading activity logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
