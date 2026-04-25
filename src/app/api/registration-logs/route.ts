import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import logger from "@/lib/logger/secure-logger";

export async function GET(req: Request) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();
    if (!isAdmin(auth.role)) return forbidden();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const { data: profiles, error } = await supabaseServer
      .from("profiles")
      .select("id, full_name, email, role, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Error loading registration logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs = profiles?.map((profile) => ({
      id: profile.id,
      user_id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      phone: profile.phone,
      registered_at: profile.created_at,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    logger.error("Exception loading registration logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
