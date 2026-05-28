import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";

// POST - Notify all admins and gestori
export async function POST(request: NextRequest) {
  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  try {
    const { title, message, link } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    // Get all admin and gestore users
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "gestore"]);

    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 });
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ message: "No admins found" });
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title,
      message,
      type: "info",
      link: link || null,
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      return NextResponse.json({ error: notifError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Notified ${admins.length} admins`,
      count: admins.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
