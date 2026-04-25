import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";
import logger from "@/lib/logger/secure-logger";

export async function GET() {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();
    if (!isAdmin(auth.role)) return forbidden();

    const { data, error } = await supabaseServer
      .from("recruitment_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching applications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: data });
  } catch (err: any) {
    logger.error("Exception fetching applications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();
    if (!isAdmin(auth.role)) return forbidden();

    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields: id, status" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("recruitment_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      logger.error("Error updating application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("Exception updating application:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();
    if (!isAdmin(auth.role)) return forbidden();

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("recruitment_applications")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("Exception deleting application:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
